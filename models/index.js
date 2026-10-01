'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const db = {};

// สร้าง Connection เดี่ยวๆ โดยดึงค่ามาจาก .env ของแต่ละ Instance
let sequelize = new Sequelize(process.env.MYSQL_DATABASE, null, null, {
  dialect: 'mysql',
  port: 3306,
  replication: {
    read: [{ host: process.env.MYSQL_HOST_WRITE, username: process.env.MYSQL_USERNAME, password: process.env.MYSQL_PASSWORD }],
    write: { host: process.env.MYSQL_HOST_READ, username: process.env.MYSQL_USERNAME, password: process.env.MYSQL_PASSWORD },
  },
  pool: { max: 20, idle: 30000 },
  timezone: '+07:00',
  logging: false,
});

fs.readdirSync(__dirname)
  .filter(file => {
    return file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js';
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// ความสัมพันธ์ของระบบ
if (db.tasks && db.TaskAssignment) {
    db.tasks.hasMany(db.TaskAssignment, { foreignKey: 'task_id', as: 'assignments' });
    db.TaskAssignment.belongsTo(db.tasks, { foreignKey: 'task_id', as: 'task_detail' });
}

const UserModel = db.User || db.users; 
if (UserModel && db.TaskAssignment) {
    UserModel.hasMany(db.TaskAssignment, { foreignKey: 'user_id', as: 'assignments' });
    db.TaskAssignment.belongsTo(UserModel, { foreignKey: 'user_id', as: 'user' });
}

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;