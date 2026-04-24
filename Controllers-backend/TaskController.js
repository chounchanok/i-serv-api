const db = require("../models");

// ลองแก้ให้ตรงกับชื่อ Model ที่คุณประกาศไว้ในไฟล์ models/index.js 
// โดยปกติโปรเจกต์คุณจะใช้เป็นตัวพิมพ์ใหญ่ครับ
const Task = db.Task || db.tasks; 
const TaskAssignment = db.TaskAssignment || db.task_assignments;
const User = db.User; // ✅ แก้เป็น db.User

const { Op } = require("sequelize");

exports.createTask = async (req, res) => {
    try {
        const targetGroups = req.body.targetGroups || [];
        const targetAccounts = req.body.targetAccounts || [];

        // 1. บันทึกงานหลักลงตาราง tasks
        const task = await Task.create({
            name: req.body.name,
            report_type: req.body.reportType,
            priority: req.body.priority,
            start_date: req.body.startDate,
            end_date: req.body.endDate,
            description: req.body.description,
            // ใช้ Column เดิมเก็บ ID ของ Group และ Account ไปก่อนได้ครับ
            target_brands: targetGroups, 
            target_stores: targetAccounts 
        });

        // 2. หาพนักงานที่ต้องได้รับงานนี้
        let userCondition = {};

        if (targetAccounts.length > 0) {
            // กรณีเลือก Account: หาพนักงานที่ดูแล Store ภายใต้ Account เหล่านี้
            const query = `
                SELECT DISTINCT mus.user_id 
                FROM tb_map_user_store_list mus
                INNER JOIN tb_store s ON mus.store_id = s.id
                WHERE s.account_id IN (:targetAccounts) 
                AND mus.isActive = 'Y'
            `;
            
            const mappedUsers = await db.sequelize.query(query, {
                replacements: { targetAccounts: targetAccounts },
                type: db.Sequelize.QueryTypes.SELECT
            });
            
            const userIds = mappedUsers.map(u => u.user_id);
            
            // ตรวจสอบว่ามีพนักงานใน Account นี้ไหม
            if (userIds.length > 0) {
                userCondition.id = { [Op.in]: userIds };
            } else {
                userCondition.id = 0; // บังคับเงื่อนไขให้เป็นเท็จ (ไม่แจกงานใครเพราะไม่มีคน)
            }

        } else if (targetGroups.length > 0) {
            // กรณีเลือกแค่ GroupCustomer อย่างเดียว: ดึงพนักงานทุกคนใน Group
            userCondition.group_customer_id = { [Op.in]: targetGroups };
        } else {
            // กรณีไม่ได้เลือกอะไรเลย (กันเหนียว)
            userCondition.id = 0; 
        }

        // ดึงพนักงานที่มีสิทธิ์รับงานนี้ทั้งหมด
        const employees = await User.findAll({ 
            where: {
                ...userCondition,
                isActive: 'Y' // แจกงานให้เฉพาะคนที่สถานะยัง Active
            } 
        });

        // 3. กระจายงาน (Bulk Insert ลง task_assignments)
        if (employees.length > 0) {
            const assignments = employees.map(emp => ({
                task_id: task.id,
                user_id: emp.id,
                status: 'pending'
            }));
            await TaskAssignment.bulkCreate(assignments);
        }

        res.status(201).send({ message: "สร้างงานและมอบหมายสำเร็จ", data: task });
    } catch (err) {
        console.error("CREATE TASK ERROR:", err);
        res.status(500).send({ message: err.message });
    }
};

