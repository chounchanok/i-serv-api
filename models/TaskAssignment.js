module.exports = (sequelize, DataTypes) => {
  const TaskAssignment = sequelize.define('TaskAssignment', {
    // 🌟 เพิ่ม 2 ฟิลด์นี้เข้าไปเพื่อให้ Sequelize รู้จัก
    task_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'submitted'),
      defaultValue: 'pending'
    },
    submitted_at: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'task_assignments',
    timestamps: true // ถ้าใน DB คุณมี createdAt, updatedAt ให้เปิดไว้
  });
  return TaskAssignment;
};