'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class AreaManager extends Model {
        static associate(models) {
            AreaManager.belongsTo(models.GroupCustomer, { foreignKey: 'group_customer_id', as: 'group_customer' });

            AreaManager.hasMany(models.User, {
                foreignKey: 'area_manager',
                as: 'User',
            });
            AreaManager.hasMany(models.MapUserArea, {
                foreignKey: 'area_manager_id',
                as: 'mapUserArea',
            });
        }
    }

    AreaManager.init(
        {
            name: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },
            group_customer_id: {
                type: DataTypes.INTEGER,
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
            modelName: 'AreaManager',
            tableName: 'tb_area_manager',
            timestamps: true,
        },
    );
    return AreaManager;
};
