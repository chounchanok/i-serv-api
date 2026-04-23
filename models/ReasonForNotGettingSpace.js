'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class ReasonForNotGettingSpace extends Model {
        static associate(models) {
            ReasonForNotGettingSpace.belongsTo(models.GroupCustomer, { foreignKey: 'group_customer_id', as: 'group_customer' });
        }
    }

    ReasonForNotGettingSpace.init(
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
            modelName: 'ReasonForNotGettingSpace',
            tableName: 'tb_reason_for_not_getting_space',
            timestamps: true,
        },
    );
    return ReasonForNotGettingSpace;
};
