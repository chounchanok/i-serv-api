'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class SubCategory extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // SubCategory.belongsTo(models.GroupCustomer, { foreignKey: 'group_customer_id', as: 'group_customer' });

            SubCategory.belongsTo(models.Category, { foreignKey: 'category_id', as: 'Category' });
            
            SubCategory.hasMany(models.Product, {
                foreignKey: 'sub_category_id',
                as: 'product',
                constraints: false, // ถ้าหาค่าไอดีไม่เจอก็ไม่ต้อง join
            });
        }
    };
    SubCategory.init({   // ตั้งชื่อตารางในฐานข้อมูล และกำหนดฟิลด์
        group_customer_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        //Category_id link to Category
        category_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'tb_category',
                key: 'id'
            }
        },

        name: {
            type: DataTypes.STRING(200),
            allowNull: false
        },
        description: {
            type: DataTypes.STRING(200),
            allowNull: true
        },
        isActive: {
            type: DataTypes.ENUM(['Y', 'N']),
            allowNull: false,
            defaultValue: 'Y'
        }


    }, {
        sequelize,
        modelName: 'SubCategory',
        tableName: 'tb_sub_category',
        timestamps: true,
        scopes: {
            active: {
                where: {
                    isActive: 'Y'
                }
            }
        }
    });
    return SubCategory;
};

