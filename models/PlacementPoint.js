'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class PlacementPoint extends Model {
        static associate(models) {
            PlacementPoint.belongsTo(models.GroupCustomer, {
                foreignKey: 'group_customer_id',
                as: 'groupCustomer', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
            });
            PlacementPoint.hasMany(models.MapStoreComplianceList, {
                foreignKey: 'placement_point_id',
                as: 'mapStoreComplianceList',
            });
        }
    }

    PlacementPoint.init(
        {
            group_customer_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            name: {
                type: DataTypes.STRING(255),
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
        },
        {
            sequelize,
            modelName: 'PlacementPoint',
            tableName: 'tb_placement_point',
            timestamps: true,
        },
    );
    return PlacementPoint;
};
