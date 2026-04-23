'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MapProductStore extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      MapProductStore.belongsTo(models.Account, {
          foreignKey: 'account_id',
          as: 'account', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
      });
      MapProductStore.belongsTo(models.AccountType, {
          foreignKey: 'account_type_id',
          as: 'accountType', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
      });
      MapProductStore.belongsTo(models.GroupCustomer, {
          foreignKey: 'group_customer_id',
          as: 'groupCustomer', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
      });
      MapProductStore.hasMany(models.MapProductStoreList, {
        foreignKey: 'map_product_id',
        as: 'mapProductStoreList', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
      });
      MapProductStore.hasMany(models.Oos, {
        foreignKey: 'group_id',
        as: 'oos', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
      });
      MapProductStore.hasMany(models.Week, {
        foreignKey: 'group_id',
        as: 'week', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
      });
      MapProductStore.hasMany(models.Compliance, {
        foreignKey: 'group_id',
        as: 'compliance', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
      });
    }
  };
  MapProductStore.init({   // ตั้งชื่อตารางในฐานข้อมูล และกำหนดฟิลด์
    account_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    account_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    group_customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    msl: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },









    group_customer_name: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    user_code: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    user_prefix: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    user_name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    user_lastname: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    account_name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    store_code: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    branch_name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    province_name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    account_type_name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    group_name: {
      type: DataTypes.TEXT,
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
    modelName: 'MapProductStore',
    tableName: 'tb_map_product_store',
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
  return MapProductStore;
};

