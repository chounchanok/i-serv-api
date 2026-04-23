'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Store extends Model {
        static associate(models) {
            // Store.hasMany(models.MapUserStore, {
            //     foreignKey: 'store_id',
            //     as: 'mapUserStore',
            // });
            Store.belongsTo(models.GroupCustomer, {
                foreignKey: 'group_customer_id',
                as: 'groupCustomer',
            });
            Store.belongsTo(models.Channel, {
                foreignKey: 'channel_id',
                as: 'channel',
            });
            Store.belongsTo(models.Account, {
                foreignKey: 'account_id',
                as: 'account',
            });
            Store.belongsTo(models.AccountType, {
                foreignKey: 'account_type_id',
                as: 'accountType',
            });
            Store.belongsTo(models.Provinces, {
                foreignKey: 'provinces_id',
                as: 'provinces',
            });
            Store.hasMany(models.MapStoreCompliance, {
                foreignKey: 'store_id',
                as: 'mapStoreCompliance',
            });
            Store.hasMany(models.Complianceextra, {
                foreignKey: 'store_id',
                as: 'complianceextra',
            });
            Store.hasMany(models.Compliance, {
                foreignKey: 'store_id',
                as: 'compliance',
            });
            Store.hasMany(models.Oos, {
                foreignKey: 'store_id',
                as: 'Oos',
            });
            Store.hasMany(models.Offtake, {
                foreignKey: 'store_id',
                as: 'offtake',
            });
        }
    }

    Store.init(
        {
            group_customer_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            channel_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            store_code: {
                type: DataTypes.STRING(200),
                allowNull: true,
            },
            store_name: {
                type: DataTypes.STRING(200),
                allowNull: true,
            },
            store_name_report: {
                type: DataTypes.STRING(200),
                allowNull: true,
            },
            store_name_report_full: {
                type: DataTypes.STRING(200),
                allowNull: true,
            },
            account_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            account_type_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            provinces_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            isActive: {
                type: DataTypes.ENUM(['Y', 'N']),
                allowNull: false,
            },
        },
        {
            sequelize,
            modelName: 'Store',
            tableName: 'tb_store',
            timestamps: true,
        },
    );
    return Store;
};
