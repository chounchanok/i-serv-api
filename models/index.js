'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const db = {};
let sequelize = new Sequelize(process.env.MYSQL_DATABASE, null, null, {
  dialect: 'mysql',
  port: 3306,
  replication: {
    read: [{ host: process.env.MYSQL_HOST_WRITE, username: process.env.MYSQL_USERNAME, password: process.env.MYSQL_PASSWORD }],
    write: { host: process.env.MYSQL_HOST_READ, username: process.env.MYSQL_USERNAME, password: process.env.MYSQL_PASSWORD },
  },

  pool: {
    // If you want to override the options used for the read/write pool you can do so here
    max: 20,
    idle: 30000,
  },
  timezone: '+07:00',
  logging: false,
});


//คำสั่ง Migration สร้างตารางในฐานข้อมูล
// sequelize.sync({ alter: true });

// let sequelize;
// if (process.env.use_env_variable) {
//   sequelize = new Sequelize(process.env[process.env.use_env_variable], config);
// } else {
//   sequelize = new Sequelize(process.env.MYSQL_DATABASE, process.env.MYSQL_USERNAME, process.env.MYSQL_PASSWORD, config);
// }

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

// 🌟 ส่วนที่แก้ใหม่: เช็คชื่อโมเดลให้ตรงกับที่ประกาศไว้ในไฟล์ .define() 🌟

// 1. ความสัมพันธ์ระหว่างตารางงาน (tasks) และ การแจกจ่ายงาน (TaskAssignment)
if (db.tasks && db.TaskAssignment) {
    db.tasks.hasMany(db.TaskAssignment, { foreignKey: 'task_id', as: 'assignments' });
    db.TaskAssignment.belongsTo(db.tasks, { foreignKey: 'task_id', as: 'task_detail' });
}

// 2. ความสัมพันธ์ระหว่างพนักงาน (User) และ การแจกจ่ายงาน
// (ทำเผื่อไว้ 2 ชื่อเลย กันพลาดว่า User โหลดมาเป็นชื่ออะไร)
const UserModel = db.User || db.users; 
if (UserModel && db.TaskAssignment) {
    UserModel.hasMany(db.TaskAssignment, { foreignKey: 'user_id', as: 'assignments' });
    db.TaskAssignment.belongsTo(UserModel, { foreignKey: 'user_id', as: 'user' });
}

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;

