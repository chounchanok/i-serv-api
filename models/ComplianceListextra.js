'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class ComplianceListextra extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      ComplianceListextra.belongsTo(models.Complianceextra, {
          foreignKey: 'complianceextra_id',
          as: 'complianceextra',
      });
      ComplianceListextra.belongsTo(models.Product, {
          foreignKey: 'product_id',
          as: 'product'
      });
    }
  };
  ComplianceListextra.init({   // ตั้งชื่อตารางในฐานข้อมูล และกำหนดฟิลด์
    complianceextra_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    topic: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status_area: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    placement_point_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    rental_area_unit_name: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    qty: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    rental_area_unit_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    substitute_products_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    posm_id: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    
    picture: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    picture_week1: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    picture_week2: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    picture_week3: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    picture_week4: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    datecreate_week1: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    datecreate_week2: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    datecreate_week3: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    datecreate_week4: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    dateupdate_week1: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    dateupdate_week2: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    dateupdate_week3: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    dateupdate_week4: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    reason_for_not_getting_space_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    note: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    competitor_area: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    competitor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    daterange: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    extra: {
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
    modelName: 'ComplianceListextra',
    tableName: 'tb_compliancelistextra',
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
  return ComplianceListextra;
};

