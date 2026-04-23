'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class AreaSupervisor extends Model {
        static associate(models) {
            AreaSupervisor.belongsTo(models.GroupCustomer, { foreignKey: 'group_customer_id', as: 'group_customer' });

            AreaSupervisor.hasMany(models.User, {
                foreignKey: 'area_supervisor',
                as: 'users',
            });
            AreaSupervisor.hasMany(models.MapUserArea, {
                foreignKey: 'area_supervisor_id',
                as: 'mapUserArea',
            });
        }
    }

    AreaSupervisor.init(
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
            modelName: 'AreaSupervisor',
            tableName: 'tb_area_supervisor',
            timestamps: true,
        },
    );
    return AreaSupervisor;
};
