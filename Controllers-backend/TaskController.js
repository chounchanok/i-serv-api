const db = require("../models");
const Task = db.tasks;
const TaskAssignment = db.task_assignments;
const User = db.users;
const { Op } = require("sequelize");

exports.createTask = async (req, res) => {
    try {
        // 1. บันทึกงานหลักลงตาราง tasks
        const task = await Task.create({
            name: req.body.name,
            report_type: req.body.reportType,
            priority: req.body.priority,
            start_date: req.body.startDate,
            end_date: req.body.endDate,
            description: req.body.description,
            target_brands: req.body.targetBrands,
            target_stores: req.body.targetStores
        });

        // 2. หาพนักงานที่ต้องได้รับงานนี้ (Logic เดียวกับใน React)
        let userCondition = {};
        if (req.body.targetStores && req.body.targetStores.length > 0) {
            userCondition.store_name = { [Op.in]: req.body.targetStores };
        } else if (req.body.targetBrands && req.body.targetBrands.length > 0) {
            userCondition.brand_name = { [Op.in]: req.body.targetBrands };
        }

        const employees = await User.findAll({ where: userCondition });

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
        const userId = req.userId; // สมมติว่าได้จาก middleware auth.js
        const data = await TaskAssignment.findAll({
            where: { user_id: userId },
            include: [{
                model: Task,
                as: 'task_detail' // ต้องตั้ง alias ใน models/index.js
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
        const userId = req.userId;

        const result = await TaskAssignment.update(
            { 
                status: 'submitted',
                submitted_at: db.sequelize.fn('NOW') 
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

// API สำหรับหน้าภาพรวมทีม (หน้ากราฟ)
exports.getTeamSummary = async (req, res) => {
    try {
        const { store } = req.query; // รับค่า Filter จาก Select Box หน้าบ้าน
        
        let userCondition = {};
        if (store && store !== 'all') {
            userCondition.store_name = store;
        }

        // 1. ดึงพนักงานพร้อมงานที่ได้รับมอบหมาย
        const employees = await User.findAll({
            where: userCondition,
            attributes: ['id', 'name', 'store_name', 'position'],
            include: [{
                model: TaskAssignment,
                as: 'assignments', // ชื่อที่ตั้งไว้ใน models/index.js
                attributes: ['status']
            }]
        });

        // 2. คำนวณสรุปผล (Logic ตาม TeamOverviewPage.tsx)
        const summaries = employees.map(emp => {
            const tasks = emp.assignments || [];
            const total = tasks.length;
            const submitted = tasks.filter(t => t.status === 'submitted').length;
            const pending = total - submitted;
            const pct = total > 0 ? Math.round((submitted / total) * 100) : 0;

            return {
                employee: {
                    id: emp.id,
                    name: emp.name,
                    store: emp.store_name,
                    position: emp.position
                },
                total,
                submitted,
                pending,
                pct
            };
        });

        // 3. คำนวณสถิติรวมของทีม (เพื่อแสดงใน Card)
        const totalEmp = summaries.length;
        const fullySubmitted = summaries.filter(s => s.pct === 100).length;
        const avgPct = totalEmp > 0 
            ? Math.round(summaries.reduce((a, s) => a + s.pct, 0) / totalEmp) 
            : 0;

        res.status(200).send({
            summaries,
            stats: { totalEmp, fullySubmitted, avgPct }
        });

    } catch (err) {
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