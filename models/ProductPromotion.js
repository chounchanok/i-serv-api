'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class ProductPromotion extends Model {
        static associate(models) {
            ProductPromotion.belongsTo(models.GroupCustomer, { foreignKey: 'group_customer_id', as: 'group_customer' });
            ProductPromotion.hasMany(models.Product, {
                foreignKey: 'promotion_id',
                as: 'product',
            });
        }
    }

    ProductPromotion.init(
        {
            group_customer_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            name: {
                type: DataTypes.TEXT,
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
            modelName: 'ProductPromotion',
            tableName: 'tb_productpromotion',
            timestamps: true,
        },
    );
    return ProductPromotion;
};
