'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Product extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            Product.belongsTo(models.GroupCustomer, {
                foreignKey: 'group_customer_id',
                as: 'groupCustomer',
            });
            Product.belongsTo(models.Category, {
                foreignKey: 'categoryId',
                as: 'category',
            });
            Product.belongsTo(models.SubCategory, {
                foreignKey: 'sub_category_id',
                as: 'subCategory',
                constraints: false, // ถ้าหาค่าไอดีไม่เจอก็ไม่ต้อง join
            });
            Product.belongsTo(models.Brand, {
                foreignKey: 'brand_id',
                as: 'brand',
            });
            Product.belongsTo(models.SubBrand, {
                foreignKey: 'sub_brand_id',
                as: 'subBrand',
            });
            Product.belongsTo(models.Competitor, {
                foreignKey: 'competitor_id',
                as: 'competitor',
            });
            Product.belongsTo(models.ProductPromotion, {
                foreignKey: 'promotion_id',
                as: 'productPromotion',
            });
            Product.hasMany(models.MapProductStoreList, {
                foreignKey: 'product_id',
                as: 'mapProductStoreList', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
            });
            Product.hasMany(models.MapStoreComplianceList, {
                foreignKey: 'product_id',
                as: 'mapStoreComplianceList', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
            });
            Product.hasMany(models.ComplianceListextra, {
                foreignKey: 'product_id',
                as: 'complianceListextra', // ตั้งชื่อ alias เพื่อให้ใช้งานได้ง่ายในภายหลัง
            });
        }
    };
    Product.init({   // ตั้งชื่อตารางในฐานข้อมูล และกำหนดฟิลด์
        group_customer_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },
        categoryId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },
        sub_category_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },
        brand_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },
        sub_brand_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },
        name: {
            type: DataTypes.STRING(200),
            allowNull: true
        },
        flavor: {
            type: DataTypes.STRING(200),
            allowNull: true
        },
        variant: {
            type: DataTypes.STRING(200),
            allowNull: true
        },
        product_size: {           
            type: DataTypes.STRING(200),
            allowNull: true
        },
        product_barcode: {
            type: DataTypes.STRING(200),
            allowNull: true
        },
        pack_size: {
            type: DataTypes.STRING(200),
            allowNull: true
        },
        unit: {
            type: DataTypes.STRING(200),
            allowNull: true
        },
        competitor_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },
        picture: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        promotion_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: 0
        },
        price: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        qty: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        

        //img_group
        imgGroupId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },

        isActive: {
            type: DataTypes.ENUM(['Y', 'N']),
            allowNull: false,
            defaultValue: 'Y',
        }


    }, {
        sequelize,
        modelName: 'Product',
        tableName: 'tb_product',
        timestamps: true,
        scopes: {
            active: {
                where: {
                    isActive: 'Y'
                }
            }
        }
    });



    
      
    return Product;
};

