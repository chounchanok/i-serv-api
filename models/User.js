'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.GroupCustomer, {
          foreignKey: 'group_customer_id',
          as: 'groupCustomer',
      });
      User.belongsTo(models.JobPosition, {
          foreignKey: 'job_position_id',
          as: 'jobPosition',
      });
      User.belongsTo(models.Position, {
          foreignKey: 'position_id',
          as: 'position',
      });
      User.belongsTo(models.AreaSupervisor, {
          foreignKey: 'area_supervisor',
          as: 'areaSupervisor',
      });
      User.belongsTo(models.AreaManager, {
          foreignKey: 'area_manager',
          as: 'areaManager',
      });
      User.hasMany(models.Oos, {
          foreignKey: 'user_id',
          as: 'oos'
      });
      User.hasMany(models.Offtake, {
          foreignKey: 'user_id',
          as: 'offtake'
      });
      User.hasMany(models.PricePromotion, {
          foreignKey: 'user_id',
          as: 'pricePromotion'
      });
      User.hasMany(models.Week, {
          foreignKey: 'user_id',
          as: 'week'
      });
      User.hasMany(models.Compliance, {
          foreignKey: 'user_id',
          as: 'compliance'
      });
      // User.hasMany(models.MapUserStore, {
      //     foreignKey: 'user_id',
      //     as: 'mapUserStore',
      // });
    }
  };
  User.init({   // ตั้งชื่อตารางในฐานข้อมูล และกำหนดฟิลด์
    group_customer_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    code: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    prefix : {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    last_name: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    job_position_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    position_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    area_supervisor: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    area_manager: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isActive: {
      type: DataTypes.ENUM(['Y', 'N']),
      allowNull: true
    },
    token: {
      type: DataTypes.STRING(75),
      allowNull: true,
    },
    loginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    picture: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    // group_id
    groupId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    //role
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'tb_user',
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
  return User;
};

