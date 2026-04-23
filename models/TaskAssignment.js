module.exports = (sequelize, DataTypes) => {
  const TaskAssignment = sequelize.define('TaskAssignment', {
    status: {
      type: DataTypes.ENUM('pending', 'submitted'),
      defaultValue: 'pending'
    },
    submitted_at: DataTypes.DATE
  }, {
    tableName: 'task_assignments'
  });
  return TaskAssignment;
};