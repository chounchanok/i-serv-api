'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class SubBrand extends Model {
        static associate(models) {
            // SubBrand.belongsTo(models.GroupCustomer, { foreignKey: 'group_customer_id', as: 'group_customer' });

            SubBrand.belongsTo(models.Brand, { foreignKey: 'brand_id', as: 'brand' });
            // SubBrand.belongsTo(models.Product, { foreignKey: 'id', as: 'Product' })
            SubBrand.hasMany(models.Product, {
                foreignKey: 'sub_brand_id',
                as: 'product',
            });
        }
    }

    SubBrand.init(
        {
            group_customer_id: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            brand_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: '0',
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
            modelName: 'SubBrand',
            tableName: 'tb_sub_brand',
            timestamps: true,
        },
    );
    return SubBrand;
};
