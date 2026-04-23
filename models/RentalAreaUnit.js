'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class RentalAreaUnit extends Model {
        static associate(models) {
            RentalAreaUnit.belongsTo(models.GroupCustomer, {
                foreignKey: 'group_customer_id',
                as: 'groupCustomer', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
            });
            RentalAreaUnit.hasMany(models.MapStoreComplianceList, {
                foreignKey: 'rental_area_unit_name',
                as: 'mapStoreComplianceList',
            });
            RentalAreaUnit.belongsTo(models.Account, {
                foreignKey: 'account_id',
                as: 'account', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
                constraints: false, // ถ้าหาค่าไอดีไม่เจอก็ไม่ต้อง join
            });
        }
    }

    RentalAreaUnit.init(
        {
            group_customer_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            account_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
                defaultValue: 0,
            },
            name: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },
            unit: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },
            type: {
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
            modelName: 'RentalAreaUnit',
            tableName: 'tb_rental_area_unit',
            timestamps: true,
        },
    );
    return RentalAreaUnit;
};
