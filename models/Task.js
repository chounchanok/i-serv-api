module.exports = (sequelize, Sequelize) => {
    const Task = sequelize.define("tasks", {
        // 🌟 ระบุ Primary Key ให้ชัดเจน
        id: { 
            type: Sequelize.INTEGER, 
            primaryKey: true, 
            autoIncrement: true 
        },
        name: { type: Sequelize.STRING },
        report_type: { type: Sequelize.STRING },
        priority: { type: Sequelize.INTEGER },
        start_date: { type: Sequelize.DATEONLY },
        end_date: { type: Sequelize.DATEONLY },
        description: { type: Sequelize.TEXT },
        target_brands: { type: Sequelize.JSON }, 
        target_stores: { type: Sequelize.JSON },
        // 🌟 งานแบบทำครั้งเดียว: ส่งแล้ว 1 ครั้งในช่วง start_date - end_date จะไม่แจ้งเตือนอีก
        is_one_time: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false }
    });
    return Task;
};