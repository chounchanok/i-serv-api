'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Channel extends Model {
        static associate(models) {
            Channel.belongsTo(models.GroupCustomer, { foreignKey: 'group_customer_id', as: 'group_customer' });

            Channel.hasMany(models.Store, {
                foreignKey: 'channel_id',
                as: 'Store',
            });
        }
    }

    Channel.init(
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
            modelName: 'Channel',
            tableName: 'tb_channel',
            timestamps: true,
        },
    );
    return Channel;
};
