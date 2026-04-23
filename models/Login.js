'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Login extends Model {
    static associate(models) {
      // define association here
    }
  }

  Login.init(
    {
      mode: {
        type: DataTypes.STRING(10),
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      token: {
        type: DataTypes.STRING(200),
      }
    },
    {
      sequelize,
      modelName: 'Login',
      tableName: 'tb_login',
      timestamps: false,
    },
  );
  return Login;
};
