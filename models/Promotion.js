'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Promotion extends Model {
        static associate(models) {
            Promotion.belongsTo(models.GroupCustomer, { foreignKey: 'group_customer_id', as: 'group_customer' });
        }
    }

    Promotion.init(
        {
            group_customer_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            code: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },
            name: {
                type: DataTypes.TEXT,
                allowNull: true,
            },
            isActive: {
                type: DataTypes.ENUM(['Y', 'N']),
                allowNull: false,
            },
        },
        {
            sequelize,
            modelName: 'Promotion',
            tableName: 'tb_promotion',
            timestamps: true,
        },
    );
    return Promotion;
};
