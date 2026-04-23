'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ComplianceListImagesextra extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // ComplianceListImagesextra.belongsTo(models.ComplianceListextra, {
      //     foreignKey: 'complianceextra_list_id',
      //     as: 'complianceListextra'
      // });
    }
  };
  ComplianceListImagesextra.init({   // ตั้งชื่อตารางในฐานข้อมูล และกำหนดฟิลด์
    complianceextra_list_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    week: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    filename: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    datecreate: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    dateupdate: {
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
    modelName: 'ComplianceListImagesextra',
    tableName: 'tb_compliancelistimagesextra',
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
  return ComplianceListImagesextra;
};

