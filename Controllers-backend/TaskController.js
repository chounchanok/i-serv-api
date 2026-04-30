const db = require("../models");
const Task = db.Task || db.tasks; 
const TaskAssignment = db.TaskAssignment || db.task_assignments;
const User = db.User; 
const { Op } = require("sequelize");

// At the top of TaskController.js - add Account to your imports

// 🌟 ฟังก์ชันช่วยคำนวณแยกวันที่ ให้ออกมาเป็น Array (เช่น ['2026-04-24', '2026-04-25', ...])
const getDatesInRange = (startDate, endDate) => {
    const dates = [];
    let curr = new Date(startDate);
    const end = new Date(endDate);
    while (curr <= end) {
        const yyyy = curr.getFullYear();
        const mm = String(curr.getMonth() + 1).padStart(2, '0');
        const dd = String(curr.getDate()).padStart(2, '0');
        dates.push(`${yyyy}-${mm}-${dd}`);
        curr.setDate(curr.getDate() + 1);
    }
    return dates;
};

exports.createTask = async (req, res) => {
    try {
        const targetGroups = req.body.targetGroups || [];
        const targetAccounts = req.body.targetAccounts || [];

        const task = await Task.create({
            name: req.body.name,
            report_type: req.body.reportType,
            priority: req.body.priority,
            start_date: req.body.startDate,
            end_date: req.body.endDate,
            description: req.body.description,
            target_brands: targetGroups, 
            target_stores: targetAccounts 
        });

        let userCondition = {};
        if (targetAccounts.length > 0) {
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
            if (userIds.length > 0) {
                userCondition.id = { [Op.in]: userIds };
            } else {
                userCondition.id = 0; 
            }
        } else if (targetGroups.length > 0) {
            userCondition.group_customer_id = { [Op.in]: targetGroups };
        } else {
            userCondition.id = 0; 
        }

        const employees = await User.findAll({ 
            where: { ...userCondition, isActive: 'Y' } 
        });

        // 🌟 แยกสร้าง Assignment แบบวันต่อวัน
        if (employees.length > 0) {
            const dates = getDatesInRange(req.body.startDate, req.body.endDate);
            const assignments = [];
            
            employees.forEach(emp => {
                dates.forEach(date => {
                    assignments.push({
                        task_id: task.id,
                        user_id: emp.id,
                        task_date: date, // บันทึกว่าเป็นงานของวันไหน
                        status: 'pending'
                    });
                });
            });
            await TaskAssignment.bulkCreate(assignments);
        }

        res.status(201).send({ message: "สร้างงานและมอบหมายสำเร็จ", data: task });
    } catch (err) {
        console.error("CREATE TASK ERROR:", err);
        res.status(500).send({ message: err.message });
    }
};

