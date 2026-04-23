'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Provinces extends Model {
        static associate(models) {
            Provinces.hasMany(models.Store, {
                foreignKey: 'provinces_id',
                as: 'store',
            });
        }
    }

    Provinces.init(
        {
            name_in_thai: {
                type: DataTypes.STRING(255),
                allowNull: true,
            },
            name_in_english: {
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
            modelName: 'Provinces',
            tableName: 'tb_provinces',
            timestamps: true,
        },
    );
    return Provinces;
};
