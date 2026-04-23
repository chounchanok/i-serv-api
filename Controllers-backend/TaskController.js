const { Task, TaskAssignment, User } = require('../models');
const { Op } = require('sequelize');

exports.createTask = async (req, res) => {
  try {
    const { name, reportType, priority, startDate, endDate, description, targetBrands, targetStores } = req.body;

    // 1. บันทึกงานหลัก
    const task = await Task.create({
      name,
      report_type: reportType,
      priority,
      start_date: startDate,
      end_date: endDate,
      description,
      target_brands: targetBrands,
      target_stores: targetStores
    });

    // 2. หาพนักงานที่เกี่ยวข้อง (Logic ตาม UI: หาพนักงานจาก Store หรือ Brand)
    let whereCondition = {};
    if (targetStores && targetStores.length > 0) {
      whereCondition.store_name = { [Op.in]: targetStores };
    } else if (targetBrands && targetBrands.length > 0) {
      whereCondition.brand_name = { [Op.in]: targetBrands };
    }

    const employees = await User.findAll({ where: whereCondition });

    // 3. กระจายงาน (Assignments)
    if (employees.length > 0) {
      const assignments = employees.map(emp => ({
        task_id: task.id,
        user_id: emp.id,
        status: 'pending'
      }));
      await TaskAssignment.bulkCreate(assignments);
    }

    res.status(201).json({ message: 'สร้างงานเรียบร้อย', task });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAdminTasks = async (req, res) => {
  try {
    const tasks = await Task.findAll({ order: [['start_date', 'DESC']] });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};