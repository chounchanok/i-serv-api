'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class WeekList extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      WeekList.belongsTo(models.MapProductStoreList, {
          foreignKey: 'map_product_store_list_id',
          as: 'mapProductStoreList', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
      });
      WeekList.belongsTo(models.Week, {
          foreignKey: 'week_id',
          as: 'week', // เปลี่ยนชื่อ alias ให้ไม่ซ้ำกับฟิลด์ใน model
      });
    }
  };
  WeekList.init({   // ตั้งชื่อตารางในฐานข้อมูล และกำหนดฟิลด์
    week_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    map_product_store_list_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    t_rank: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    note: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    week1: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    week2: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    week3: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    week4: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    week5: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    week6: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    week7: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    week8: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    week9: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    week10: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    week11: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    week12: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    week_status: {
      type: DataTypes.ENUM(['Y', 'N']),
      allowNull: false,
      defaultValue: 'N', // Default to 'N'
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
    modelName: 'WeekList',
    tableName: 'tb_weeklist',
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
  return WeekList;
};

