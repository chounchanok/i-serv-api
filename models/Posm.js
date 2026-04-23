'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Posm extends Model {
        static associate(models) {
            Posm.belongsTo(models.GroupCustomer, { foreignKey: 'group_customer_id', as: 'group_customer' });
        }
    }

    Posm.init(
        {
            group_customer_id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: { // ใช้ references เพื่อระบุ foreignKey
                    model: 'tb_group_customer', // ระบุชื่อ table ที่จะเชื่อมต่อ (tb_account)
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
            },
        },
        {
            sequelize,
            modelName: 'Posm',
            tableName: 'tb_posm',
            timestamps: true,
        },
    );
    return Posm;
};
