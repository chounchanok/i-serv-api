'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class PricePromotionList extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      PricePromotionList.belongsTo(models.MapProductStoreList, {
          foreignKey: 'map_product_store_list_id',
          as: 'mapProductStoreList', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
      });
      PricePromotionList.belongsTo(models.PricePromotion, {
          foreignKey: 'pricepromotion_id',
          as: 'pricePromotion', // เปลี่ยนชื่อ alias ให้ไม่ซ้ำกับฟิลด์ใน model
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE'
      });
      
    }
  };
  PricePromotionList.init({   // ตั้งชื่อตารางในฐานข้อมูล และกำหนดฟิลด์
    pricepromotion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    },
    map_product_store_list_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    not_sell: {
      type: DataTypes.ENUM(['Y', 'N']),
      allowNull: false,
      defaultValue: 'N', // Default to 'Y'
    },
    price: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    promotion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    special_price: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    daterange: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    picture: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    qty_start: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    qty_in: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    qty_out: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },

    qty_start2: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    qty_in2: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    qty_out2: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    stock2: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },

    qty_start3: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    qty_in3: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    qty_out3: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    stock3: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },

    qty_start4: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    qty_in4: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    qty_out4: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    stock4: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    note: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    price_status: {
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
    modelName: 'PricePromotionList',
    tableName: 'tb_pricepromotionlist',
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
  return PricePromotionList;
};

