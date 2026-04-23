'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class NewProduct extends Model {
        static associate(models) {
            NewProduct.belongsTo(models.Brand, { foreignKey: 'brand_id', as: 'brand' });
            NewProduct.belongsTo(models.SubBrand, { foreignKey: 'sub_brand_id', as: 'subBrand' });
        }
    }

    NewProduct.init(
        {
            group_customer_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: '0',
                // references: {
                //     model: 'tb_group_customer',
                //     key: 'id',
                // },
            },
            categoryId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                // references: {
                //     model: 'tb_category',
                //     key: 'id',
                // },
            },
            brand_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: '0',
                references: {
                    model: 'tb_brand',
                    key: 'id',
                },
            },
            sub_brand_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: '0',
                references: {
                    model: 'tb_sub_brand',
                    key: 'id',
                },
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },
            flavor: {
                type: DataTypes.STRING(200),
                allowNull: true
            },
            variant: {
                type: DataTypes.STRING(200),
                allowNull: true
            },
            product_size: {
                type: DataTypes.STRING(200),
                allowNull: true
            },
            product_barcode: {
                type: DataTypes.STRING(200),
                allowNull: true
            },
            pack_size: {
                type: DataTypes.STRING(200),
                allowNull: true
            },
            competitor_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                // references: {
                //     model: 'tb_competitor',
                //     key: 'id',
                // },
            },
            picture: {
                type: DataTypes.STRING(200),
                allowNull: true
            },
            promotion_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                // references: {
                //     model: 'tb_promotion',
                //     key: 'id',
                // },
            },
            price: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            qty: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            imgGroupId: {
                type: DataTypes.INTEGER,
                allowNull: true
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
            modelName: 'NewProduct',
            tableName: 'tb_new_product',
            timestamps: true,
        },
    );
    return NewProduct;
};
