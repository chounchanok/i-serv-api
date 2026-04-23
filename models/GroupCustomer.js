'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class GroupCustomer extends Model {
        static associate(models) {
            GroupCustomer.hasMany(models.Position, { foreignKey: 'id', as: 'position' });
            GroupCustomer.hasMany(models.Promotion, { foreignKey: 'id', as: 'promotion' });
            GroupCustomer.hasMany(models.ReasonForNotGettingSpace, { foreignKey: 'id', as: 'ReasonForNotGettingSpace' });
            GroupCustomer.hasMany(models.Posm, { foreignKey: 'id', as: 'Posm' });
            // GroupCustomer.hasMany(models.Product, { foreignKey: 'id', as: 'Product' });
            GroupCustomer.hasMany(models.PlacementPoint, {
                foreignKey: 'group_customer_id',
                as: 'placementPoints',
            });
            GroupCustomer.hasMany(models.RentalAreaUnit, {
                foreignKey: 'group_customer_id',
                as: 'RentalAreaUnit',
            });
            GroupCustomer.hasMany(models.User, {
                foreignKey: 'group_customer_id',
                as: 'User',
            });
            GroupCustomer.hasMany(models.Product, {
                foreignKey: 'group_customer_id',
                as: 'product',
            });
            GroupCustomer.hasMany(models.MapProductStore, {
                foreignKey: 'group_customer_id',
                as: 'mapProductStore',
            });
            GroupCustomer.hasMany(models.MapUserStore, {
                foreignKey: 'group_customer_id',
                as: 'mapUserStore',
            });
            GroupCustomer.hasMany(models.MapUserArea, {
                foreignKey: 'group_customer_id',
                as: 'mapUserArea',
            });
            GroupCustomer.hasMany(models.Store, {
                foreignKey: 'group_customer_id',
                as: 'Store',
            });
            GroupCustomer.hasMany(models.StoreToAccount, {
                foreignKey: 'group_customer_id',
                as: 'StoreToAccount',
            });
            GroupCustomer.hasMany(models.ProductPromotion, {
                foreignKey: 'group_customer_id',
                as: 'productPromotion',
            });
            GroupCustomer.hasMany(models.Noteoosstock, {
                foreignKey: 'group_customer_id',
                as: 'noteoosstock',
            });
            GroupCustomer.hasMany(models.Competitor, {
                foreignKey: 'group_customer_id',
                as: 'competitor',
            });
        }
    }

    GroupCustomer.init(
        {
            name: {
                type: DataTypes.STRING(200),
                allowNull: true,
            },
            picture: {
                type: DataTypes.STRING(200),
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
            modelName: 'GroupCustomer',
            tableName: 'tb_group_customer',
            timestamps: true,
        },
    );
    return GroupCustomer;
};
