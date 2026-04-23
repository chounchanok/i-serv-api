'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MapUserArea extends Model {
    static associate(models) {
      MapUserArea.belongsTo(models.GroupCustomer, {
          foreignKey: 'group_customer_id',
          as: 'groupCustomer', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
      });
      MapUserArea.belongsTo(models.AreaSupervisor, {
          foreignKey: 'area_supervisor_id',
          as: 'areaSupervisor', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
      });
      MapUserArea.belongsTo(models.AreaManager, {
          foreignKey: 'area_manager_id',
          as: 'areaManager', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
      });
    }
  };
  MapUserArea.init({   // ตั้งชื่อตารางในฐานข้อมูล และกำหนดฟิลด์
    group_customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    area_supervisor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    area_manager_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    modelName: 'MapUserArea',
    tableName: 'tb_map_user_area',
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
  return MapUserArea;
};

