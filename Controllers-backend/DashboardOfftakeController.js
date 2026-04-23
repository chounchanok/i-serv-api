const db = require("../models");
const { Sequelize, sequelize } = db; // ✅ เพิ่ม sequelize ที่ใช้ execute query

const { validation, getPagingData, getPagination } = require("../utilities/function");
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op;

async function dashboard_offtake_bk(req, res) {
    try {
        const whereConditions = [];

        // ✅ ดักค่าที่ส่งมา และสร้างเงื่อนไขการกรอง
        // if (req.body.user_code) whereConditions.push(`mps.user_code = '${req.body.user_code}'`);
        if (req.body.group_customer_id) whereConditions.push(`mps.group_customer_id = '${req.body.group_customer_id}'`);
        if (req.body.area_manager) whereConditions.push(`user.area_manager = '${req.body.area_manager}'`);
        if (req.body.area_supervisor) whereConditions.push(`user.area_supervisor = '${req.body.area_supervisor}'`);
        if (req.body.user_id) whereConditions.push(`offtake.user_id = '${req.body.user_id}'`);
        if (req.body.channel_id) whereConditions.push(`store.channel_id = '${req.body.channel_id}'`);
        if (req.body.account_id) whereConditions.push(`mps.account_id = '${req.body.account_id}'`);
        if (req.body.store_name) whereConditions.push(`store.store_name LIKE '%${req.body.store_name}%'`);
        if (req.body.provinces_id) whereConditions.push(`store.provinces_id = '${req.body.provinces_id}'`);
        if (req.body.categoryId) whereConditions.push(`prod.categoryId = '${req.body.categoryId}'`);
        if (req.body.brand_id) whereConditions.push(`prod.brand_id = '${req.body.brand_id}'`);
        if (req.body.sub_brand_id) whereConditions.push(`prod.sub_brand_id = '${req.body.sub_brand_id}'`);
        if (req.body.product_name) whereConditions.push(`prod.id = '${req.body.product_name}'`);

        // ✅ แยก `daterange` และเพิ่มเงื่อนไขวันที่
        if (req.body.daterange) {
            const [startDate, endDate] = req.body.daterange.split(" to ");
            if (startDate) {
                whereConditions.push(`DATE(offtake.datesave_start) >= '${startDate}' `);
            }
            if (endDate) {
                whereConditions.push(`DATE(offtake.datesave_end) <= '${endDate}'`);
            }
        }
        // ✅ เชื่อมเงื่อนไขทั้งหมดเข้ากับ WHERE
        const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(" AND ")}` : "";

        // ✅ ใช้ SQL Query เพื่อดึงข้อมูลทั้งหมด (เฉพาะสินค้าที่ stock = 'Y')
        // const query = `
        // SELECT 
        //     acc.id AS account_id,
        //     acc.name AS account_name,
        //     brand.id AS brand_id,
        //     brand.name AS brand_name,
        //     prod.id AS product_id,
        //     prod.name AS product_name,
        //     prod.flavor AS flavor,
        //     SUM(DISTINCT offtakelist.amount) AS total_stock

        // FROM tb_offtakelist AS offtakelist
        // LEFT JOIN tb_offtake AS offtake ON offtakelist.offtake_id = offtake.id
        // LEFT JOIN tb_map_product_store_list AS mpsl ON offtakelist.map_product_store_list_id = mpsl.id
        // LEFT JOIN tb_map_product_store AS mps ON mpsl.map_product_id = mps.id
        // LEFT JOIN tb_account AS acc ON mps.account_id = acc.id
        // LEFT JOIN tb_product AS prod ON mpsl.product_id = prod.id
        // LEFT JOIN tb_brand AS brand ON prod.brand_id = brand.id
        // LEFT JOIN tb_user AS user ON mps.user_code = user.code
        // LEFT JOIN tb_store AS store ON mps.store_code = store.store_code
        // LEFT JOIN tb_map_user_store_list AS store_list ON store.id = store_list.store_id

        // WHERE 1=1 AND mpsl.stock = 'Y'  
        // ${whereClause}
        // GROUP BY acc.id, acc.name, brand.id, brand.name, prod.id, prod.name,store.store_code
        // ORDER BY brand.id, total_stock DESC;
        // `;


        // const query = `
        // SELECT 
        //     acc.id AS account_id,
        //     acc.name AS account_name,
        //     brand.id AS brand_id,
        //     brand.name AS brand_name,
        //     prod.id AS product_id,
        //     prod.name AS product_name,
        //     MAX(prod.flavor) AS flavor,
        //     tb_offtakelist.id AS offtakelist_id,
        //     tb_offtakelist.offtake_id,
        //     tb_offtakelist.amount,
        //     tb_offtakelist.map_product_store_list_id,
        //     SUM(DISTINCT tb_offtakelist.amount) AS total_stock
        // FROM tb_offtakelist
        // LEFT JOIN tb_offtake AS offtake ON tb_offtakelist.offtake_id = offtake.id
        // LEFT JOIN tb_map_product_store_list AS mpsl ON tb_offtakelist.map_product_store_list_id = mpsl.id
        // LEFT JOIN tb_map_product_store AS mps ON mpsl.map_product_id = mps.id
        // LEFT JOIN tb_account AS acc ON mps.account_id = acc.id
        // LEFT JOIN tb_product AS prod ON mpsl.product_id = prod.id
        // LEFT JOIN tb_brand AS brand ON prod.brand_id = brand.id
        // LEFT JOIN tb_user AS user ON mps.user_code = user.code
        // LEFT JOIN tb_store AS store ON mps.store_code = store.store_code
        // LEFT JOIN tb_map_user_store_list AS store_list ON store.id = store_list.store_id
        // WHERE 1=1 AND mpsl.stock = 'Y'  
        // ${whereClause}
        // GROUP BY offtakelist_id,
        // map_product_store_list_id,
        // account_id,
        // acc.name,
        // brand_id,
        // brand.name,
        // flavor,
        // product_id,
        // prod.name,
        // tb_offtakelist.offtake_id,
        // tb_offtakelist.amount,
        // store.store_code
        // ORDER BY offtakelist_id DESC , brand.id ASC;
        // `;


        // const query = `
        // SELECT 
        //     acc.id AS account_id,
        //     acc.name AS account_name,
        //     brand.id AS brand_id,
        //     brand.name AS brand_name,
        //     prod.id AS product_id,
        //     prod.name AS product_name,
        //     prod.flavor AS flavor,
        //     tb_offtakelist.id AS offtakelist_id,
        //     tb_offtakelist.offtake_id,
        //     tb_offtakelist.amount,
        //     tb_offtakelist.map_product_store_list_id
        // FROM tb_offtakelist
        // LEFT JOIN tb_offtake AS offtake ON tb_offtakelist.offtake_id = offtake.id
        // LEFT JOIN tb_map_product_store_list AS mpsl ON tb_offtakelist.map_product_store_list_id = mpsl.id
        // LEFT JOIN tb_map_product_store AS mps ON mpsl.map_product_id = mps.id
        // LEFT JOIN tb_account AS acc ON mps.account_id = acc.id
        // LEFT JOIN tb_product AS prod ON mpsl.product_id = prod.id
        // LEFT JOIN tb_brand AS brand ON prod.brand_id = brand.id
        // LEFT JOIN tb_user AS user ON mps.user_code = user.code
        // LEFT JOIN tb_store AS store ON mps.store_code = store.store_code
        // LEFT JOIN tb_map_user_store_list AS store_list ON store.id = store_list.store_id
        // WHERE tb_offtakelist.id IN (
        //     SELECT MAX(id) 
        //     FROM tb_offtakelist 
        //     GROUP BY map_product_store_list_id
        // )
        // AND mpsl.stock = 'Y'  
        // ${whereClause}
        // ORDER BY brand.id ASC;
        // `;
        const query1 = `
        SELECT 
            product_id
        FROM tb_offtakelist
        LEFT JOIN tb_offtake AS offtake ON tb_offtakelist.offtake_id = offtake.id
        LEFT JOIN tb_map_product_store_list AS mpsl ON tb_offtakelist.map_product_store_list_id = mpsl.id
        LEFT JOIN tb_map_product_store AS mps ON mpsl.map_product_id = mps.id
        LEFT JOIN tb_account AS acc ON mps.account_id = acc.id
        LEFT JOIN tb_product AS prod ON mpsl.product_id = prod.id
        LEFT JOIN tb_brand AS brand ON prod.brand_id = brand.id
        LEFT JOIN tb_user AS user ON offtake.user_id = user.id
        LEFT JOIN tb_store AS store ON mps.store_code = store.store_code
        LEFT JOIN tb_map_user_store_list AS store_list ON store.id = store_list.store_id
        WHERE 1=1 AND mpsl.offtake = 'Y' AND prod.isActive = 'Y' AND store.isActive = 'Y'
        ${whereClause}
        GROUP BY 
        product_id
        ORDER BY brand.id ASC;
        `;
        // ✅ Execute Query
        const rawData1 = await db.sequelize.query(query1, { type: db.Sequelize.QueryTypes.SELECT });

       // ✅ ดึง `product_id` ออกมาเป็น Array
        const productIds = rawData1.map(item => item.product_id);
        const whereInClause = productIds.length ? `AND prod.id IN (${productIds.join(",")})` : "";

        const query = `
         WITH RankedProducts AS (
            SELECT 
                acc.id AS account_id,
                acc.name AS account_name,
                brand.id AS brand_id,
                brand.name AS brand_name,
                prod.id AS product_id,
                prod.name AS product_name,
                prod.flavor AS flavor,
                tb_offtakelist.id AS offtakelist_id,
                tb_offtakelist.offtake_id,
                tb_offtakelist.amount,
                tb_offtakelist.map_product_store_list_id,
                ROW_NUMBER() OVER (
                    PARTITION BY prod.id
                    ORDER BY tb_offtakelist.id DESC
                ) AS rn
            FROM tb_offtakelist
            LEFT JOIN tb_offtake AS offtake ON tb_offtakelist.offtake_id = offtake.id
            LEFT JOIN tb_map_product_store_list AS mpsl ON tb_offtakelist.map_product_store_list_id = mpsl.id
            LEFT JOIN tb_map_product_store AS mps ON mpsl.map_product_id = mps.id
            LEFT JOIN tb_account AS acc ON mps.account_id = acc.id
            LEFT JOIN tb_product AS prod ON mpsl.product_id = prod.id
            LEFT JOIN tb_brand AS brand ON prod.brand_id = brand.id
            LEFT JOIN tb_user AS user ON offtake.user_id = user.id
            LEFT JOIN tb_store AS store ON mps.store_code = store.store_code
            LEFT JOIN tb_map_user_store_list AS store_list ON store.id = store_list.store_id
            WHERE mpsl.offtake = 'Y' AND prod.isActive = 'Y' AND store.isActive = 'Y'
            AND brand.id IS NOT NULL  -- ✅ กรองเฉพาะ brand_id ที่ไม่เป็น NULL
            ${whereInClause}
            ${whereClause}
        )
        SELECT
            account_id,
            account_name,
            brand_id,
            brand_name,
            product_id,
            product_name,
            flavor,
            offtakelist_id,
            offtake_id,
            amount,
            map_product_store_list_id
        FROM RankedProducts
        WHERE rn = 1
        ORDER BY brand_id ASC;
        `;
        // ✅ Execute Query
        const rawData = await db.sequelize.query(query, { type: db.Sequelize.QueryTypes.SELECT });

        // ✅ จัดกลุ่มข้อมูลตาม `account_id`
        const groupedData = {};
        const productSummary = {}; // ✅ เก็บข้อมูลสินค้าเพื่อจัดอันดับ

        // rawData.forEach(item => {
        //     const accountId = item.account_id;
        //     const productId = item.product_id;

        //     if (!groupedData[accountId]) {
        //         groupedData[accountId] = {
        //             account_id: item.account_id,
        //             account_name: item.account_name,
        //             brands: []
        //         };
        //     }

        //     // ✅ เพิ่ม Brand เข้าไปใน Account นั้น ๆ
        //     groupedData[accountId].brands.push({
        //         brand_id: item.brand_id,
        //         brand_name: item.brand_name,
        //         total_stock: parseInt(item.total_stock) || 0
        //     });

        //     // ✅ สร้างรายการสินค้าเพื่อใช้คำนวณ Top 5 และ Less 5
        //     if (!productSummary[productId]) {
        //         productSummary[productId] = {
        //             product_id: productId,
        //             product_name: item.product_name,
        //             flavor: item.flavor,
        //             total_stock: parseInt(item.total_stock) || 0
        //         };
        //     }
        // });


        rawData.forEach(item => {
            const accountId = item.account_id;
            const brandId = item.brand_id;
            const productId = item.product_id;

            if (!groupedData[accountId]) {
                groupedData[accountId] = {
                    account_id: item.account_id,
                    account_name: item.account_name,
                    total_stock: 0,
                    brands: new Map() // ใช้ Map เพื่อป้องกันค่าซ้ำของ brand
                };
            }

            // ถ้ามี brand_id แล้ว ให้บวก total_stock เข้าไป
            if (groupedData[accountId].brands.has(brandId)) {
                const brandData = groupedData[accountId].brands.get(brandId);
                brandData.total_stock += parseInt(item.amount) || 0; // ใช้ item.amount แทน item.total_stock
                brandData.products.push({
                    product_id: item.product_id,
                    product_name: item.product_name,
                    flavor: item.flavor,
                    amount: parseInt(item.amount) || 0
                });
            } else {
                // ถ้ายังไม่มี brand_id ให้เพิ่มใหม่
                groupedData[accountId].brands.set(brandId, {
                    brand_id: item.brand_id,
                    brand_name: item.brand_name,
                    total_stock: parseInt(item.amount) || 0, // ใช้ item.amount แทน item.total_stock
                    products: [{
                        product_id: item.product_id,
                        product_name: item.product_name,
                        flavor: item.flavor,
                        amount: parseInt(item.amount) || 0
                    }]
                });
            }

            // รวม total_stock ของ Account ด้วย
            groupedData[accountId].total_stock += parseInt(item.amount) || 0; // ใช้ item.amount แทน item.total_stock

            // เก็บข้อมูลสินค้าแยกไว้ใน productSummary
            if (!productSummary[productId]) {
                productSummary[productId] = {
                    product_id: productId,
                    product_name: item.product_name,
                    flavor: item.flavor,
                    total_stock: parseInt(item.amount) || 0 // ใช้ item.amount แทน item.total_stock
                };
            } else {
                productSummary[productId].total_stock += parseInt(item.amount) || 0; // รวม total_stock ถ้ามี product_id ซ้ำ
            }
        });

        // แปลง brands จาก Map กลับเป็น Array
        Object.keys(groupedData).forEach(accountId => {
            groupedData[accountId].brands = Array.from(groupedData[accountId].brands.values());
        });

        // ✅ คำนวณ **Stock Top 5**
        const top5_stock_products = Object.values(productSummary)
            .sort((a, b) => b.total_stock - a.total_stock) // ✅ เรียงจากสินค้าที่มี stock มากสุด
            .slice(0, 5)
            .map((item, index) => ({
                rank: index + 1,
                product_name: item.product_name,
                flavor: item.flavor,
                total_stock: item.total_stock
            }));

        // ✅ คำนวณ **Stock Less 5**
        const less5_stock_products = Object.values(productSummary)
            .sort((a, b) => a.total_stock - b.total_stock) // ✅ เรียงจากสินค้าที่มี stock น้อยสุด
            .slice(0, 5)
            .map((item, index) => ({
                rank: index + 1,
                product_name: item.product_name,
                flavor: item.flavor,
                total_stock: item.total_stock
            }));

        // ✅ แปลง Object เป็น Array
        const result = Object.values(groupedData);

        // ✅ ส่งผลลัพธ์ออกไป
        res.send({
            status: "success",
            data: result,
            top5_stock_products,
            less5_stock_products,
            rawData
        });

    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
module.exports = {
    dashboard_offtake_bk,
};