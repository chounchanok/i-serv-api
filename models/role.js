'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Role extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
        }
    };
    Role.init({   // ตั้งชื่อตารางในฐานข้อมูล และกำหนดฟิลด์

        name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        description: {
            type: DataTypes.STRING(200),
            allowNull: false
        }


    }, {
        sequelize,
        modelName: 'Role',
        tableName: 'tb_role',
        timestamps: true,
        scopes: {
            active: {
                where: {
                    isActive: 'Y'
                }
            }
        }
    });
    Role.associate = function (models) {

    };
    return Role;
};