exports.updateTask = async (req, res) => {
    try {
        const taskId = req.params.id;
        const { name, reportType, priority, startDate, endDate, description, targetGroups, targetAccounts } = req.body;
        
        const task = await Task.findByPk(taskId);
        if (!task) return res.status(404).send({ message: "ไม่พบข้อมูลงานนี้ในระบบ" });

        await task.update({
            name, report_type: reportType, priority, start_date: startDate, end_date: endDate,
            description, target_brands: targetGroups, target_stores: targetAccounts
        });

        // ลบของเดิมที่ยังรอส่งทิ้งให้หมด
        await TaskAssignment.destroy({ 
            where: { task_id: taskId, status: 'pending' } 
        });

        let userCondition = {};
        if (targetAccounts && targetAccounts.length > 0) {
            const query = `SELECT DISTINCT mus.user_id FROM tb_map_user_store_list mus INNER JOIN tb_store s ON mus.store_id = s.id WHERE s.account_id IN (:targetAccounts) AND mus.isActive = 'Y'`;
            const mappedUsers = await db.sequelize.query(query, { replacements: { targetAccounts }, type: db.Sequelize.QueryTypes.SELECT });
            const userIds = mappedUsers.map(u => u.user_id);
            userCondition.id = userIds.length > 0 ? { [Op.in]: userIds } : 0;
        } else if (targetGroups && targetGroups.length > 0) {
            userCondition.group_customer_id = { [Op.in]: targetGroups };
        } else {
            userCondition.id = 0; 
        }

        const employees = await User.findAll({ where: { ...userCondition, isActive: 'Y' } });

        // 🌟 แจกจ่ายใหม่แบบวันต่อวัน
        if (employees.length > 0) {
            const dates = getDatesInRange(startDate, endDate);
            const assignments = [];
            employees.forEach(emp => {
                dates.forEach(date => {
                    assignments.push({
                        task_id: task.id, user_id: emp.id, task_date: date, status: 'pending'
                    });
                });
            });
            await TaskAssignment.bulkCreate(assignments);
        }

        res.status(200).send({ message: "อัปเดตงานสำเร็จ", data: task });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.deleteTask = async (req, res) => {
    try {
        const taskId = req.params.id;
        await TaskAssignment.destroy({ where: { task_id: taskId } });
        await Task.destroy({ where: { id: taskId } });
        res.status(200).send({ message: "ลบงานสำเร็จ" });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.getAdminTasks = async (req, res) => {
    try {
        const data = await Task.findAll({ order: [['start_date', 'DESC']] });
        res.send(data);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.getEmployeeTasks = async (req, res) => {
    try {
        const userId = (req.user && req.user.id) ? req.user.id : req.params.userId;
        if (!userId) return res.status(400).send({ message: "ไม่พบข้อมูล User ID" });

        // 🌟 แก้ไข Timezone ให้เป็นเวลาประเทศไทย (UTC+7) 🌟
        const d = new Date();
        const localDate = new Date(d.getTime() + (7 * 60 * 60 * 1000));
        const todayStr = localDate.toISOString().split('T')[0];

        // 1. ดึงข้อมูลงานตามปกติ
        const data = await TaskAssignment.findAll({
            where: { 
                user_id: userId,
                // ดึงงานตั้งแต่วันนี้เป็นต้นไป (ไม่ดึงอดีต) โดยอิงจาก task_date
                task_date: { [Op.gte]: todayStr }
            },
            include: [{ model: Task, as: 'task_detail' }],
            order: [['task_date', 'ASC'], [{ model: Task, as: 'task_detail' }, 'priority', 'ASC']]
        });

        // 2. ดึงชื่อ Account (Store) ของพนักงานคนนี้ ด้วย Raw Query
        const mappingQuery = `
            SELECT DISTINCT a.name as account_name
            FROM tb_map_user_store_list mus
            INNER JOIN tb_store s ON mus.store_id = s.id
            INNER JOIN tb_account a ON s.account_id = a.id
            WHERE mus.user_id = :userId
            AND mus.isActive = 'Y'
        `;
        const mappings = await db.sequelize.query(mappingQuery, {
            replacements: { userId: userId },
            type: db.Sequelize.QueryTypes.SELECT
        });

        // 3. จับรวมชื่อ Account (เผื่อในกรณีที่พนักงาน 1 คนรับผิดชอบหลายร้าน)
        const accountName = mappings.length > 0 
            ? mappings.map(m => m.account_name).join(', ') 
            : 'ไม่ระบุ';

        // 4. แปลงข้อมูลและแนบ Account.name เข้าไปในทุกๆ งาน
        const responseData = data.map(item => {
            const taskObj = item.toJSON(); // แปลง Sequelize Object เป็น JSON ธรรมดาเพื่อเพิ่มคีย์ได้
            taskObj.account_name = accountName; // 👈 แนบชื่อ Account กลับไปให้ Frontend
            return taskObj;
        });

        res.status(200).send(responseData);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.submitTask = async (req, res) => {
    try {
        const assignmentId = req.params.id;
        const userId = (req.user && req.user.id) ? req.user.id : req.body.userId;
        if (!userId) return res.status(400).send({ message: "ไม่พบข้อมูล User ID" });

        const result = await TaskAssignment.update(
            { status: 'submitted', submitted_at: new Date() },
            { where: { id: assignmentId, user_id: userId } }
        );

        if (result[0] === 1) res.status(200).send({ message: "ส่งงานเรียบร้อยแล้ว" });
        else res.status(404).send({ message: "ไม่พบข้อมูลงาน" });
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};

exports.getTeamSummary = async (req, res) => {
    try {
        const positionName = req.user?.position_name || req.query.position_name;
        const groupCustomerId = req.user?.group_customer_id || req.query.group_customer_id;
        const userId = req.user?.id || req.query.userId;
        const accountName = req.query.account_name;

        let userCondition = { isActive: 'Y' };
        if (positionName !== 'SuperAdmin') {
            if (groupCustomerId) userCondition.group_customer_id = groupCustomerId;
            if (positionName === 'Supervisor') {
                const currentUser = await User.findByPk(userId);
                if (currentUser) {
                    userCondition.area_supervisor = currentUser.area_supervisor;
                    userCondition.area_manager = currentUser.area_manager;
                }
            }
        }

        // ปรับ Timezone เป็นของไทย (UTC+7)
        const d = new Date();
        const localDate = new Date(d.getTime() + (7 * 60 * 60 * 1000));
        const todayStr = localDate.toISOString().split('T')[0];

        // 🌟 1. ดึงข้อมูล User (เอา account_id ออกจาก attributes เพราะมันไม่มีในตารางนี้)
        const employees = await User.findAll({
            where: userCondition,
            attributes: ['id', 'name', 'last_name'], // 👈 ลบ account_id ออก
            include: [
                {
                    model: TaskAssignment,
                    as: 'assignments',
                    where: { task_date: todayStr },
                    required: false,
                    attributes: ['status'],
                    include: [ // 👈 เพิ่ม Include ตรงนี้เพื่อดึงชื่องาน
                        {
                            model: Task,
                            as: 'task_detail',
                            attributes: ['name']
                        }
                    ]
                }
            ]
        });

        // 🌟 2. ดึงชื่อ Account (Store) ของ User แต่ละคนด้วย Raw Query ตามโครงสร้าง DB จริง
        const userIds = employees.map(emp => emp.id);
        const userAccountMap = {};

        if (userIds.length > 0) {
            const mappingQuery = `
                SELECT mus.user_id, a.name as account_name
                FROM tb_map_user_store_list mus
                INNER JOIN tb_store s ON mus.store_id = s.id
                INNER JOIN tb_account a ON s.account_id = a.id
                WHERE mus.user_id IN (:userIds)
                AND mus.isActive = 'Y'
            `;
            const mappings = await db.sequelize.query(mappingQuery, {
                replacements: { userIds: userIds },
                type: db.Sequelize.QueryTypes.SELECT
            });

            // จับคู่ user_id -> account_name
            mappings.forEach(m => {
                userAccountMap[m.user_id] = m.account_name;
            });
        }

        // 🌟 3. กรองพนักงาน (ถ้ามีการส่ง account_name จาก Dropdown มา)
        let filteredEmployees = employees;
        if (accountName) {
            filteredEmployees = employees.filter(emp => userAccountMap[emp.id] === accountName);
        }

        // 🌟 4. สร้างข้อมูลสรุปส่งกลับไปที่ Frontend (แก้ไขเพิ่มรายการงาน)
        const summaries = filteredEmployees.map(emp => {
            const tasks = emp.assignments || [];
            
            // 👈 แยกรายชื่องานที่ส่งแล้ว และยังไม่ส่ง (เอาเฉพาะชื่อมาต่อกันด้วยลูกน้ำ)
            const submittedTasks = tasks
                .filter(t => t.status === 'submitted')
                .map(t => t.task_detail?.name || 'ไม่ระบุชื่อ')
                .join(', '); // กลายเป็น String เช่น "เช็คสต๊อก, ถ่ายรูปหน้าร้าน"
                
            const pendingTasks = tasks
                .filter(t => t.status !== 'submitted')
                .map(t => t.task_detail?.name || 'ไม่ระบุชื่อ')
                .join(', ');

            const total = tasks.length;
            const submitted = tasks.filter(t => t.status === 'submitted').length;
            const pct = total > 0 ? Math.round((submitted / total) * 100) : 0;
            
            return {
                employee: {
                    id: emp.id,
                    name: `${emp.name} ${emp.last_name || ''}`.trim(),
                    store: userAccountMap[emp.id] || 'ไม่ระบุ' 
                },
                total, submitted, pending: total - submitted, pct,
                submittedList: submittedTasks || '-', // 👈 ส่งข้อมูลกลับไป
                pendingList: pendingTasks || '-'      // 👈 ส่งข้อมูลกลับไป
            };
        });

        res.status(200).send({ summaries });
    } catch (err) {
        console.error("TEAM SUMMARY ERROR:", err);
        res.status(500).send({ message: err.message });
    }
};

exports.getEmployeeTaskDetails = async (req, res) => {
    try {
        const userId = req.params.userId;
        
        // 🌟 แก้ไข Timezone ให้เป็นเวลาประเทศไทย (UTC+7) 🌟
        const d = new Date();
        const localDate = new Date(d.getTime() + (7 * 60 * 60 * 1000));
        const todayStr = localDate.toISOString().split('T')[0];

        const assignments = await TaskAssignment.findAll({
            // ดึงรายการมาโชว์ใน Modal เฉพาะของวันนี้
            where: { user_id: userId, task_date: todayStr },
            include: [{ model: Task, as: 'task_detail' }],
            order: [['createdAt', 'DESC']]
        });
        res.status(200).send(assignments);
    } catch (err) {
        res.status(500).send({ message: err.message });
    }
};