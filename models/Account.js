'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Account extends Model {
        static associate(models) {
            // ตั้งค่าความสัมพันธ์ belongsTo กับ AccountType
            Account.belongsTo(models.GroupCustomer, { foreignKey: 'group_customer_id', as: 'group_customer' });

            Account.hasMany(models.AccountType, { foreignKey: 'id', as: 'accountType' });
            Account.hasMany(models.MapProductStore, {
                foreignKey: 'account_id',
                as: 'mapProductStore',
            });
            
            Account.hasMany(models.Store, {
                foreignKey: 'account_id',
                as: 'Store',
            });
            Account.hasMany(models.StoreToAccount, {
                foreignKey: 'account_id',
                as: 'storeToAccount',
            });
            Account.hasMany(models.RentalAreaUnit, {
                foreignKey: 'account_id',
                as: 'rentalAreaUnit',
            });
        }
    }
    
    Account.init(
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
            modelName: 'Account',
            tableName: 'tb_account',
            timestamps: true,
        },
    );
    return Account;
};