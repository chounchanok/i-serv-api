'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class MapStoreComplianceList extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      MapStoreComplianceList.belongsTo(models.MapStoreCompliance, {
          foreignKey: 'map_product_id',
          as: 'mapStoreCompliance', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
      });
      MapStoreComplianceList.belongsTo(models.Product, {
          foreignKey: 'product_id',
          as: 'product'
      });
      MapStoreComplianceList.belongsTo(models.ComplianceList, {
          foreignKey: 'map_storecompliance_list_id',
          as: 'complianceList'
      });
      MapStoreComplianceList.belongsTo(models.PlacementPoint, {
          foreignKey: 'placement_point_id',
          as: 'placementPoint'
      });
      MapStoreComplianceList.belongsTo(models.RentalAreaUnit, {
          foreignKey: 'rental_area_unit_name',
          as: 'rentalAreaUnit'
      });
      
    }
  };
  MapStoreComplianceList.init({   // ตั้งชื่อตารางในฐานข้อมูล และกำหนดฟิลด์
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
    placement_point_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    rental_area_unit_name: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    qty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    rental_area_unit_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    startdate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    enddate: {
      type: DataTypes.DATEONLY,
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
    modelName: 'MapStoreComplianceList',
    tableName: 'tb_map_storecompliance_list',
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
  return MapStoreComplianceList;
};

