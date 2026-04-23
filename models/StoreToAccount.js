'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class StoreToAccount extends Model {
        static associate(models) {
            StoreToAccount.belongsTo(models.GroupCustomer, {
                foreignKey: 'group_customer_id',
                as: 'groupCustomer',
            });
            StoreToAccount.belongsTo(models.Account, {
                foreignKey: 'account_id',
                as: 'account',
            });
            StoreToAccount.belongsTo(models.AccountType, {
                foreignKey: 'account_type_id',
                as: 'accountType',
            });
        }
    }

    StoreToAccount.init(
        {
            group_customer_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            account_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            account_type_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            isActive: {
                type: DataTypes.ENUM(['Y', 'N']),
                allowNull: false,
            },
        },
        {
            sequelize,
            modelName: 'StoreToAccount',
            tableName: 'tb_store_to_account',
            timestamps: true
        },
    );
    return StoreToAccount;
};
