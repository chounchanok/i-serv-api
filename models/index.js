'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const tenantStorage = require('../config/tenantContext');

// ฟังก์ชันสำหรับสร้าง Connection และโหลด Model ใส่ Object ของ Database นั้นๆ
const buildDatabaseInstance = (dbName, dbUser, dbPass, dbHostWrite, dbHostRead) => {
    const sequelize = new Sequelize(dbName, null, null, {
        dialect: 'mysql',
        port: 3306,
        replication: {
            read: [{ host: dbHostWrite, username: dbUser, password: dbPass }],
            write: { host: dbHostRead, username: dbUser, password: dbPass },
        },
        pool: { max: 20, idle: 30000 },
        timezone: '+07:00',
        logging: false,
    });

    const db = {};

    fs.readdirSync(__dirname)
        .filter(file => {
            return file.indexOf('.') !== 0 && file !== basename && file.slice(-3) === '.js';
        })
        .forEach(file => {
            // โหลดโมเดลด้วย Connection แยกอิสระ
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

    return db;
};

// 1. สร้าง Instance สำหรับฐานข้อมูล Main
const dbMain = buildDatabaseInstance(
    process.env.MYSQL_DATABASE,
    process.env.MYSQL_USERNAME,
    process.env.MYSQL_PASSWORD,
    process.env.MYSQL_HOST_WRITE,
    process.env.MYSQL_HOST_READ
);

// 2. สร้าง Instance สำหรับฐานข้อมูล MJ
const dbMJ = buildDatabaseInstance(
    process.env.MYSQL_DATABASE_MJ,
    process.env.MYSQL_USERNAME_MJ,
    process.env.MYSQL_PASSWORD_MJ,
    process.env.MYSQL_HOST_WRITE_MJ,
    process.env.MYSQL_HOST_READ_MJ
);

// 3. ใช้ Proxy ดักการเรียกใช้ db ทุกครั้ง (ตัวแปร db ส่งไปให้ Controller)
const dbProxy = new Proxy({}, {
    get: (target, prop) => {
        // เช็คว่า Context ปัจจุบันคืออะไร (มาจาก Middleware setTenant)
        const tenant = tenantStorage.getStore(); 
        
        if (tenant === 'mj') {
            return dbMJ[prop];
        }
        return dbMain[prop];
    }
});

module.exports = dbProxy;