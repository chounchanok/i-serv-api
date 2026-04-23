'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PricePromotion extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      PricePromotion.belongsTo(models.MapProductStore, {
          foreignKey: 'group_id',
          as: 'mapProductStore', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
      });
      
      PricePromotion.hasMany(models.PricePromotionList, {
          foreignKey: 'pricepromotion_id',
          as: 'pricePromotionDetails',
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
      });
      PricePromotion.belongsTo(models.User, {
          foreignKey: 'user_id',
          as: 'user'
      });
      PricePromotion.belongsTo(models.Store, {
          foreignKey: 'store_id',
          as: 'store'
      });
    }
  };
  PricePromotion.init({   // ตั้งชื่อตารางในฐานข้อมูล และกำหนดฟิลด์
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
    datenow: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    datesave: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    isActive: {
      type: DataTypes.ENUM(['Y', 'N']),
      allowNull: false,
      defaultValue: 'Y', // Default to 'Y'
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    store_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    modelName: 'PricePromotion',
    tableName: 'tb_pricepromotion',
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
  return PricePromotion;
};

