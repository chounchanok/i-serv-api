'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class JobPosition extends Model {
        static associate(models) {
            JobPosition.belongsTo(models.GroupCustomer, { foreignKey: 'group_customer_id', as: 'group_customer' });

            JobPosition.hasMany(models.User, {
                foreignKey: 'job_position_id',
                as: 'User',
            });
        }
    }

    JobPosition.init(
        {
            group_customer_id: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            name: {
                type: DataTypes.STRING(200),
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
            modelName: 'JobPosition',
            tableName: 'tb_job_position',
            timestamps: true,
        },
    );
    return JobPosition;
};
