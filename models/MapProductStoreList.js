'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MapProductStoreList extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      MapProductStoreList.belongsTo(models.MapProductStore, {
          foreignKey: 'map_product_id',
          as: 'mapProductStore', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
      });
      MapProductStoreList.belongsTo(models.Product, {
          foreignKey: 'product_id',
          as: 'product'
      });
      MapProductStoreList.belongsTo(models.ComplianceList, {
          foreignKey: 'map_product_store_list_id',
          as: 'complianceList'
      });
      MapProductStoreList.hasMany(models.OosList, {
        foreignKey: "map_product_store_list_id",
        as: "oosList", // **ต้องตรงกับ alias ที่ใช้ใน include**
      });
      MapProductStoreList.hasMany(models.OfftakeList, {
        foreignKey: "map_product_store_list_id",
        as: "offtakeList", // **ต้องตรงกับ alias ที่ใช้ใน include**
      });
      MapProductStoreList.hasMany(models.PricePromotionList, {
        foreignKey: "map_product_store_list_id",
        as: "pricePromotionList", // **ต้องตรงกับ alias ที่ใช้ใน include**
      });
      MapProductStoreList.hasMany(models.WeekList, {
        foreignKey: "map_product_store_list_id",
        as: "weekList", // **ต้องตรงกับ alias ที่ใช้ใน include**
      });
    }
  };
  MapProductStoreList.init({   // ตั้งชื่อตารางในฐานข้อมูล และกำหนดฟิลด์
    map_product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    oos: {
      type: DataTypes.ENUM(['Y', 'N']),
      allowNull: false,
      defaultValue: 'N', // Default to 'Y'
    },
    stock: {
      type: DataTypes.ENUM(['Y', 'N']),
      allowNull: false,
      defaultValue: 'N', // Default to 'Y'
    },
    price: {
      type: DataTypes.ENUM(['Y', 'N']),
      allowNull: false,
      defaultValue: 'N', // Default to 'Y'
    },
    offtake: {
      type: DataTypes.ENUM(['Y', 'N']),
      allowNull: false,
      defaultValue: 'N', // Default to 'Y'
    },
    week: {
      type: DataTypes.ENUM(['Y', 'N']),
      allowNull: false,
      defaultValue: 'N', // Default to 'Y'
    },
    area: {
      type: DataTypes.ENUM(['Y', 'N']),
      allowNull: false,
      defaultValue: 'N', // Default to 'Y'
    },
    msl: {
      type: DataTypes.ENUM(['Y', 'N']),
      allowNull: false,
      defaultValue: 'N', // Default to 'Y'
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
    modelName: 'MapProductStoreList',
    tableName: 'tb_map_product_store_list',
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
  return MapProductStoreList;
};

