'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Competitor extends Model {
        static associate(models) {
            Competitor.hasMany(models.Product, {
                foreignKey: 'competitor_id',
                as: 'product',
            });
            Competitor.belongsTo(models.GroupCustomer, { foreignKey: 'group_customer_id', as: 'group_customer' });
        }
    }

    Competitor.init(
        {
            group_customer_id: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },
            isActive: {
                type: DataTypes.ENUM(['Y', 'N']),
                allowNull: false,
                defaultValue: 'Y',
            },
        },
        {
            sequelize,
            modelName: 'Competitor',
            tableName: 'tb_competitor',
            timestamps: true,
        },
    );
    return Competitor;
};
