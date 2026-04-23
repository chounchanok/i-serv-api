'use strict';



const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Permission extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
        }
    };
    Permission.init({   // ตั้งชื่อตารางในฐานข้อมูล และกำหนดฟิลด์

        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true
        },

        roleId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'tb_role', // Ensure this matches the actual table name in your database
                key: 'id'
            }
        }

    }, {
        sequelize,
        modelName: 'Permission',
        tableName: 'tb_permission',
        timestamps: true,
        scopes: {

        }

    });

    return Permission;
};

