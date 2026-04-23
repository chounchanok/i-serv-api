'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class UserGroup extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
        }
    };
    UserGroup.init({   // ตั้งชื่อตารางในฐานข้อมูล และกำหนดฟิลด์
        groupname: {
            type: DataTypes.STRING(200),
            allowNull: true,
        },
        description: {
            type: DataTypes.STRING(200),
            allowNull: true
        },
        roleId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
    }, {
        sequelize,
        modelName: 'UserGroup',
        tableName: 'tb_usergroup',
        timestamps: true,
        scopes: {
            withPassword: {
                attributes: { exclude: ['createdAt', 'updatedAt'] },
            },
            withPublic: {
                attributes: { exclude: ['loginAt', 'isActive', 'password', 'createdAt', 'updatedAt', 'mode', 'uniqueId'] },
            },
        }
    });
    UserGroup.associate = function (models) {

    };
    return UserGroup;
};

