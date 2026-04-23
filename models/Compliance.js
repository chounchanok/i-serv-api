'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Compliance extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Compliance.belongsTo(models.MapStoreCompliance, {
      //     foreignKey: 'group_id',
      //     as: 'mapStoreCompliance', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
      // });
      
      Compliance.hasMany(models.ComplianceList, {
          foreignKey: 'compliance_id',
          as: 'complianceDetails',
      });

      Compliance.belongsTo(models.User, {
          foreignKey: 'user_id',
          as: 'user'
      });
      Compliance.belongsTo(models.Store, {
          foreignKey: 'store_id',
          as: 'store'
      });
    }
  };
  Compliance.init({   // ตั้งชื่อตารางในฐานข้อมูล และกำหนดฟิลด์
    compliance_type: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    // group_id: {
    //   type: DataTypes.INTEGER,
    //   allowNull: true, // อนุญาตให้ NULL ได้
    //   defaultValue: 0
    // },
    store_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // อนุญาตให้ NULL ได้
      defaultValue: 0
    },
    datenow: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    datesave: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    extra: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
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
    modelName: 'Compliance',
    tableName: 'tb_compliance',
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
  return Compliance;
};

