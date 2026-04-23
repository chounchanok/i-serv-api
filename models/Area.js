'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Area extends Model {
        static associate(models) {
            // define association here
        }
    }

    Area.init(
        {
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
            modelName: 'Area',
            tableName: 'tb_area',
            timestamps: true,
        },
    );
    return Area;
};
