'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Position extends Model {
        static associate(models) {
            Position.belongsTo(models.GroupCustomer, { foreignKey: 'group_customer_id', as: 'group_customer' });
            Position.hasMany(models.User, {
                foreignKey: 'position_id',
                as: 'User',
            });
        }
    }

    Position.init(
        {
            group_customer_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            name: {
                type: DataTypes.STRING(200),
                allowNull: true,
            },
            permission_name: {
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
            modelName: 'Position',
            tableName: 'tb_position',
            timestamps: true,
        },
    );
    return Position;
};
