'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Noteoosstock extends Model {
        static associate(models) {
            Noteoosstock.belongsTo(models.GroupCustomer, { foreignKey: 'group_customer_id', as: 'group_customer' });
        }
    }

    Noteoosstock.init(
        {
            group_customer_id: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            name: {
                type: DataTypes.STRING(200),
                allowNull: false,
            },
            isActive: {
                type: DataTypes.ENUM(['Y', 'N']),
                allowNull: false,
            },
        },
        {
            sequelize,
            modelName: 'Noteoosstock',
            tableName: 'tb_noteoosstock',
            timestamps: true,
        },
    );
    return Noteoosstock;
};
