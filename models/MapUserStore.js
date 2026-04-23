'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MapUserStore extends Model {
    static associate(models) {
      MapUserStore.belongsTo(models.GroupCustomer, {
          foreignKey: 'group_customer_id',
          as: 'groupCustomer', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
      });
      // MapUserStore.belongsTo(models.User, {
      //     foreignKey: 'user_id',
      //     as: 'user', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
      // });
      // MapUserStore.belongsTo(models.Store, {
      //     foreignKey: 'store_id',
      //     as: 'store', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
      // });
    }
  };
  MapUserStore.init({   // ตั้งชื่อตารางในฐานข้อมูล และกำหนดฟิลด์
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
      type: DataTypes.TEXT,
      allowNull: true
    },
    store_id: {
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
    modelName: 'MapUserStore',
    tableName: 'tb_map_user_store',
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
  return MapUserStore;
};

