'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class AccountType extends Model {
        static associate(models) {
            AccountType.belongsTo(models.GroupCustomer, { foreignKey: 'group_customer_id', as: 'group_customer' });

            AccountType.belongsTo(models.Account, { foreignKey: 'account_id', as: 'account' });
            AccountType.hasMany(models.MapProductStore, {
                foreignKey: 'account_type_id',
                as: 'mapProductStore',
            });
            AccountType.hasMany(models.Store, {
                foreignKey: 'account_type_id',
                as: 'Store',
            });
            AccountType.hasMany(models.StoreToAccount, {
                foreignKey: 'account_type_id',
                as: 'storeToAccount',
            });
        }
    }

    AccountType.init(
        {
            id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                primaryKey: true, // เพิ่ม primaryKey
                autoIncrement: true, // เพิ่ม autoIncrement
            },
            group_customer_id: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            
            account_id: { // เพิ่มคอลัมน์นี้เพื่อเชื่อมต่อกับ AccountType
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                references: { // ใช้ references เพื่อระบุ foreignKey
                    model: 'tb_account', // ระบุชื่อ table ที่จะเชื่อมต่อ (tb_account)
                    key: 'id', // ระบุฟิลด์ใน tb_account ที่เป็น primary key
                },
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
            modelName: 'AccountType',
            tableName: 'tb_account_type',
            timestamps: true,
        },
    );
    return AccountType;
};
