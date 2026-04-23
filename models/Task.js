module.exports = (sequelize, DataTypes) => {
  const Task = sequelize.define('Task', {
    name: DataTypes.STRING,
    report_type: DataTypes.STRING,
    priority: DataTypes.INTEGER, // 1, 2, 3
    start_date: DataTypes.DATEONLY,
    end_date: DataTypes.DATEONLY,
    description: DataTypes.TEXT,
    target_brands: DataTypes.JSON, // เก็บเป็น Array ['Brand A']
    target_stores: DataTypes.JSON  // เก็บเป็น Array ['Store A1']
  }, {
    tableName: 'tasks'
  });
  return Task;
};