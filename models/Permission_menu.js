'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Permission_menu extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
        }
    };
    Permission_menu.init({   // ตั้งชื่อตารางในฐานข้อมูล และกำหนดฟิลด์


        key: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        name_th: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        code: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        view: {
            type: DataTypes.ENUM(['Y', 'N']),
            allowNull: false
        },
        create: {
            type: DataTypes.ENUM(['Y', 'N']),
            allowNull: false
        },
        edit: {
            type: DataTypes.ENUM(['Y', 'N']),
            allowNull: false
        },
        delete: {
            type: DataTypes.ENUM(['Y', 'N']),
            allowNull: false
        },
        active: {
            type: DataTypes.ENUM(['Y', 'N']),
            allowNull: false
        },
        evaluate: {
            type: DataTypes.ENUM(['Y', 'N']),
            allowNull: false
        },
        approve: {
            type: DataTypes.ENUM(['Y', 'N']),
            allowNull: false
        },
        upload: {
            type: DataTypes.ENUM(['Y', 'N']),
            allowNull: false
        },
        export: {
            type: DataTypes.ENUM(['Y', 'N']),
            allowNull: false
        },
        import: {
            type: DataTypes.ENUM(['Y', 'N']),
            allowNull: false
        }
    }, {
        sequelize,
        modelName: 'Permission_menu',
        tableName: 'tb_Permission_menu',
        timestamps: true,
        scopes: {

        }
    });
    return Permission_menu;
};

