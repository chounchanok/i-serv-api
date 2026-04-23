'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Brand extends Model {
        static associate(models) {
            Brand.belongsTo(models.GroupCustomer, { foreignKey: 'group_customer_id', as: 'group_customer' });

            Brand.hasMany(models.SubBrand, { foreignKey: 'id', as: 'subBrand' });
            Brand.hasMany(models.Product, {
                foreignKey: 'brand_id',
                as: 'product',
            });
        }
    }

    Brand.init(
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
            modelName: 'Brand',
            tableName: 'tb_brand',
            timestamps: true,
        },
    );
    return Brand;
};