exports.getAdminTasks = async (req, res) => {
    try {
        const data = await Task.findAll({
            order: [['start_date', 'DESC']]
        });
        res.send(data);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// 1. ดึงรายการงานทั้งหมดของพนักงานที่ Login อยู่
exports.getEmployeeTasks = async (req, res) => {
    try {
        // 🌟 เปลี่ยนจาก req.query.userId เป็น req.params.userId
        const userId = (req.user && req.user.id) ? req.user.id : req.params.userId;

        if (!userId) {
            return res.status(400).send({ message: "ไม่พบข้อมูล User ID ไม่สามารถดึงงานได้" });
        }

        const data = await TaskAssignment.findAll({
            where: { user_id: userId },
            include: [{
                model: Task,
                as: 'task_detail' 
            }],
            order: [[{ model: Task, as: 'task_detail' }, 'priority', 'ASC']]
        });
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

// 2. กดส่งงาน (Update Status)
exports.submitTask = async (req, res) => {
    try {
        const assignmentId = req.params.id;
        // กรณีส่งงานใช้ req.body.userId เผื่อไว้ถ้า Bypass Token
        const userId = (req.user && req.user.id) ? req.user.id : req.body.userId;

        if (!userId) {
            return res.status(400).send({ message: "ไม่พบข้อมูล User ID" });
        }

        const result = await TaskAssignment.update(
            { 
                status: 'submitted',
                submitted_at: new Date() // ใช้ new Date() ของ JavaScript ปลอดภัยกว่า db.sequelize.fn('NOW') ในบาง Database
            },
            { where: { id: assignmentId, user_id: userId } }
        );

        if (result[0] === 1) {
            res.status(200).send({ message: "ส่งงานเรียบร้อยแล้ว" });
        } else {
            res.status(404).send({ message: "ไม่พบข้อมูลงานหรือคุณไม่มีสิทธิ์ส่งงานนี้" });
        }
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.getTeamSummary = async (req, res) => {
    try {
        // ดึงสิทธิ์จาก Token (หาก Bypass JWT ให้รับผ่าน Query แทน)
        const positionName = req.user?.position_name || req.query.position_name;
        const groupCustomerId = req.user?.group_customer_id || req.query.group_customer_id;
        const userId = req.user?.id || req.query.userId;

        let userCondition = { isActive: 'Y' };

        // --- เริ่มการกรองตามสิทธิ์ (Position Logic) ---
        if (positionName !== 'SuperAdmin') {
            if (groupCustomerId) {
                userCondition.group_customer_id = groupCustomerId;
            }

            if (positionName === 'Supervisor') {
                const currentUser = await User.findByPk(userId);
                if (currentUser) {
                    userCondition.area_supervisor = currentUser.area_supervisor;
                    userCondition.area_manager = currentUser.area_manager;
                }
            }
        }

        // ❌ เอาการกรองด้วย store_name ออกไปก่อน เพราะใน User ไม่มี column นี้
        // const { store } = req.query;
        // if (store && store !== 'all') { ... }

        const employees = await User.findAll({
            where: userCondition,
            // 🌟 แก้ไข attributes: ดึงเฉพาะคอลัมน์ที่มีอยู่ในตาราง users จริงๆ
            attributes: ['id', 'name', 'last_name'], 
            include: [{
                model: TaskAssignment,
                as: 'assignments',
                attributes: ['status']
            }]
        });

        const summaries = employees.map(emp => {
            const tasks = emp.assignments || [];
            const total = tasks.length;
            const submitted = tasks.filter(t => t.status === 'submitted').length;
            const pending = total - submitted;
            const pct = total > 0 ? Math.round((submitted / total) * 100) : 0;

            return {
                employee: {
                    id: emp.id,
                    name: `${emp.name} ${emp.last_name || ''}`.trim(),
                    store: 'ไม่ระบุ' // ปล่อยเป็น ไม่ระบุ ไปก่อน เพื่อไม่ให้ API พัง
                },
                total,
                submitted,
                pending,
                pct
            };
        });

        const totalEmp = summaries.length;
        const fullySubmitted = summaries.filter(s => s.pct === 100).length;
        const avgPct = totalEmp > 0 ? Math.round(summaries.reduce((a, s) => a + s.pct, 0) / totalEmp) : 0;

        res.status(200).send({
            summaries,
            stats: { totalEmp, fullySubmitted, avgPct }
        });

    } catch (err) {
        console.error("TEAM SUMMARY ERROR:", err);
        res.status(500).send({ message: err.message });
    }
};

exports.getEmployeeTaskDetails = async (req, res) => {
    try {
        const userId = req.params.userId;
        const assignments = await TaskAssignment.findAll({
            where: { user_id: userId },
            include: [{
                model: Task,
                as: 'task_detail'
            }],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).send(assignments);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};