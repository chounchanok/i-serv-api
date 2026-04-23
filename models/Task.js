// models/Task.js (ตัวอย่างโครงสร้างที่ควรมี)
module.exports = (sequelize, Sequelize) => {
    const Task = sequelize.define("tasks", {
        name: { type: Sequelize.STRING },
        report_type: { type: Sequelize.STRING },
        priority: { type: Sequelize.INTEGER },
        start_date: { type: Sequelize.DATEONLY },
        end_date: { type: Sequelize.DATEONLY },
        description: { type: Sequelize.TEXT },
        target_brands: { type: Sequelize.JSON }, // เก็บเป็น Array
        target_stores: { type: Sequelize.JSON }  // เก็บเป็น Array
    });
    return Task;
};