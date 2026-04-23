'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class OosList extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      OosList.belongsTo(models.MapProductStoreList, {
          foreignKey: 'map_product_store_list_id',
          as: 'mapProductStoreList', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
      });
      OosList.belongsTo(models.Oos, {
          foreignKey: 'oos_id',
          as: 'oos', // เปลี่ยนชื่อ alias ให้ไม่ซ้ำกับฟิลด์ใน model
      });
    }
  };
  OosList.init({   // ตั้งชื่อตารางในฐานข้อมูล และกำหนดฟิลด์
    oos_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    map_product_store_list_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    qty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    oos_status: {
      type: DataTypes.ENUM(['Y', 'N']),
      allowNull: false,
      defaultValue: 'N', // Default to 'N'
    },
    oos_status2: {
      type: DataTypes.ENUM(['Y', 'N']),
      allowNull: false,
      defaultValue: 'N', // Default to 'N'
    },
    not_sell: {
      type: DataTypes.ENUM(['Y', 'N']),
      allowNull: false,
      defaultValue: 'N', // Default to 'Y'
    },
    note: {
        type: DataTypes.STRING(255),
        allowNull: true,
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
    modelName: 'OosList',
    tableName: 'tb_ooslist',
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
  return OosList;
};

