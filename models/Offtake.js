'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Offtake extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Offtake.belongsTo(models.MapProductStore, {
          foreignKey: 'group_id',
          as: 'mapProductStore', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
      });
      Offtake.hasMany(models.OfftakeList, {
          foreignKey: 'offtake_id',
          as: 'offtakeDetails'
      });
      Offtake.belongsTo(models.User, {
          foreignKey: 'user_id',
          as: 'user'
      });
      Offtake.belongsTo(models.Store, {
          foreignKey: 'store_id',
          as: 'store', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
      });
    }
  };
  Offtake.init({   // ตั้งชื่อตารางในฐานข้อมูล และกำหนดฟิลด์
    group_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // อนุญาตให้ NULL ได้
      references: {
        model: 'tb_map_product_store',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    store_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    datenow: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    datesave_start: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    datesave_end: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
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
    modelName: 'Offtake',
    tableName: 'tb_offtake',
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
  return Offtake;
};

