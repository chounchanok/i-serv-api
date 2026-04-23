'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MapUserStorelist extends Model {
    static associate(models) {
      MapUserStorelist.belongsTo(models.GroupCustomer, {
          foreignKey: 'group_customer_id',
          as: 'groupCustomer', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
      });
      // MapUserStorelist.belongsTo(models.User, {
      //     foreignKey: 'user_id',
      //     as: 'user', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
      // });
      MapUserStorelist.hasMany(models.Store, {
          foreignKey: 'store_id',
          as: 'store', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
      });
    }
  };
  MapUserStorelist.init({   // ตั้งชื่อตารางในฐานข้อมูล และกำหนดฟิลด์
    route_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    route_no: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    group_customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    store_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    fullname: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    branch_name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    branch_name_full: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    provinces_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    area_supervisor: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    area_supervisor_name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    area_manager: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    area_manager_name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isActive: {
      type: DataTypes.ENUM(['Y', 'N']),
      allowNull: false,
      defaultValue: 'Y', // Default to 'Y'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'), // Default to CURRENT_TIMESTAMP
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'), // Default to CURRENT_TIMESTAMP
    },
  }, {
    sequelize,
    modelName: 'MapUserStorelist',
    tableName: 'tb_map_user_store_list',
    timestamps: true,
    scopes: {
      withPassword: {
        attributes: { exclude: ['createdAt', 'updatedAt'] },
      },
      withPublic: {
        attributes: { exclude: ['loginAt', 'isActive', 'password', 'createdAt', 'updatedAt', 'mode', 'uniqueId'] },
      },
    }
  });
  return MapUserStorelist;
};

