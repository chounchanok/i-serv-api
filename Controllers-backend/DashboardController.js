const db = require("../models");
const { Sequelize, sequelize } = db; // ✅ เพิ่ม sequelize ที่ใช้ execute query

const { validation, getPagingData, getPagination } = require("../utilities/function");
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op;

// --- Helper Function for Error Handling ---
// สร้างฟังก์ชันกลางเพื่อจัดการ Error ทำให้โค้ดสะอาดขึ้นและแก้ไขง่ายในจุดเดียว
const handleErrors = (res, error, functionName) => {
    // 1. Log Error ทั้งหมดลง Console ของ Server เพื่อให้ Developer ตรวจสอบ
    console.error(`[ERROR in ${functionName}]: `, error);

    let errorMessage = "ไม่สามารถดำเนินการได้ในตอนนี้!";
    let errorDetails = {};

    // 2. ตรวจสอบประเภทของ Error เพื่อสร้างข้อความที่เฉพาะเจาะจงมากขึ้น
    if (error instanceof db.Sequelize.BaseError) {
        errorMessage = "เกิดข้อผิดพลาดเกี่ยวกับฐานข้อมูล";
        errorDetails = { name: error.name, message: error.message, query: error.sql };
    } else if (error instanceof TypeError) {
        errorMessage = "เกิดข้อผิดพลาดในการประมวลผลข้อมูล (TypeError)";
        errorDetails = { name: error.name, message: error.message };
    }
    // สามารถเพิ่ม else if สำหรับ Error ประเภทอื่นๆ ได้ตามต้องการ

    // 3. ส่ง Response กลับไปยัง Client
    res.status(500).send({
        status: "error",
        message: errorMessage,
        // ส่งรายละเอียดของ Error กลับไปเฉพาะตอนอยู่ใน Development Mode
        ...(process.env.NODE_ENV === 'development' && { error_details: errorDetails })
    });
};

// ฟังก์ชันสำหรับ Export Excel
async function dashboard_oos_test(req, res) {
    try {
        const whereConditions = [];

        // ✅ ดักค่าที่ส่งมา และสร้างเงื่อนไขการกรอง
        // if (req.body.user_code) whereConditions.push(`mps.user_code = '${req.body.user_code}'`);
        if (req.body.group_customer_id) whereConditions.push(`mps.group_customer_id = '${req.body.group_customer_id}'`);
        if (req.body.area_manager) whereConditions.push(`user.area_manager = '${req.body.area_manager}'`);
        if (req.body.area_supervisor) whereConditions.push(`user.area_supervisor = '${req.body.area_supervisor}'`);
        if (req.body.user_id) whereConditions.push(`oos.user_id = '${req.body.user_id}'`);
        if (req.body.channel_id) whereConditions.push(`store.channel_id = '${req.body.channel_id}'`);
        if (req.body.account_id) whereConditions.push(`mps.account_id = '${req.body.account_id}'`);
        if (req.body.store_id) whereConditions.push(`store.id = '${req.body.store_id}'`);
        if (req.body.provinces_id) whereConditions.push(`store.provinces_id = '${req.body.provinces_id}'`);
        if (req.body.categoryId) whereConditions.push(`prod.categoryId = '${req.body.categoryId}'`);
        if (req.body.brand_id) whereConditions.push(`prod.brand_id = '${req.body.brand_id}'`);
        if (req.body.sub_brand_id) whereConditions.push(`prod.sub_brand_id = '${req.body.sub_brand_id}'`);
        if (req.body.product_name) whereConditions.push(`prod.id = '${req.body.product_name}'`);

        // ✅ แยก `daterange` และเพิ่มเงื่อนไขวันที่
        if (req.body.daterange) {
            const [startDate, endDate] = req.body.daterange.split(" to ");
            if (startDate && endDate) {
                whereConditions.push(`DATE(oos.datesave) BETWEEN '${startDate}' AND '${endDate}'`);
            }
        }
        
        // ✅ เชื่อมเงื่อนไขทั้งหมดเข้ากับ WHERE
        const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(" AND ")}` : "";


        // ✅ ใช้ SQL Query เพื่อดึงข้อมูลทั้งหมด
        const query = `
            WITH RankedOOS AS (
                SELECT 
                    ooslist.id AS oos_id,
                    ooslist.map_product_store_list_id,
                    ooslist.oos_status,
                    ooslist.qty,
                    acc.id AS account_id,
                    acc.name AS account_name,
                    mpsl.msl,
                    mpsl.product_id,
                    prod.name AS product_name,
                    prod.flavor AS flavor,
                    oos.store_id,
                    store.store_name,
                    user.id AS user_id,
                    ROW_NUMBER() OVER (
                        PARTITION BY store.id, acc.name, prod.name, oos.user_id
                        ORDER BY oos.datesave DESC
                    ) as rn

                FROM tb_ooslist AS ooslist
                LEFT JOIN tb_oos AS oos ON ooslist.oos_id = oos.id
                LEFT JOIN tb_map_product_store_list AS mpsl ON ooslist.map_product_store_list_id = mpsl.id
                LEFT JOIN tb_map_product_store AS mps ON mpsl.map_product_id = mps.id
                LEFT JOIN tb_account AS acc ON mps.account_id = acc.id
                LEFT JOIN tb_product AS prod ON mpsl.product_id = prod.id
                LEFT JOIN tb_user AS user ON oos.user_id = user.id
                LEFT JOIN tb_store AS store ON oos.store_id = store.id
                WHERE 1=1 
                    AND mpsl.oos = 'Y' 
                    AND ooslist.isActive = 'Y' 
                    AND prod.isActive = 'Y' 
                    AND store.isActive = 'Y' 
                    AND ooslist.not_sell = 'N'
                    ${whereClause}
            )
            SELECT * FROM RankedOOS
            WHERE rn = 1
            ORDER BY account_id ASC;
        `;

        // ✅ Execute Query
        const rawData = await db.sequelize.query(query, { type: db.Sequelize.QueryTypes.SELECT });
        
        // ✅ ตัวแปรเก็บผลรวมทั้งหมด
        let total_oos_entries_all = 0;
        let total_oos_status_Y = 0;
        let total_oos_status_N = 0;
        let total_oos_msl_Y = 0;
        let total_oos_status_Y_msl_Y = 0;
        let total_oos_status_N_msl_Y = 0;
        
        // ✅ จัดกลุ่มข้อมูลตาม account_id และ product_id
        const groupedData = {};
        const productSummary = {};
        
        rawData.forEach(item => {
            const accountId = item.account_id;
            const productId = item.product_id;
            const storeId = item.store_id;
            // ✅ จัดกลุ่มตาม Account
            if (!groupedData[storeId]) {
                groupedData[storeId] = {
                    account_id: item.account_id,
                    account_name: item.account_name,
                    store_name: item.store_name,
                    total_oos_entries: 0,
                    total_oos_msl_Y: 0,
                    total_oos_status_Y: 0,
                    total_oos_status_N: 0,
                    total_oos_status_Y_msl_Y: 0,
                    total_oos_status_N_msl_Y: 0,
                    msl_oos_percentage: 0, // ✅ เพิ่มการคำนวณ MSL OOS % ต่อ Account
                    msl_osa_percentage: 0, // ✅ เพิ่มการคำนวณ MSL OSA % ต่อ Account
                    oos_percentage: 0,
                    osa_percentage: 0,
                    oos_items: []
                };
            }

            // ✅ เพิ่มจำนวนสินค้า OOS ในบัญชี
            groupedData[storeId].total_oos_entries += 1;
            total_oos_entries_all += 1;

            // ✅ นับ oos_status=Y
            if (item.oos_status === 'Y') {
                groupedData[storeId].total_oos_status_Y += 1;
                total_oos_status_Y += 1;
            }

            // ✅ นับ oos_status=N
            if (item.oos_status === 'N') {
                groupedData[storeId].total_oos_status_N += 1;
                total_oos_status_N += 1;
            }

            // ✅ แยกนับ MSL=Y
            if (item.msl === 'Y') {
                groupedData[storeId].total_oos_msl_Y += 1;
                total_oos_msl_Y += 1;
            }

            // ✅ นับ MSL=Y และ oos_status=Y
            if (item.msl === 'Y' && item.oos_status === 'Y') {
                groupedData[storeId].total_oos_status_Y_msl_Y += 1;
                total_oos_status_Y_msl_Y += 1;
            }

            // ✅ นับ MSL=Y และ oos_status=N
            if (item.msl === 'Y' && item.oos_status === 'N') {
                groupedData[storeId].total_oos_status_N_msl_Y += 1;
                total_oos_status_N_msl_Y += 1;
            }

            // ✅ เพิ่มสินค้า OOS ในบัญชี
            // groupedData[storeId].oos_items.push({
            //     oos_id: item.oos_id,
            //     map_product_store_list_id: item.map_product_store_list_id,
            //     oos_status: item.oos_status,
            //     msl: item.msl,
            //     qty: item.qty
            // });

            // ✅ จัดกลุ่มตาม Product เพื่อหาสินค้าที่มี % OOS สูงสุด
            if (!productSummary[productId]) {
                productSummary[productId] = {
                    product_id: productId,
                    product_name: item.product_name,
                    flavor: item.flavor,
                    total_oos_Y: 0,
                    total_oos_entries: 0
                };
            }

            productSummary[productId].total_oos_entries += 1;
            if (item.oos_status === 'Y') {
                productSummary[productId].total_oos_Y += 1;
            }
        });
        
        let total_percent = 0;
        const accountMap = new Map();
        Object.values(groupedData).forEach(item => {
            if (item.total_oos_entries > 0) {
                item.oos_percentage = Math.round((item.total_oos_status_Y / item.total_oos_entries) * 100);
                item.osa_percentage = Math.round((item.total_oos_status_N / item.total_oos_entries) * 100);
            }

            if (item.total_oos_msl_Y > 0) {
                item.msl_oos_percentage = Math.round((item.total_oos_status_Y_msl_Y / item.total_oos_msl_Y) * 100);
                item.msl_osa_percentage = Math.round((item.total_oos_status_N_msl_Y / item.total_oos_msl_Y) * 100);
            }

            // ✅ รวมยอดต่อ account_id
            if (!accountMap.has(item.account_id)) {
                accountMap.set(item.account_id, {
                    name: item.account_name,
                    total_oos_entries: item.total_oos_entries,
                    total_oos_status_Y: parseFloat(item.total_oos_status_Y) + parseFloat(item.total_oos_status_Y_msl_Y),
                    oos_percentage: item.oos_percentage,
                });
            } else {
                const acc = accountMap.get(item.account_id);
                acc.total_oos_entries += item.total_oos_entries;
                acc.total_oos_status_Y += parseFloat(item.total_oos_status_Y) + parseFloat(item.total_oos_status_Y_msl_Y);
                acc.oos_percentage += parseFloat(item.oos_percentage);
                accountMap.set(item.account_id, acc);
            }
            total_percent += item.total_oos_status_Y;
        });
        const account_names = [];
        const oos_percentages = [];
        const value_oos_percentage = [];
        const value_total_percent = [];

        accountMap.forEach((value) => {
            account_names.push(value.name);
            oos_percentages.push(Math.round((value.total_oos_status_Y / total_percent) * 100 ));
            value_oos_percentage.push(value.total_oos_status_Y);
            value_total_percent.push(total_percent);
        });

        // ✅ คำนวณ % OOS ของแต่ละสินค้า และจัดอันดับ Top 5
        const top5_oos_products = Object.values(productSummary)
            .map(product => ({
                ...product,
                oos_percentage: product.total_oos_Y > 0
                    ? Math.round((product.total_oos_Y / total_percent) * 100)
                    : 0
            }))
            .sort((a, b) => b.total_oos_Y  - a.total_oos_Y )
            .slice(0, 5);

        // ✅ คำนวณค่า MSL OOS % และ MSL OSA % รวมทั้งหมด
        const msl_oos_percentage = total_oos_msl_Y > 0
            ? Math.round((total_oos_status_Y_msl_Y / total_oos_msl_Y) * 100) : 0;
        const msl_osa_percentage = total_oos_msl_Y > 0
            ? Math.round((total_oos_status_N_msl_Y / total_oos_msl_Y) * 100) : 0;

        const account_oos_data = [];

        accountMap.forEach((value, _, indexMap) => {
            const percentage = value.total_oos_status_Y;

            account_oos_data.push({
                title: value.name,
                value: Math.round((percentage / total_percent) * 100),
                color: ['primary', 'info', 'success', 'secondary', 'error', 'warning'][account_oos_data.length % 6]
            });
        });

        // ✅ คำนวณค่า **Top 5 OOS Stores**
        const top5_oos_stores = Object.values(groupedData)
            .sort((a, b) => b.total_oos_status_Y  - a.total_oos_status_Y )
            .slice(0, 5)
            .map((item, index) => ({
                rank: index + 1,
                account_name: item.account_name,
                store_name: item.store_name,
                oos_percentage: `${Math.round((item.total_oos_status_Y / total_percent) * 100)}%`
            }));
            
        // ✅ ส่งผลลัพธ์ออกไป
        res.send({
            status: "success",
            data: Object.values(groupedData),
            total_oos_percentage: Math.round((total_oos_status_Y / total_oos_entries_all) * 100),
            total_osa_percentage: Math.round((total_oos_status_N / total_oos_entries_all) * 100),
            msl_oos_percentage,
            msl_osa_percentage,
            top5_oos_products,
            top5_oos_stores,
            account_names,
            oos_percentages,
            value_oos_percentage,
            value_total_percent,
            total_percent,
            account_oos_data
        });

    } catch (err) {
        handleErrors(res, err, 'dashboard_oos_test');
    }
}
async function dashboard_oos(req, res) {
    try {
        const { user_code } = req.body;
        const whereUserCode = user_code ? `WHERE mpsl.oos = 'Y' AND  mps.user_code = '${user_code}'` : "";

        // ✅ ใช้ SQL Query โดยตรงเพื่อความเร็ว
        const query = `
        SELECT 
            acc.id AS account_id, 
            acc.name AS account_name,
            prod.name AS product_name,
            mpsl.msl AS product_msl,
            COUNT(DISTINCT oos.id) AS total_oos_products,
            COALESCE(SUM(CASE WHEN oos.oos_status = 'N' THEN 1 ELSE 0 END), 0) AS oos_status_N,
            COALESCE(SUM(CASE WHEN oos.oos_status = 'Y' THEN 1 ELSE 0 END), 0) AS oos_status_Y
        FROM tb_ooslist AS oos
        LEFT JOIN tb_map_product_store_list AS mpsl ON oos.map_product_store_list_id = mpsl.id
        LEFT JOIN tb_map_product_store AS mps ON mpsl.map_product_id = mps.id
        LEFT JOIN tb_account AS acc ON mps.account_id = acc.id
        LEFT JOIN tb_product AS prod ON mpsl.product_id = prod.id
        LEFT JOIN tb_store AS store ON mps.store_code = store.store_code
        ${whereUserCode} AND prod.isActive = 'Y' AND store.isActive = 'Y'
        GROUP BY acc.id, acc.name, prod.id, prod.name
        ORDER BY total_oos_products DESC;
        `;

        // ✅ Execute Query
        const rawData = await db.sequelize.query(query, { type: Sequelize.QueryTypes.SELECT });

        // ✅ จัดกลุ่มข้อมูลตาม `account_id`
        const groupedData = {};
        const productSummary = {};

        rawData.forEach(item => {
            const key = item.account_id;

            if (!groupedData[key]) {
                groupedData[key] = {
                    account_id: item.account_id,
                    account_name: item.account_name,
                    total_oos_products: 0,
                    oos_status_N: 0,
                    oos_status_Y: 0,
                    products: []
                };
            }

            // ✅ แปลงค่าให้เป็นตัวเลขก่อนคำนวณ
            groupedData[key].total_oos_products += Number(item.total_oos_products);
            groupedData[key].oos_status_N += Number(item.oos_status_N);
            groupedData[key].oos_status_Y += Number(item.oos_status_Y);

            // ✅ เก็บรายการสินค้าโดยไม่ซ้ำ
            if (!groupedData[key].products.includes(item.product_name)) {
                groupedData[key].products.push(item.product_name);
            }

            // ✅ รวมข้อมูลสินค้าเพื่อคำนวณ `top5_oos_products`
            if (!productSummary[item.product_name]) {
                productSummary[item.product_name] = {
                    product_name: item.product_name,
                    total_oos_Y: 0,
                    total_oos_products: 0
                };
            }
            productSummary[item.product_name].total_oos_Y += Number(item.oos_status_Y);
            productSummary[item.product_name].total_oos_products += Number(item.total_oos_products);
        });

        // ✅ คำนวณค่า OOS %
        const data = Object.values(groupedData).map(item => ({
            ...item,
            oos_percentage: item.total_oos_products > 0
                ? ((item.oos_status_Y / item.total_oos_products) * 100).toFixed(2)
                : "0"
        }));

        // ✅ คำนวณค่า **Top 5 OOS Products**
        const top5_oos_products = Object.values(productSummary)
            .sort((a, b) => b.total_oos_Y - a.total_oos_Y)
            .slice(0, 5)
            .map((item, index) => ({
                rank: index + 1,
                product_name: item.product_name,
                oos_percentage: item.total_oos_products > 0 && item.total_oos_Y > 0
                    ? `${((item.total_oos_Y / item.total_oos_products) * 100).toFixed(2)}%`
                    : "0%"
            }));

        // ✅ คำนวณค่า **Top 5 OOS Stores**
        const top5_oos_stores = data
            .sort((a, b) => b.total_oos_products - a.total_oos_products)
            .slice(0, 5)
            .map((item, index) => ({
                rank: index + 1,
                store_name: item.account_name,
                oos_percentage: `${item.oos_percentage}%`
            }));

        // ✅ คำนวณค่า `oos_summary`
        const total_oos = data.reduce((sum, item) => sum + item.total_oos_products, 0);
        const total_oos_Y = data.reduce((sum, item) => sum + item.oos_status_Y, 0);
        const oos_percentage = total_oos > 0 ? ((total_oos_Y / total_oos) * 100).toFixed(2) : "0";

        const oos_summary = {
            oos_percentage: `${oos_percentage}%`,
            osa_percentage: `${(100 - parseFloat(oos_percentage)).toFixed(2)}%`,
            msl_oos_percentage: `${(parseFloat(oos_percentage) * 0.8).toFixed(2)}%`,
            msl_osa_percentage: `${(100 - parseFloat(oos_percentage) * 0.8).toFixed(2)}%`
        };

        // ✅ **ส่งค่าไปที่ Vue.js**
        const topicsData = data.map((item, index) => ({
            title: item.account_name,
            value: parseFloat(item.oos_percentage),
            color: ['primary', 'info', 'success', 'secondary', 'error', 'warning'][index % 6] // วนสี
        })).slice(0, 6); // เอาแค่ 6 อันดับแรก

        const topicsChartConfig = {
            labels: topicsData.map(d => d.title),
            xaxis: {
                categories: topicsData.map(d => d.value.toString())
            }
        };

        res.json({
            status: "success",
            data: {
                graph: data,
                top5_oos_products,
                top5_oos_stores,
                oos_summary,
                topicsData,
                topicsChartConfig
            }
        });
    } catch (err) {
        handleErrors(res, err, 'dashboard_oos');
    }
}
async function dashboard_oos_bk(req, res) {
    try {
        const whereConditions = {};
        if (req.body.user_code) whereConditions.user_code = req.body.user_code;
        // ดึงข้อมูลสินค้า OOS และทำการ JOIN
        const data = await db.OosList.findAll({
            attributes: [
                'id',
                'map_product_store_list_id',
            ],
            include: [
                {
                    model: db.MapProductStoreList,
                    as: 'mapProductStoreList',
                    attributes: ['id', 'map_product_id'],
                    where: { oos: 'Y' },
                    include: [
                        {
                            model: db.MapProductStore,
                            as: 'mapProductStore',
                            attributes: ['id', 'account_id'],
                            where: whereConditions,
                            include: [
                                {
                                    model: db.Account,
                                    as: 'account',
                                    attributes: ['id', 'name']
                                }
                            ]
                        }
                    ]
                }
            ],
            raw: true,
            nest: true
        });

        // จัดกลุ่มตาม account และคำนวณจำนวนสินค้าที่อยู่ใน OOS
        const groupedData = {};

        data.forEach(item => {
            const accountId = item.mapProductStoreList.mapProductStore.account_id;
            const accountName = item.mapProductStoreList.mapProductStore.account ? item.mapProductStoreList.mapProductStore.account.name : 'Unknown';

            if (!groupedData[accountId]) {
                groupedData[accountId] = {
                    account_id: accountId,
                    account_name: accountName,
                    total_oos_products: 0,
                };
            }

            groupedData[accountId].total_oos_products++;
        });

        // แปลง Object เป็น Array
        const result = Object.values(groupedData);

        res.json({
            status: "success",
            data: result,
        });
    } catch (err) {
        handleErrors(res, err, 'dashboard_oos_bk');
    }
}
async function dashboard_stock_test(req, res) {
    try {
        const whereConditions = [];

        // --- ส่วนสร้างเงื่อนไข WHERE (เหมือนเดิม) ---
        if (req.body.group_customer_id) whereConditions.push(`mps.group_customer_id = '${req.body.group_customer_id}'`);
        if (req.body.area_manager) whereConditions.push(`user.area_manager = '${req.body.area_manager}'`);
        if (req.body.area_supervisor) whereConditions.push(`user.area_supervisor = '${req.body.area_supervisor}'`);
        if (req.body.user_id) whereConditions.push(`oos.user_id = '${req.body.user_id}'`);
        if (req.body.channel_id) whereConditions.push(`store.channel_id = '${req.body.channel_id}'`);
        if (req.body.account_id) whereConditions.push(`mps.account_id = '${req.body.account_id}'`);
        if (req.body.store_name) whereConditions.push(`store.store_name LIKE '%${req.body.store_name}%'`);
        if (req.body.provinces_id) whereConditions.push(`store.provinces_id = '${req.body.provinces_id}'`);
        if (req.body.categoryId) whereConditions.push(`prod.categoryId = '${req.body.categoryId}'`);
        if (req.body.brand_id) whereConditions.push(`prod.brand_id = '${req.body.brand_id}'`);
        if (req.body.sub_brand_id) whereConditions.push(`prod.sub_brand_id = '${req.body.sub_brand_id}'`);
        if (req.body.product_name) whereConditions.push(`prod.id = '${req.body.product_name}'`);
        if (req.body.daterange) {
            const [startDate, endDate] = req.body.daterange.split(" to ");
            if (startDate && endDate) {
                whereConditions.push(`DATE(oos.datesave) BETWEEN '${startDate}' AND '${endDate}'`);
            }
        }
        const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(" AND ")}` : "";

        // ✅ [แก้ไข] ปรับ Query ทั้งหมดให้ใช้ตรรกะเดียวกับ Export ที่ถูกต้อง
        const query = `
            WITH RankedOOS AS (
                SELECT 
                    ooslist.id AS ooslist_id,
                    store.id AS store_id,
                    acc.id AS account_id,
                    acc.name AS account_name,
                    brand.id AS brand_id,
                    brand.name AS brand_name,
                    prod.id AS product_id,
                    prod.name AS product_name,
                    prod.flavor AS flavor,
                    ooslist.qty AS qty,
                    mpsl.id AS map_product_store_list_id,
                    ROW_NUMBER() OVER(
                        PARTITION BY store.id, acc.name, prod.name, oos.user_id 
                        ORDER BY oos.datesave DESC
                    ) as rn
                FROM tb_ooslist AS ooslist
                LEFT JOIN tb_oos oos ON ooslist.oos_id = oos.id
                LEFT JOIN tb_store store ON oos.store_id = store.id
                LEFT JOIN tb_map_product_store_list mpsl ON ooslist.map_product_store_list_id = mpsl.id
                LEFT JOIN tb_product prod ON mpsl.product_id = prod.id
                LEFT JOIN tb_brand brand ON prod.brand_id = brand.id
                LEFT JOIN tb_map_product_store mps ON mpsl.map_product_id = mps.id
                
                -- ✅ 1. แก้ไข JOIN ให้ตรงกับ Export
                LEFT JOIN tb_account acc ON mps.account_id = acc.id
                
                LEFT JOIN tb_user user ON oos.user_id = user.id
                WHERE 
                    mpsl.isActive = 'Y' 
                    AND (mpsl.oos = 'Y' OR mpsl.stock = 'Y')
                    ${whereClause}
            )
            SELECT * FROM RankedOOS WHERE rn = 1 AND qty > 0 ORDER BY account_id ASC;
        `;

        // --- ส่วนที่เหลือของโค้ดเหมือนเดิมทั้งหมด ---
        const rawData = await db.sequelize.query(query, { type: db.Sequelize.QueryTypes.SELECT });

        const groupedData = {};
        const productSummary = {};
        const brandSummary = {};
        
        rawData.forEach(item => {
            const { account_id, account_name, store_id, brand_id, brand_name, product_id, product_name, flavor, qty, ooslist_id, map_product_store_list_id } = item;
        
            if (!groupedData[account_id]) {
                groupedData[account_id] = { account_id, account_name, total_stock: 0, brands: [] };
            }
            groupedData[account_id].total_stock += qty;
        
            let brandInAccount = groupedData[account_id].brands.find(b => b.brand_id === brand_id);
            if (brandInAccount) {
                brandInAccount.total_stock += qty;
            } else {
                groupedData[account_id].brands.push({ brand_id, brand_name, total_stock: qty });
            }
        
            if (!brandSummary[product_id]) {
                brandSummary[product_id] = { product_id, product_name, flavor, brand_id, brand_name, total_stock: 0, total_products: new Set(), total_ooslists: new Set() };
            }
            brandSummary[product_id].total_stock += qty;
            brandSummary[product_id].total_products.add(product_id);
            brandSummary[product_id].total_ooslists.add(ooslist_id);
        
            if (!productSummary[product_id]) {
                productSummary[product_id] = { product_id, product_name, flavor, total_stock: 0, brand_id, brand_name };
            }
            productSummary[product_id].total_stock += qty;
        });

        Object.values(groupedData).forEach(account => {
            account.brands.sort((a, b) => a.brand_id - b.brand_id);
        });

        const top5_stock_products = Object.values(brandSummary)
            .sort((a, b) => b.total_stock - a.total_stock)
            .slice(0, 5)
            .map((item, index) => ({
                rank: index + 1,
                brand_name: item.brand_name,
                brand_id: item.brand_id,
                product_name: item.product_name,
                flavor: item.flavor,
                product_id: item.product_id,
                total_stock: item.total_stock,
                total_products: item.total_products.size,
                total_ooslists: item.total_ooslists.size
            }));

        const less5_stock_products = Object.values(brandSummary)
            .sort((a, b) => a.total_stock - b.total_stock)
            .slice(0, 5)
            .map((item, index) => ({
                rank: index + 1,
                brand_name: item.brand_name,
                brand_id: item.brand_id,
                product_name: item.product_name,
                flavor: item.flavor,
                product_id: item.product_id,
                total_stock: item.total_stock
            }));

        const result = Object.values(groupedData);

        res.send({
            status: "success",
            data: result,
            top5_stock_products,
            less5_stock_products,
            query,
            rawData
        });

    } catch (err) {
        handleErrors(res, err, 'dashboard_stock_test');
    }
}
async function dashboard_stock_test_bk(req, res) {
    try {
        const whereConditions = [];

        if (req.body.group_customer_id) whereConditions.push(`mps.group_customer_id = '${req.body.group_customer_id}'`);
        if (req.body.area_manager) whereConditions.push(`user.area_manager = '${req.body.area_manager}'`);
        if (req.body.area_supervisor) whereConditions.push(`user.area_supervisor = '${req.body.area_supervisor}'`);
        if (req.body.user_id) whereConditions.push(`oos.user_id = '${req.body.user_id}'`);
        if (req.body.channel_id) whereConditions.push(`store.channel_id = '${req.body.channel_id}'`);
        if (req.body.account_id) whereConditions.push(`mps.account_id = '${req.body.account_id}'`);
        if (req.body.store_name) whereConditions.push(`store.store_name LIKE '%${req.body.store_name}%'`);
        if (req.body.provinces_id) whereConditions.push(`store.provinces_id = '${req.body.provinces_id}'`);
        if (req.body.categoryId) whereConditions.push(`prod.categoryId = '${req.body.categoryId}'`);
        if (req.body.brand_id) whereConditions.push(`prod.brand_id = '${req.body.brand_id}'`);
        if (req.body.sub_brand_id) whereConditions.push(`prod.sub_brand_id = '${req.body.sub_brand_id}'`);
        if (req.body.product_name) whereConditions.push(`prod.id = '${req.body.product_name}'`);

        if (req.body.daterange) {
            const [startDate, endDate] = req.body.daterange.split(" to ");
            if (startDate && endDate) {
                whereConditions.push(`DATE(oos.datesave) BETWEEN '${startDate}' AND '${endDate}'`);
            }
        }
        
        const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(" AND ")}` : "";

        const query = `
        SELECT 
            acc.id AS account_id,
            acc.name AS account_name,
            brand.id AS brand_id,
            brand.name AS brand_name,
            prod.id AS product_id,
            prod.name AS product_name,
            prod.flavor AS flavor,
            tb_ooslist.id AS ooslist_id,
            tb_ooslist.oos_id,
            tb_ooslist.qty,
            tb_ooslist.map_product_store_list_id,
            SUM(DISTINCT tb_ooslist.qty) AS total_stock
        FROM tb_ooslist
        LEFT JOIN tb_oos AS oos ON tb_ooslist.oos_id = oos.id
        LEFT JOIN tb_map_product_store_list AS mpsl ON tb_ooslist.map_product_store_list_id = mpsl.id
        LEFT JOIN tb_map_product_store AS mps ON mpsl.map_product_id = mps.id
        LEFT JOIN tb_account AS acc ON mps.account_id = acc.id
        LEFT JOIN tb_product AS prod ON mpsl.product_id = prod.id
        LEFT JOIN tb_brand AS brand ON prod.brand_id = brand.id
        LEFT JOIN tb_user AS user ON oos.user_id = user.id
        LEFT JOIN tb_store AS store ON mps.store_code = store.store_code
        LEFT JOIN tb_map_user_store_list AS store_list ON store.id = store_list.store_id
        WHERE 1=1 
        AND mpsl.stock = 'Y' AND prod.isActive = 'Y' AND store.isActive = 'Y'  
        AND brand.id IS NOT NULL 
        ${whereClause}
        GROUP BY 
            ooslist_id,
            map_product_store_list_id,
            acc.id, 
            acc.name, 
            brand.id, 
            brand.name, 
            prod.id, 
            prod.name,
            tb_ooslist.oos_id,
            tb_ooslist.qty,
            store.store_code
        ORDER BY 
            ooslist_id DESC, 
            brand.id ASC;
        `;

        const rawData = await db.sequelize.query(query, { type: db.Sequelize.QueryTypes.SELECT });

        const groupedData = {};
        const productSummary = {};
        const uniqueMapProductStoreList = new Set();
        const brandSummary = {};

        rawData.forEach(item => {
            const accountId = item.account_id;
            const productId = item.product_id;
            const brandId = item.brand_id;
            const oosId = item.oos_id;
            const mapProductStoreListId = item.map_product_store_list_id;
            
            const uniqueKey = `${accountId}-${brandId}-${productId}-${mapProductStoreListId}`;

            if (uniqueMapProductStoreList.has(uniqueKey)) return;
            uniqueMapProductStoreList.add(uniqueKey);
            
            if (!brandSummary[productId]) {
                brandSummary[productId] = {
                    product_id: productId,
                    product_name: item.product_name,
                    flavor: item.flavor,
                    brand_id: brandId,
                    brand_name: item.brand_name,
                    total_stock: 0,
                    total_stockx: '',
                    total_products: new Set(),
                    total_ooslists: new Set()
                };
            }
            brandSummary[productId].total_products.add(productId);
            brandSummary[productId].total_ooslists.add(oosId);
            brandSummary[productId].total_stock += item.qty || 0;
            brandSummary[productId].total_stockx += item.qty + ',';
            
            if (!groupedData[accountId]) {
                groupedData[accountId] = {
                    account_id: item.account_id,
                    account_name: item.account_name,
                    total_stock: 0,
                    brands: []
                };
            }
            groupedData[accountId].total_stock += item.qty || 0;

            let existingBrand = groupedData[accountId].brands.find(b => b.brand_id === brandId);
            if (existingBrand) {
                existingBrand.total_stock += item.qty || 0;
            } else {
                groupedData[accountId].brands.push({
                    brand_id: item.brand_id,
                    brand_name: item.brand_name,
                    total_stock: item.qty || 0
                });
            }
            
            if (!productSummary[productId]) {
                productSummary[productId] = {
                    product_id: productId,
                    product_name: item.product_name,
                    flavor: item.flavor,
                    total_stock: item.qty || 0,
                    brand_id: item.brand_id,
                    brand_name: item.brand_name
                };
            } else {
                productSummary[productId].total_stock += item.qty || 0;
            }
        });

        Object.values(groupedData).forEach(account => {
            account.brands.sort((a, b) => a.brand_id - b.brand_id);
        });

        const top5_stock_products = Object.values(brandSummary)
            .sort((a, b) => b.total_stock - a.total_stock)
            .slice(0, 5)
            .map((item, index) => ({
                rank: index + 1,
                brand_name: item.brand_name,
                brand_id: item.brand_id,
                product_name: item.product_name,
                flavor: item.flavor,
                product_id: item.product_id,
                total_stock: item.total_stock,
                total_stockx: item.total_stockx,
                total_products: item.total_products.size,
                total_ooslists: item.total_ooslists.size
            }));

        const less5_stock_products = Object.values(productSummary)
            .sort((a, b) => a.total_stock - b.total_stock)
            .slice(0, 5)
            .map((item, index) => ({
                rank: index + 1,
                brand_name: item.brand_name,
                brand_id: item.brand_id,
                product_name: item.product_name,
                flavor: item.flavor,
                product_id: item.product_id,
                total_stock: item.total_stock,
                total_stockx: item.total_stockx
            }));

        const result = Object.values(groupedData);

        res.send({
            status: "success",
            data: result,
            top5_stock_products,
            less5_stock_products,
            query,
            rawData
        });

    } catch (err) {
        handleErrors(res, err, 'dashboard_stock_test_bk');
    }
}
async function dashboard_premium_test(req, res) {
    console.time('dashboard_premium_test_execution');

    try {
        const replacements = {};
        const whereConditions = [];

        // --- ส่วนสร้างเงื่อนไข WHERE (เหมือนเดิม) ---
        if (req.body.group_customer_id) {
            whereConditions.push(`mps.group_customer_id = :group_customer_id`);
            replacements.group_customer_id = req.body.group_customer_id;
        }
        if (req.body.area_manager) {
            whereConditions.push(`user.area_manager = :area_manager`);
            replacements.area_manager = req.body.area_manager;
        }
        if (req.body.user_id) {
            whereConditions.push(`pricepromotion.user_id = :user_id`);
            replacements.user_id = req.body.user_id;
        }
        if (req.body.store_name) {
            whereConditions.push(`store.store_name LIKE :store_name`);
            replacements.store_name = `%${req.body.store_name}%`;
        }
        if (req.body.daterange && typeof req.body.daterange === 'string') {
            const dates = req.body.daterange.split(" to ");
            if (dates.length === 2) {
                const [startDate, endDate] = dates;
                whereConditions.push(`DATE(pricepromotion.datesave) BETWEEN :startDate AND :endDate`);
                replacements.startDate = startDate;
                replacements.endDate = endDate;
            }
        }
        if (req.body.product_id) {
            whereConditions.push(`prod.id LIKE :product_id`);
            replacements.product_id = req.body.product_id;
        }
        
        const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(" AND ")}` : "";

        // --- Pagination (เหมือนเดิม) ---
        const page = parseInt(req.body.page, 10) || 1;
        const limit = parseInt(req.body.limit, 10) || 50;
        const offset = (page - 1) * limit;

        replacements.limit = limit;
        replacements.offset = offset;

        // ✅ [แก้ไข] ย้ายสูตร HAVING มาไว้ใน JavaScript เพื่อความชัดเจน
        const havingCondition = `
            (
                SUM(COALESCE(T.stock4, 0)) + 
                SUM(COALESCE(T.qty_out, 0)) +
                SUM(COALESCE(T.qty_out2, 0)) +
                SUM(COALESCE(T.qty_out3, 0)) +
                SUM(COALESCE(T.qty_out4, 0))
            ) > 0
        `;

        // ✅ [แก้ไข] สร้าง CTE สำหรับกรองข้อมูลที่ไม่ซ้ำก่อน
        const cteQuery = `
            WITH UniquePricePromotionList AS (
                SELECT 
                    -- ✅ [แก้ไข] ระบุชื่อคอลัมน์ที่ต้องการแบบเจาะจงเพื่อแก้ปัญหา Ambiguous Column
                    pricepromotionlist.qty_start, pricepromotionlist.qty_in, pricepromotionlist.qty_out, pricepromotionlist.stock,
                    pricepromotionlist.qty_start2, pricepromotionlist.qty_in2, pricepromotionlist.qty_out2, pricepromotionlist.stock2,
                    pricepromotionlist.qty_start3, pricepromotionlist.qty_in3, pricepromotionlist.qty_out3, pricepromotionlist.stock3,
                    pricepromotionlist.qty_start4, pricepromotionlist.qty_in4, pricepromotionlist.qty_out4, pricepromotionlist.stock4,

                    prod.id AS product_id,
                    prod.name AS product_name,
                    prod.promotion_id,
                    ROW_NUMBER() OVER (PARTITION BY user.code, store.store_code, mps.account_type_id, prod.name ORDER BY pricepromotion.datesave DESC) as rn
                FROM tb_pricepromotionlist AS pricepromotionlist
                LEFT JOIN tb_pricepromotion AS pricepromotion ON pricepromotionlist.pricepromotion_id = pricepromotion.id
                LEFT JOIN tb_map_product_store_list AS mpsl ON pricepromotionlist.map_product_store_list_id = mpsl.id
                LEFT JOIN tb_map_product_store AS mps ON mpsl.map_product_id = mps.id
                LEFT JOIN tb_product AS prod ON mpsl.product_id = prod.id
                LEFT JOIN tb_user AS user ON pricepromotion.user_id = user.id
                LEFT JOIN tb_store AS store ON pricepromotion.store_id = store.id
                LEFT JOIN tb_account_type AS acct ON mps.account_type_id = acct.id
                WHERE 
                    mpsl.price = 'Y' AND prod.promotion_id IN ('1', '2', '3')
                    ${whereClause}
            )
        `;

        // ✅ [แก้ไข] สร้าง mainQuery ใหม่โดยอ้างอิงจาก CTE
        const mainQuery = `
            ${cteQuery}
            SELECT 
                T.promotion_id,
                T.product_id,
                T.product_name,
                SUM(COALESCE(T.qty_start, 0)) AS qty_start_w1,
                SUM(COALESCE(T.qty_in, 0)) AS qty_in_w1,
                SUM(COALESCE(T.qty_out, 0)) AS qty_out_w1,
                SUM(COALESCE(T.stock, 0)) AS stock_w1,
                SUM(COALESCE(T.qty_start2, 0)) AS qty_start_w2,
                SUM(COALESCE(T.qty_in2, 0)) AS qty_in_w2,
                SUM(COALESCE(T.qty_out2, 0)) AS qty_out_w2,
                SUM(COALESCE(T.stock2, 0)) AS stock_w2,
                SUM(COALESCE(T.qty_start3, 0)) AS qty_start_w3,
                SUM(COALESCE(T.qty_in3, 0)) AS qty_in_w3,
                SUM(COALESCE(T.qty_out3, 0)) AS qty_out_w3,
                SUM(COALESCE(T.stock3, 0)) AS stock_w3,
                SUM(COALESCE(T.qty_start4, 0)) AS qty_start_w4,
                SUM(COALESCE(T.qty_in4, 0)) AS qty_in_w4,
                SUM(COALESCE(T.qty_out4, 0)) AS qty_out_w4,
                SUM(COALESCE(T.stock4, 0)) AS stock_w4
            FROM UniquePricePromotionList AS T
            WHERE T.rn = 1 -- << เลือกเฉพาะข้อมูลที่ไม่ซ้ำ
            GROUP BY 
                T.promotion_id, T.product_id, T.product_name
            HAVING ${havingCondition}
            ORDER BY 
                T.promotion_id ASC, T.product_id ASC
            LIMIT :limit OFFSET :offset;
        `;

        // ✅ [แก้ไข] สร้าง countQuery ใหม่โดยอ้างอิงจาก CTE เช่นกันเพื่อให้ได้ยอดรวมที่ถูกต้อง
        const countQuery = `
            ${cteQuery}
            SELECT COUNT(*) as totalItems
            FROM (
                SELECT T.product_id
                FROM UniquePricePromotionList AS T
                WHERE T.rn = 1 -- << เลือกเฉพาะข้อมูลที่ไม่ซ้ำ
                GROUP BY T.promotion_id, T.product_id, T.product_name
                HAVING ${havingCondition}
            ) AS subquery;
        `;
        
        // --- ส่วนที่เหลือของโค้ดเหมือนเดิม ---
        console.time('db_queries');
        const [results, countResult] = await Promise.all([
            db.sequelize.query(mainQuery, { replacements: replacements, type: db.Sequelize.QueryTypes.SELECT }),
            db.sequelize.query(countQuery, { replacements: replacements, type: db.Sequelize.QueryTypes.SELECT })
        ]);
        console.timeEnd('db_queries');

        const totalItems = countResult[0].totalItems;

        const data1 = [], data2 = [], data3 = [];
        for (const item of results) {
            item.sum_qty_out = parseFloat(item.qty_out_w1 || 0) + parseFloat(item.qty_out_w2 || 0) + parseFloat(item.qty_out_w3 || 0) + parseFloat(item.qty_out_w4 || 0);
            item.last_stock_w4 = parseFloat(item.stock_w4 || 0);
            item.sum_qty_in = parseFloat(item.last_stock_w4 + item.sum_qty_out);
            item.all_sum = parseFloat(item.last_stock_w4 + item.sum_qty_out);
            item.percent = parseFloat(item.all_sum > 0 ? (item.sum_qty_out / item.all_sum) * 100 : 0);
            item.percent2 = parseFloat(item.all_sum > 0 ? (item.last_stock_w4 / item.all_sum) * 100 : 0);
            
            if (String(item.promotion_id) === '1') {
                data1.push(item);
            } else if (String(item.promotion_id) === '2') {
                data2.push(item);
            } else if (String(item.promotion_id) === '3') {
                data3.push(item);
            }
        }
        
        res.send({
            status: "success",
            data: data1,
            data2: data2,
            data3: data3,
            pagination: {
                totalItems: totalItems,
                totalPages: Math.ceil(totalItems / limit),
                currentPage: page,
                limit: limit
            }
        });

    } catch (err) {
        handleErrors(res, err, 'dashboard_premium_test');
    } finally {
        console.timeEnd('dashboard_premium_test_execution');
    }
}
async function dashboard_premium_testbk(req, res) {
    try {
        const whereConditions = [];

        if (req.body.group_customer_id) whereConditions.push(`mps.group_customer_id = '${req.body.group_customer_id}'`);
        if (req.body.area_manager) whereConditions.push(`user.area_manager = '${req.body.area_manager}'`);
        if (req.body.area_supervisor) whereConditions.push(`user.area_supervisor = '${req.body.area_supervisor}'`);
        if (req.body.user_id) whereConditions.push(`pricepromotion.user_id = '${req.body.user_id}'`);
        if (req.body.channel_id) whereConditions.push(`store.channel_id = '${req.body.channel_id}'`);
        if (req.body.account_id) whereConditions.push(`mps.account_id = '${req.body.account_id}'`);
        if (req.body.store_name) whereConditions.push(`store.store_name LIKE '%${req.body.store_name}%'`);
        if (req.body.provinces_id) whereConditions.push(`store.provinces_id = '${req.body.provinces_id}'`);
        if (req.body.categoryId) whereConditions.push(`prod.categoryId = '${req.body.categoryId}'`);
        if (req.body.brand_id) whereConditions.push(`prod.brand_id = '${req.body.brand_id}'`);
        if (req.body.sub_brand_id) whereConditions.push(`prod.sub_brand_id = '${req.body.sub_brand_id}'`);
        if (req.body.product_name) whereConditions.push(`prod.id = '${req.body.product_name}'`);

        if (req.body.daterange) {
            const [startDate, endDate] = req.body.daterange.split(" to ");
            if (startDate && endDate) {
                whereConditions.push(`DATE(pricepromotion.datesave) BETWEEN '${startDate}' AND '${endDate}'`);
            }
        }
        
        const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(" AND ")}` : "";

        const query = `
        SELECT 
            acc.id AS account_id,
            acc.name AS account_name,
            brand.id AS brand_id,
            brand.name AS brand_name,
            prod.id AS product_id,
            prod.name AS product_name,
            pricepromotionlist.id AS pricepromotionlist_id,
            pricepromotionlist.pricepromotion_id,
            pricepromotionlist.stock AS qty,
            pricepromotionlist.map_product_store_list_id
        FROM tb_pricepromotionlist AS pricepromotionlist
        LEFT JOIN tb_pricepromotion AS pricepromotion ON pricepromotionlist.pricepromotion_id = pricepromotion.id
        LEFT JOIN tb_map_product_store_list AS mpsl ON pricepromotionlist.map_product_store_list_id = mpsl.id
        LEFT JOIN tb_map_product_store AS mps ON mpsl.map_product_id = mps.id
        LEFT JOIN tb_account AS acc ON mps.account_id = acc.id
        LEFT JOIN tb_product AS prod ON mpsl.product_id = prod.id
        LEFT JOIN tb_brand AS brand ON prod.brand_id = brand.id
        LEFT JOIN tb_user AS user ON pricepromotion.user_id = user.id
        LEFT JOIN tb_store AS store ON mps.store_code = store.store_code
        LEFT JOIN tb_map_user_store_list AS store_list ON store.id = store_list.store_id
        WHERE 1=1 AND mpsl.offtake = 'Y' AND (prod.promotion_id = '1' OR prod.promotion_id = '3') AND prod.isActive = 'Y' AND store.isActive = 'Y'
        ${whereClause}
        GROUP BY pricepromotionlist_id,map_product_store_list_id,acc.id, acc.name, brand.id, brand.name, prod.id, prod.name,pricepromotionlist.pricepromotion_id,pricepromotionlist.stock
        ORDER BY pricepromotionlist_id DESC , brand.id ASC;
        `;

        const queryx11 = `
        WITH RankedProducts AS (
            SELECT 
                prod.id AS product_id,
                prod.name AS product_name,
                pricepromotionlist.id,
                pricepromotionlist.map_product_store_list_id,
                pricepromotionlist.not_sell,
                pricepromotionlist.note,
                pricepromotionlist.picture,
                pricepromotionlist.price,
                pricepromotionlist.price_status,
                pricepromotionlist.pricepromotion_id,
                pricepromotionlist.promotion_id,
                pricepromotionlist.qty_in,
                pricepromotionlist.qty_in2,
                pricepromotionlist.qty_in3,
                pricepromotionlist.qty_in4,
                pricepromotionlist.qty_out,
                pricepromotionlist.qty_out2,
                pricepromotionlist.qty_out3,
                pricepromotionlist.qty_out4,
                pricepromotionlist.qty_start,
                pricepromotionlist.qty_start2,
                pricepromotionlist.qty_start3,
                pricepromotionlist.qty_start4,
                pricepromotionlist.special_price,
                pricepromotionlist.stock,
                pricepromotionlist.stock2,
                pricepromotionlist.stock3,
                pricepromotionlist.stock4,
                mpsl.price AS mpsl_price,
                ROW_NUMBER() OVER (
                    PARTITION BY prod.id
                    ORDER BY pricepromotionlist.id DESC
                ) AS rn
            FROM tb_pricepromotionlist AS pricepromotionlist
            LEFT JOIN tb_pricepromotion AS pricepromotion ON pricepromotionlist.pricepromotion_id = pricepromotion.id
            LEFT JOIN tb_map_product_store_list AS mpsl ON pricepromotionlist.map_product_store_list_id = mpsl.id
            LEFT JOIN tb_map_product_store AS mps ON mpsl.map_product_id = mps.id
            LEFT JOIN tb_account AS acc ON mps.account_id = acc.id
            LEFT JOIN tb_product AS prod ON mpsl.product_id = prod.id
            LEFT JOIN tb_brand AS brand ON prod.brand_id = brand.id
            LEFT JOIN tb_user AS user ON pricepromotion.user_id = user.id
            LEFT JOIN tb_store AS store ON mps.store_code = store.store_code
            LEFT JOIN tb_map_user_store_list AS store_list ON store.id = store_list.store_id
            WHERE mpsl.price = 'Y' AND prod.promotion_id = '1' AND prod.isActive = 'Y' AND store.isActive = 'Y'
            ${whereClause}
        )
        SELECT *
        FROM RankedProducts
        WHERE 1=1 AND mpsl_price = 'Y' AND rn = 1
        ORDER BY product_id ASC;
        `;
        
        const queryx2 = `
        WITH RankedProducts AS (
            SELECT 
                prod.id AS product_id,
                prod.name AS product_name,
                pricepromotionlist.id,
                pricepromotionlist.map_product_store_list_id,
                pricepromotionlist.not_sell,
                pricepromotionlist.note,
                pricepromotionlist.picture,
                pricepromotionlist.price,
                pricepromotionlist.price_status,
                pricepromotionlist.pricepromotion_id,
                pricepromotionlist.promotion_id,
                pricepromotionlist.qty_in,
                pricepromotionlist.qty_in2,
                pricepromotionlist.qty_in3,
                pricepromotionlist.qty_in4,
                pricepromotionlist.qty_out,
                pricepromotionlist.qty_out2,
                pricepromotionlist.qty_out3,
                pricepromotionlist.qty_out4,
                pricepromotionlist.qty_start,
                pricepromotionlist.qty_start2,
                pricepromotionlist.qty_start3,
                pricepromotionlist.qty_start4,
                pricepromotionlist.special_price,
                pricepromotionlist.stock,
                pricepromotionlist.stock2,
                pricepromotionlist.stock3,
                pricepromotionlist.stock4,
                mpsl.price AS mpsl_price,
                ROW_NUMBER() OVER (
                    PARTITION BY prod.id
                    ORDER BY pricepromotionlist.id DESC
                ) AS rn
            FROM tb_pricepromotionlist AS pricepromotionlist
            LEFT JOIN tb_pricepromotion AS pricepromotion ON pricepromotionlist.pricepromotion_id = pricepromotion.id
            LEFT JOIN tb_map_product_store_list AS mpsl ON pricepromotionlist.map_product_store_list_id = mpsl.id
            LEFT JOIN tb_map_product_store AS mps ON mpsl.map_product_id = mps.id
            LEFT JOIN tb_account AS acc ON mps.account_id = acc.id
            LEFT JOIN tb_product AS prod ON mpsl.product_id = prod.id
            LEFT JOIN tb_brand AS brand ON prod.brand_id = brand.id
            LEFT JOIN tb_user AS user ON pricepromotion.user_id = user.id
            LEFT JOIN tb_store AS store ON mps.store_code = store.store_code
            LEFT JOIN tb_map_user_store_list AS store_list ON store.id = store_list.store_id
            WHERE mpsl.price = 'Y' AND prod.promotion_id = '2' AND prod.isActive = 'Y' AND store.isActive = 'Y'
            ${whereClause}
        )
        SELECT *
        FROM RankedProducts
        WHERE 1=1 AND mpsl_price = 'Y' AND rn = 1
        ORDER BY product_id ASC;
        `;

        const queryx3 = `
        WITH RankedProducts AS (
            SELECT 
                prod.id AS product_id,
                prod.name AS product_name,
                prod.promotion_id AS prod_promotion_id,
                pricepromotionlist.id,
                pricepromotionlist.map_product_store_list_id,
                pricepromotionlist.not_sell,
                pricepromotionlist.note,
                pricepromotionlist.picture,
                pricepromotionlist.price,
                pricepromotionlist.price_status,
                pricepromotionlist.pricepromotion_id,
                pricepromotionlist.promotion_id,
                pricepromotionlist.qty_in,
                pricepromotionlist.qty_in2,
                pricepromotionlist.qty_in3,
                pricepromotionlist.qty_in4,
                pricepromotionlist.qty_out,
                pricepromotionlist.qty_out2,
                pricepromotionlist.qty_out3,
                pricepromotionlist.qty_out4,
                pricepromotionlist.qty_start,
                pricepromotionlist.qty_start2,
                pricepromotionlist.qty_start3,
                pricepromotionlist.qty_start4,
                pricepromotionlist.special_price,
                pricepromotionlist.stock,
                pricepromotionlist.stock2,
                pricepromotionlist.stock3,
                pricepromotionlist.stock4,
                mpsl.price AS mpsl_price,
                ROW_NUMBER() OVER (
                    PARTITION BY prod.id
                    ORDER BY pricepromotionlist.id DESC
                ) AS rn
            FROM tb_pricepromotionlist AS pricepromotionlist
            LEFT JOIN tb_pricepromotion AS pricepromotion ON pricepromotionlist.pricepromotion_id = pricepromotion.id
            LEFT JOIN tb_map_product_store_list AS mpsl ON pricepromotionlist.map_product_store_list_id = mpsl.id
            LEFT JOIN tb_map_product_store AS mps ON mpsl.map_product_id = mps.id
            LEFT JOIN tb_account AS acc ON mps.account_id = acc.id
            LEFT JOIN tb_product AS prod ON mpsl.product_id = prod.id
            LEFT JOIN tb_brand AS brand ON prod.brand_id = brand.id
            LEFT JOIN tb_user AS user ON pricepromotion.user_id = user.id
            LEFT JOIN tb_store AS store ON mps.store_code = store.store_code
            LEFT JOIN tb_map_user_store_list AS store_list ON store.id = store_list.store_id
            WHERE 1=1 AND mpsl.price = 'Y' AND prod.promotion_id = '3' AND prod.isActive = 'Y' AND store.isActive = 'Y'
            ${whereClause}
        )
        SELECT *
        FROM RankedProducts
        WHERE 1=1 AND mpsl_price = 'Y' AND rn = 1
        ORDER BY product_id ASC;
        `;

        const rawDatax = await db.sequelize.query(queryx11, { type: db.Sequelize.QueryTypes.SELECT });
        const rawDatax2 = await db.sequelize.query(queryx2, { type: db.Sequelize.QueryTypes.SELECT });
        const rawDatax3 = await db.sequelize.query(queryx3, { type: db.Sequelize.QueryTypes.SELECT });
        
        res.send({
            status: "success",
            data: rawDatax,
            data2: rawDatax2,
            data3: rawDatax3,
            queryx3: queryx3
        });
        
    } catch (err) {
        handleErrors(res, err, 'dashboard_premium_testbk');
    }
}
async function dashboard_compliance(req, res) {
    try {
        const whereConditions = [];

        if (req.body.group_customer_id) whereConditions.push(`store.group_customer_id = '${req.body.group_customer_id}'`);
        if (req.body.area_manager) whereConditions.push(`user.area_manager = '${req.body.area_manager}'`);
        if (req.body.area_supervisor) whereConditions.push(`user.area_supervisor = '${req.body.area_supervisor}'`);
        if (req.body.user_id) whereConditions.push(`compliance.user_id = '${req.body.user_id}'`);
        if (req.body.channel_id) whereConditions.push(`store.channel_id = '${req.body.channel_id}'`);
        if (req.body.account_id) whereConditions.push(`store.account_id = '${req.body.account_id}'`);
        if (req.body.store_name) whereConditions.push(`store.store_name LIKE '%${req.body.store_name}%'`);
        if (req.body.provinces_id) whereConditions.push(`store.provinces_id = '${req.body.provinces_id}'`);
        if (req.body.product_name) whereConditions.push(`prod.id = '${req.body.product_name}'`);
        if (req.body.rental_area_unit_id) whereConditions.push(`ra.name LIKE '%${req.body.rental_area_unit_id}%'`);
        if (req.body.mapname_filter) whereConditions.push(`mps.name = '${req.body.mapname_filter}'`);

        if (req.body.daterange) {
            const [startDate, endDate] = req.body.daterange.split(" to ");
            if (startDate && endDate) {
                whereConditions.push(`DATE(compliance.datesave) BETWEEN '${startDate}' AND '${endDate}'`);
            }
        }
        
        const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(" AND ")}` : "";

        const query = `
        SELECT 
            acc.id AS account_id,
            acc.name AS account_name,
            brand.id AS brand_id,
            brand.name AS brand_name,
            prod.id AS product_id,
            prod.name AS product_name,
            prod.flavor AS flavor,
            tb_compliancelist.status_area,
            tb_compliancelist.rental_area_unit_id,
            tb_compliancelist.rental_area_unit_name AS rental_area_unit_name_com,
            ra.name AS rental_area_unit_name,
            ra.unit AS ra_unit,
            tb_compliancelist.id AS compliancelist_id,
            tb_compliancelist.compliance_id,
            tb_compliancelist.qty,
            tb_compliancelist.map_storecompliance_list_id
        FROM tb_compliancelist
        LEFT JOIN tb_compliance AS compliance ON tb_compliancelist.compliance_id = compliance.id
        LEFT JOIN tb_map_storecompliance_list AS mpsl ON tb_compliancelist.map_storecompliance_list_id = mpsl.id
        LEFT JOIN tb_map_storecompliance AS mps ON mpsl.map_product_id = mps.id
        LEFT JOIN tb_product AS prod ON mpsl.product_id = prod.id
        LEFT JOIN tb_rental_area_unit AS ra ON tb_compliancelist.rental_area_unit_id = ra.id
        LEFT JOIN tb_brand AS brand ON prod.brand_id = brand.id
        LEFT JOIN tb_user AS user ON compliance.user_id = user.id
        LEFT JOIN tb_store AS store ON mps.store_id = store.id
        LEFT JOIN tb_account AS acc ON store.account_id = acc.id
        LEFT JOIN tb_map_user_store_list AS store_list ON store.id = store_list.store_id
        WHERE 1=1 
        AND store.isActive = 'Y'
        ${whereClause}
        GROUP BY 
            compliancelist_id,
            map_storecompliance_list_id,
            acc.id, 
            acc.name, 
            brand.id, 
            brand.name, 
            prod.id, 
            prod.name,
            tb_compliancelist.compliance_id,
            store.store_code,
            rental_area_unit_name,
            ra_unit
        ORDER BY 
            compliancelist_id DESC, 
            brand.id ASC;
        `;


        const rawData = await db.sequelize.query(query, { type: db.Sequelize.QueryTypes.SELECT });

        const groupedData = {};
        const accountSummary = {};
        const uniqueMapProductStoreList = new Set();
        const areaUnitSummary = {}; 

        const statusList = {
            0: 'ได้',
            1: 'ไม่ได้',
            2: 'ได้ทดแทน'
        };
        
        const complianceSummary = {
            total: 0,
            completed: 0,
            status_count: { 0: 0, 1: 0, 2: 0 }
        };

        rawData.forEach(item => {
            const accountId = item.account_id;
            const productId = item.product_id;
            // ใช้ชื่อหน่วยพื้นที่ (ra.unit) เป็นคีย์หลักในการจัดกลุ่ม
            const area_unit_name = item.ra_unit; 
            const brandId = item.brand_id;
            const complianceId = item.compliance_id;
            const mapProductStoreListId = item.map_storecompliance_list_id;

            const uniqueKey = `${accountId}-${brandId}-${productId}-${mapProductStoreListId}`;

            if (uniqueMapProductStoreList.has(uniqueKey)) return;
            uniqueMapProductStoreList.add(uniqueKey);
            
            const status = item.status_area;
            complianceSummary.total += item.qty;

            complianceSummary.status_count[status] = (complianceSummary.status_count[status] || 0) + item.qty;
            if (status === 0 || status === 2) {
                complianceSummary.completed += item.qty;
            }
            
            if (!areaUnitSummary[area_unit_name]) { 
                areaUnitSummary[area_unit_name] = {
                    rental_area_unit_id: item.rental_area_unit_id, // เก็บ ID ของหน่วยพื้นที่ (tb_compliancelist.rental_area_unit_id)
                    rental_area_unit_name: item.ra_unit,          // ชื่อหน่วยพื้นที่ (ra.unit)
                    total_stock: 0,
                    qty: item.qty,
                    total_products: new Set(),
                    total_compliancelists: new Set()
                };
            }
            
            areaUnitSummary[area_unit_name].total_products.add(productId);
            areaUnitSummary[area_unit_name].total_compliancelists.add(complianceId);
            if (status === 0 || status === 2) {
                areaUnitSummary[area_unit_name].total_stock += item.qty;
            }

            if (!accountSummary[accountId]) {
                accountSummary[accountId] = {
                    account_id: accountId,
                    account_name: item.account_name,
                    total: 0,
                    status_count: { 0: 0, 1: 0, 2: 0 },
                };
            }

            accountSummary[accountId].total += item.qty;
            accountSummary[accountId].status_count[status] = (accountSummary[accountId].status_count[status] || 0) + item.qty;
        });

        const total_products_count = Object.values(areaUnitSummary).reduce((sum, item) => sum + item.total_products.size, 0);

        const area = Object.values(areaUnitSummary)
            .filter(item => item.rental_area_unit_id)
            .map((item, index) => ({
                // ใช้ ID หรือชื่อหน่วยพื้นที่ตามที่คุณต้องการ
                rental_area_unit_id: item.rental_area_unit_id, 
                rental_area_unit_name: item.rental_area_unit_name,
                total_stock: item.total_stock,
                tasks: item.total_stock,
                total: complianceSummary.completed,
                area_percentage: complianceSummary.completed > 0
                    ? Math.round((item.total_stock / complianceSummary.completed) * 100)
                    : 0
            }))
            .sort((a, b) => b.area_percentage - a.area_percentage);

        const result = Object.values(groupedData);

        complianceSummary.completed_percentage = complianceSummary.total > 0
            ? Math.round((complianceSummary.completed / complianceSummary.total) * 100)
            : 0;

        const complianceResult = {
            total: complianceSummary.total,
            completed_percentage: complianceSummary.completed_percentage,
            status_list: Object.keys(statusList).map(key => ({
                id: Number(key),
                name: statusList[key],
                count: complianceSummary.status_count[key] || 0
            }))
        };
        let account_names = [];
        const totalItems_dis = parseFloat(complianceSummary.total) - parseFloat(complianceSummary.status_count[1]);
        const accountData = Object.values(accountSummary).map(account => {
            const totalPerAccount = account.total;
            return {
                account_id: account.account_id,
                account_name: account.account_name,
                total: totalItems_dis,
                totalPerAccount: Math.round((totalPerAccount - account.status_count[1]) / totalItems_dis),
                status: [
                    {
                        name: "ได้",
                        count: account.status_count[0],
                        percentage: totalItems_dis > 0
                            ? Math.round((account.status_count[0] / totalItems_dis) * 100)
                            : 0
                    },
                    {
                        name: "ได้ทดแทน",
                        count: account.status_count[2],
                        percentage: totalItems_dis > 0
                            ? Math.round((account.status_count[2] / totalItems_dis) * 100)
                            : 0
                    }
                ],
                percentage: totalItems_dis > 0 ? Math.round(((totalPerAccount - account.status_count[1]) / totalItems_dis) * 100) : 0
            };
        });

        accountData.sort((a, b) => {
            const nameA = a.account_name.toUpperCase();
            const nameB = b.account_name.toUpperCase();

            if (nameA < nameB) {
                return -1;
            }
            if (nameA > nameB) {
                return 1;
            }

            return 0;
        });

        account_names = accountData.map(account => account.account_name); 
        
        res.send({
            status: "success",
            data: result,
            area,
            query,
            rawData,
            complianceResult,
            accountData,
            account_names
        });

    } catch (err) {
        handleErrors(res, err, 'dashboard_compliance');
    }
}
async function dashboard_extra(req, res) {
    try {
        const whereConditions = [];

        if (req.body.group_customer_id) whereConditions.push(`store.group_customer_id = ${req.body.group_customer_id}`);
        if (req.body.area_manager) whereConditions.push(`user.area_manager = '${req.body.area_manager}'`);
        if (req.body.area_supervisor) whereConditions.push(`user.area_supervisor = '${req.body.area_supervisor}'`);
        if (req.body.user_id) whereConditions.push(`complianceextra.user_id = '${req.body.user_id}'`);
        if (req.body.channel_id) whereConditions.push(`store.channel_id = '${req.body.channel_id}'`);
        if (req.body.account_id) whereConditions.push(`store.account_id = '${req.body.account_id}'`);
        if (req.body.store_name) whereConditions.push(`store.store_name LIKE '%${req.body.store_name}%'`);
        if (req.body.provinces_id) whereConditions.push(`store.provinces_id = '${req.body.provinces_id}'`);
        if (req.body.product_name) whereConditions.push(`prod.id = '${req.body.product_name}'`);
        if (req.body.rental_area_unit_id) whereConditions.push(`ra.unit LIKE '${req.body.rental_area_unit_id}'`);
        
        if (req.body.daterange) {
            const [startDate, endDate] = req.body.daterange.split(" to ");
            if (startDate && endDate) {
                whereConditions.push(`DATE(complianceextra.datesave) BETWEEN '${startDate}' AND '${endDate}'`);
            }
        }
        
        const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(" AND ")}` : "";

        const query = `
        SELECT 
            acc.id AS account_id,
            acc.name AS account_name,
            prod.id AS product_id,
            prod.name AS product_name,
            prod.flavor AS flavor,
            store.group_customer_id,
            tb_compliancelistextra.status_area,
            tb_compliancelistextra.rental_area_unit_id,
            tb_compliancelistextra.rental_area_unit_name AS rental_area_unit_name_com,
            ra.name AS rental_area_unit_name,
            ra.unit AS ra_unit,
            tb_compliancelistextra.id AS compliancelistextra_id,
            tb_compliancelistextra.complianceextra_id,
            tb_compliancelistextra.qty,
            SUM(DISTINCT tb_compliancelistextra.qty) AS total_stock,
            COUNT(tb_compliancelistextra.id) AS total_items
        FROM tb_compliancelistextra
        LEFT JOIN tb_complianceextra AS complianceextra ON tb_compliancelistextra.complianceextra_id = complianceextra.id
        LEFT JOIN tb_product AS prod ON tb_compliancelistextra.product_id = prod.id
        LEFT JOIN tb_rental_area_unit AS ra ON tb_compliancelistextra.rental_area_unit_id = ra.id
        LEFT JOIN tb_user AS user ON complianceextra.user_id = user.id
        LEFT JOIN tb_store AS store ON complianceextra.store_id = store.id
        LEFT JOIN tb_account AS acc ON store.account_id = acc.id
        LEFT JOIN tb_map_user_store_list AS store_list ON store.id = store_list.store_id
        WHERE 1=1 
        AND prod.isActive = 'Y' AND store.isActive = 'Y'
        ${whereClause}
        GROUP BY 
            compliancelistextra_id,
            product_id,
            acc.id, 
            acc.name, 
            prod.id, 
            prod.name,
            tb_compliancelistextra.complianceextra_id,
            tb_compliancelistextra.qty,
            store.store_code,
            ra_unit
        ORDER BY 
            compliancelistextra_id DESC;
        `;

        const query2 = `
        SELECT 
            ra.id AS rental_area_unit_id,
            ra.name AS rental_area_unit_name,
            store.group_customer_id,
            MONTH(complianceextra.datesave) AS month,
            SUM(tb_compliancelistextra.qty) AS total_qty,
            ra.unit AS ra_unit
        FROM tb_compliancelistextra
        LEFT JOIN tb_complianceextra AS complianceextra ON tb_compliancelistextra.complianceextra_id = complianceextra.id
        LEFT JOIN tb_product AS prod ON tb_compliancelistextra.product_id = prod.id
        LEFT JOIN tb_rental_area_unit AS ra ON tb_compliancelistextra.rental_area_unit_id = ra.id
        LEFT JOIN tb_user AS user ON complianceextra.user_id = user.id
        LEFT JOIN tb_store AS store ON complianceextra.store_id = store.id
        WHERE 1=1 ${whereClause} AND prod.isActive = 'Y' AND store.isActive = 'Y'
        GROUP BY ra.id, ra.name, MONTH(complianceextra.datesave),ra_unit
        ORDER BY ra.id, month;
        `;

        const rawData = await db.sequelize.query(query, { type: db.Sequelize.QueryTypes.SELECT });
        const rawData2 = await db.sequelize.query(query2, { type: db.Sequelize.QueryTypes.SELECT });

        const accountSummary = {};
        const totalItems = rawData.length;
        // เปลี่ยนชื่อเป็น areaUnitSummary เพื่อให้ชัดเจนว่าเราใช้หน่วยวัดในการรวมกลุ่ม
        const areaUnitSummary = {}; 

        const colorList = ["primary", "info", "success", "secondary", "error", "warning"];
        const iconList = ["tabler-chart-bar", "tabler-chart-line", "tabler-chart-pie", "tabler-chart-histogram"];
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        
        // **Query 2 Grouping:** ยังคงใช้ ID ในการจัดกลุ่มเบื้องต้น
        const groupedData = {};
        rawData2.forEach(item => {
            if (!groupedData[item.rental_area_unit_id]) {
                groupedData[item.rental_area_unit_id] = {
                    rental_area_unit_id: item.rental_area_unit_id,
                    ra_unit: item.ra_unit,
                    monthly_qty: Array(12).fill(0)
                };
            }
            groupedData[item.rental_area_unit_id].monthly_qty[item.month - 1] = item.total_qty || 0;
        });

        // **Query 2 Final Grouping (ตามชื่อหน่วยวัด):** ย้าย logic นี้มาที่นี่เพื่อรวมกลุ่มตามชื่อ
        const groupedChartData = {};
        Object.values(groupedData).forEach(item => {
            const key = item.ra_unit;
            if (!groupedChartData[key]) {
                groupedChartData[key] = {
                    rental_area_unit_name: item.ra_unit,
                    monthly_qty: [...item.monthly_qty],
                };
            } else {
                groupedChartData[key].monthly_qty = groupedChartData[key].monthly_qty.map((qty, i) => qty + item.monthly_qty[i]);
            }
        });
        
        // ... (ส่วน chartConfigs เหมือนเดิม) ...
        const chartConfigs = Object.values(groupedChartData).map((item, index) => {
            const randomColor = colorList[index % colorList.length];
            const randomIcon = iconList[index % iconList.length];

            // ✅ เพิ่ม chartOptions ที่มีโครงสร้างพื้นฐานที่จำเป็น
            const chartOptionsBase = {
                chart: {
                    type: 'line', // หรือ 'bar' หรือ type อื่นๆ ที่คุณต้องการสำหรับ chart นี้
                    height: 350,
                    toolbar: { show: false },
                },
                // คุณอาจเพิ่ม xaxis, yaxis, colors ที่เกี่ยวข้องกับ chart นี้ได้ที่นี่
                xaxis: {
                    categories: months, // ใช้ categories เป็นชื่อเดือน
                },
                stroke: { curve: 'smooth' }, // ตัวอย่างสำหรับ chart line
            };

            return {
                title: item.rental_area_unit_name,
                icon: randomIcon,
                chartOptions: chartOptionsBase, // <--- แก้ไขตรงนี้
                series: [{ name: item.rental_area_unit_name, data: item.monthly_qty.map(qty => parseFloat(qty).toFixed(2)) }],
            };
        });

        const statusList = { 0: 'ได้', 1: 'ไม่ได้', 2: 'ได้ทดแทน' };
        
        const complianceSummary = {
            total: 0, completed: 0, status_count: { 0: 0, 1: 0, 2: 0 }
        };

        // **Query 1 Grouping (สำหรับ Area Summary):** ปรับการใช้คีย์ในการจัดกลุ่ม
        rawData.forEach(item => {
            const accountId = item.account_id;
            const productId = item.product_id;
            // ใช้ชื่อหน่วยวัด (item.ra_unit) เป็นคีย์ในการจัดกลุ่ม
            const area_unit_name = item.ra_unit; 
            
            const rawQty = item.qty || 0;
            const status = item.status_area;
            complianceSummary.total += rawQty;
            complianceSummary.status_count[status] = (complianceSummary.status_count[status] || 0) + 1;
            complianceSummary.completed += rawQty;

            // ใช้ area_unit_name ในการจัดกลุ่มแทน area_unit_id/rental_area_unit_name_com
            if (!areaUnitSummary[area_unit_name]) { 
                areaUnitSummary[area_unit_name] = {
                    rental_area_unit_id: item.rental_area_unit_id,
                    rental_area_unit_name: item.ra_unit, // ใช้ item.ra_unit
                    // rental_area_unit_name: item.rental_area_unit_name+' ('+item.rental_area_unit_name_com+', '+item.complianceextra_id+')', // ใช้ item.ra_unit
                    total_stock: 0,
                    total_products: new Set(),
                    total_compliancelists: new Set()
                };
            }
            areaUnitSummary[area_unit_name].total_stock += rawQty || 0;
            areaUnitSummary[area_unit_name].total_products.add(productId); // เพิ่ม product ID
            areaUnitSummary[area_unit_name].total_compliancelists.add(item.compliancelistextra_id); // เพิ่ม compliancelist ID


            if (!accountSummary[accountId]) {
                accountSummary[accountId] = {
                    account_id: accountId,
                    account_name: item.account_name,
                    total: 0,
                    status_count: { 0: 0, 1: 0, 2: 0 },
                };
            }
            accountSummary[accountId].total += item.qty;
            accountSummary[accountId].status_count[status] = (accountSummary[accountId].status_count[status] || 0) + item.qty;
        });

        // เปลี่ยนการอ้างอิงจาก areaSummary เป็น areaUnitSummary
        const total_products_count = Object.values(areaUnitSummary).reduce((sum, item) => sum + item.total_products.size, 0);

        // **Area Calculation:** ใช้ areaUnitSummary ที่รวมกลุ่มตามชื่อหน่วยวัดแล้ว
        const area = Object.values(areaUnitSummary)
            .map(item => ({
                rental_area_unit_id: item.rental_area_unit_id, 
                rental_area_unit_name: item.rental_area_unit_name,
                total_stock: Math.round(item.total_stock * 10) / 10,
                tasks: Math.round(item.total_stock * 10) / 10,
                area_percentage: complianceSummary.total > 0
                    ? Math.round((item.total_stock / complianceSummary.total) * 100)
                    : 0
            }))
            .sort((a, b) => b.tasks - a.tasks);

        // ... (ส่วน complianceSummary และ accountData เหมือนเดิม) ...
        complianceSummary.completed_percentage = complianceSummary.total > 0
            ? Math.round((complianceSummary.completed / complianceSummary.total) * 100)
            : 0;

        const complianceResult = {
            total: complianceSummary.total,
            completed_percentage: complianceSummary.completed_percentage,
            status_list: Object.keys(statusList).map(key => ({
                id: Number(key),
                name: statusList[key],
                count: complianceSummary.status_count[key] || 0
            }))
        };
        let account_names = [];
        const accountData = Object.values(accountSummary).map(account => {
            const totalPerAccount = account.total;
            account_names.push(account.account_name);
            return {
                account_id: account.account_id,
                account_name: account.account_name,
                total: totalPerAccount,
                status: [
                    {
                        name: "Total",
                        count: account.status_count[0],
                        percentage: complianceSummary.total > 0
                            ? Math.round((account.status_count[0] / complianceSummary.total) * 100)
                            : 0
                    },
                ],
                percentage: complianceSummary.total > 0
                            ? Math.round((account.status_count[0] / complianceSummary.total) * 100)
                            : 0
            };
        });

        accountData.sort((a, b) => {
            const nameA = a.account_name.toUpperCase();
            const nameB = b.account_name.toUpperCase();

            if (nameA < nameB) {
                return -1;
            }
            if (nameA > nameB) {
                return 1;
            }

            return 0;
        });
        
        res.send({
            status: "success",
            area,
            query,
            rawData,
            totalItems,
            // areaMap ถูกแทนที่ด้วย areaUnitSummary ใน logic
            areaUnitSummary, 
            complianceResult,
            accountData,
            account_names,
            chartConfigs
        });

    } catch (err) {
        handleErrors(res, err, 'dashboard_extra');
    }
}
async function areaManagers(req, res) {
    try {
        const whereConditions_AreaManager = {};
        if (req.body.group_customer_id) {
            whereConditions_AreaManager.group_customer_id = req.body.group_customer_id;
        }
        if (req.body.area_manager_id || req.body.area_manager) {
            if (req.body.area_manager_id) {
                whereConditions_AreaManager.area_manager_id = req.body.area_manager_id;
            }
            if (req.body.area_manager) {
                whereConditions_AreaManager.area_manager_id = req.body.area_manager;
            }
        }
        if (req.body.area_supervisor) {
            whereConditions_AreaManager.area_supervisor_id = req.body.area_supervisor;
        }

        whereConditions_AreaManager.isActive = 'Y';

        let areaManagerData = await db.MapUserArea.findAll({
            attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('area_manager_id')), 'area_manager_id']],
            where: whereConditions_AreaManager,
            raw: true
        });

        const whereAreaManager = {};
        whereAreaManager.id = areaManagerData.map(item => item.area_manager_id);
        whereAreaManager.isActive = 'Y';

        let areaManagers = await db.AreaManager.findAll({
            attributes: ['id', 'name'],
            where: whereAreaManager,
            order: [['name', 'ASC']],
            raw: true
        });
        
        res.send({
            status: "success",
            areaManagers,
        });

    } catch (err) {
        handleErrors(res, err, 'areaManagers');
    }
}
async function areaSupervisor(req, res) {
    try {
        const whereConditions_AreaSupervisor = {};
        if (req.body.group_customer_id) {
            whereConditions_AreaSupervisor.group_customer_id = req.body.group_customer_id;
        }
        if (req.body.area_manager_id || req.body.area_manager) {
            if (req.body.area_manager_id) {
                whereConditions_AreaSupervisor.area_manager_id = req.body.area_manager_id;
            }
            if (req.body.area_manager) {
                whereConditions_AreaSupervisor.area_manager_id = req.body.area_manager;
            }
        }
        if (req.body.area_supervisor) {
            whereConditions_AreaSupervisor.area_supervisor_id = req.body.area_supervisor;
        }

        whereConditions_AreaSupervisor.isActive = 'Y';

        let AreaSupervisorData = await db.MapUserArea.findAll({
            attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('area_supervisor_id')), 'area_supervisor_id']],
            where: whereConditions_AreaSupervisor,
            raw: true
        });

        const whereAreaSupervisor = {};
        whereAreaSupervisor.id = AreaSupervisorData.map(item => item.area_supervisor_id);
        whereAreaSupervisor.isActive = 'Y';

        let areaSupervisor = await db.AreaSupervisor.findAll({
            attributes: ['id', 'name'],
            where: whereAreaSupervisor,
            order: [['name', 'ASC']],
            raw: true
        });
        
        res.send({
            status: "success",
            areaSupervisor,
        });

    } catch (err) {
        handleErrors(res, err, 'areaSupervisor');
    }
}
async function getBrands(req, res) {
    try {
      const whereConditions = {};
      if (req.body.group_customer_id) {
        whereConditions.group_customer_id = req.body.group_customer_id;
      }
      if (req.body.area_manager_id || req.body.area_manager) {
        whereConditions.area_manager = req.body.area_manager_id || req.body.area_manager;
      }
      if (req.body.area_supervisor_id) {
        whereConditions.area_supervisor = req.body.area_supervisor_id;
      }
    
      const oosData = await db.Oos.findAll({
        order: [['id', 'DESC']],
        include: [
          {
            model: db.OosList,
            as: 'oosDetails',
            where:{
              isActive:'Y'
            },
            include: [
              {
                model: db.MapProductStoreList,
                as: 'mapProductStoreList',
                include: [
                  {
                    model: db.Product,
                    as: 'product',
                    include: [
                      { model: db.Brand, as: 'brand' },
                    ],
                    where: {
                      group_customer_id: req.body.group_customer_id
                    }
                  }
                ]
              }
            ]
          },
          {
            model: db.User,
            as: 'user',
            where: whereConditions
          }
        ]
      });
    
      if (!oosData || oosData.length === 0) {
        return res.send({ status: "success", brand: [] });
      }
    
      const brandMap = new Map();
    
      for (const oos of oosData) {
        for (const oosDetail of oos.oosDetails || []) {
          const product = oosDetail.mapProductStoreList?.product;
          const brand = product?.brand;
          if (brand && !brandMap.has(brand.id)) {
            brandMap.set(brand.id, {
              id: brand.id,
              name: brand.name
            });
          }
        }
      }
    
      const uniqueBrands = Array.from(brandMap.values());
    
      res.send({
        status: "success",
        brand: uniqueBrands
      });
    
    } catch (err) {
        handleErrors(res, err, 'getBrands');
    }
}
async function getBrandsOfftake(req, res) {
    try {
      const whereConditions = {};
      if (req.body.group_customer_id) {
        whereConditions.group_customer_id = req.body.group_customer_id;
      }
      if (req.body.area_manager_id || req.body.area_manager) {
        whereConditions.area_manager = req.body.area_manager_id || req.body.area_manager;
      }
      if (req.body.area_supervisor_id) {
        whereConditions.area_supervisor = req.body.area_supervisor_id;
      }
    
      const OfftakeData = await db.Offtake.findAll({
        order: [['id', 'DESC']],
        include: [
          {
            model: db.OfftakeList,
            as: 'offtakeDetails',
            where:{
              isActive:'Y'
            },
            include: [
              {
                model: db.MapProductStoreList,
                as: 'mapProductStoreList',
                include: [
                  {
                    model: db.Product,
                    as: 'product',
                    include: [
                      { model: db.Brand, as: 'brand' },
                    ],
                    where: {
                      group_customer_id: req.body.group_customer_id
                    }
                  }
                ]
              }
            ]
          },
          {
            model: db.User,
            as: 'user',
            where: whereConditions
          }
        ]
      });
    
      if (!OfftakeData || OfftakeData.length === 0) {
        return res.send({ status: "success", brand: [] });
      }
    
      const brandMap = new Map();
    
      for (const offtake of OfftakeData) {
        for (const offtakeDetail of offtake.offtakeDetails || []) {
          const product = offtakeDetail.mapProductStoreList?.product;
          const brand = product?.brand;
          if (brand && !brandMap.has(brand.id)) {
            brandMap.set(brand.id, {
              id: brand.id,
              name: brand.name
            });
          }
        }
      }
    
      const uniqueBrands = Array.from(brandMap.values());
    
      res.send({
        status: "success",
        brand: uniqueBrands
      });
    
    } catch (err) {
        handleErrors(res, err, 'getBrandsOfftake');
    }
}
async function getTableProduct(req, res) {
    try {
        const { Op } = db.Sequelize;
        const replacements = {};
        const whereClauseConditions = [];
        const oosWhereConditions = []; //เงื่อนไขสำหรับ CTE โดยเฉพาะ

        // --- ส่วนสร้างเงื่อนไข WHERE ---
        if (req.body.group_customer_id) {
            whereClauseConditions.push(`prod.group_customer_id = :group_customer_id`);
            replacements.group_customer_id = req.body.group_customer_id;
        }
        if (req.body.brand_id) {
            whereClauseConditions.push(`prod.brand_id = :brand_id`);
            replacements.brand_id = req.body.brand_id;
        }
        if (req.body.product_name) {
            whereClauseConditions.push(`prod.name LIKE :product_name`);
            replacements.product_name = `%${req.body.product_name}%`;
        }
        if (req.body.user_id) {
            const userCondition = `oos.user_id = :user_id`;
            whereClauseConditions.push(userCondition);
            oosWhereConditions.push(userCondition);
            replacements.user_id = req.body.user_id;
        }
        if (req.body.area_manager_id) {
            const areaManagerCondition = `user.area_manager = :area_manager_id`;
            whereClauseConditions.push(areaManagerCondition);
            oosWhereConditions.push(areaManagerCondition);
            replacements.area_manager_id = req.body.area_manager_id;
        }
        if (req.body.area_supervisor_id) {
            const areaSupervisorCondition = `user.area_supervisor = :area_supervisor_id`;
            whereClauseConditions.push(areaSupervisorCondition);
            oosWhereConditions.push(areaSupervisorCondition);
            replacements.area_supervisor_id = req.body.area_supervisor_id;
        }
        if (req.body.daterange) {
            const [startDate, endDate] = req.body.daterange.split(" to ");
            if (startDate) {
                const startDateCondition = `DATE(oos.datesave) >= :startDate`
                whereClauseConditions.push(startDateCondition);
                oosWhereConditions.push(startDateCondition);
                replacements.startDate = startDate;
            }
            if (endDate) {
                const endDateCondition = `DATE(oos.datesave) <= :endDate`;
                whereClauseConditions.push(endDateCondition);
                oosWhereConditions.push(endDateCondition);
                replacements.endDate = endDate;
            }
        }
        //--- เพิ่มเติมเงื่อนไขอื่นๆ ตามต้องการ ---
        if (req.body.channel_id) {
            whereClauseConditions.push(`store.channel_id = :channel_id`);
            replacements.channel_id = req.body.channel_id;
        }
        if (req.body.account_id) {
            whereClauseConditions.push(`mps.account_id = :account_id`);
            replacements.account_id = req.body.account_id;
        }
        if (req.body.store_name) {
            whereClauseConditions.push(`store.store_name LIKE :store_name`);
            replacements.store_name = `%${req.body.store_name}%`;
        }
        if (req.body.provinces_id) {
            whereClauseConditions.push(`store.provinces_id = :provinces_id`);
            replacements.provinces_id = req.body.provinces_id;
        }


        const whereClause = whereClauseConditions.length > 0 ? `AND ${whereClauseConditions.join(" AND ")}` : "";
        const oosWhereClause = oosWhereConditions.length > 0 ? `WHERE ${oosWhereConditions.join(" AND ")}` : "";

        const mainQuery = `
            WITH RankedOOS AS (
                SELECT
                    oos.id,
                    oos.group_id,
                    oos.user_id,
                    oos.store_id,
                    oos.datesave,
                    ROW_NUMBER() OVER (
                        PARTITION BY oos.group_id, oos.user_id, oos.store_id 
                        ORDER BY oos.datesave DESC, oos.id DESC
                    ) AS rn
                FROM tb_oos AS oos
                LEFT JOIN tb_user AS user ON oos.user_id = user.id
                ${oosWhereClause}
            )
            SELECT
                prod.id AS product_id,
                prod.name AS product_name,
                prod.flavor,
                brand.name AS brand,
                subBrand.name AS sub_brand,
                mps.account_id,
                ol.qty
            FROM tb_ooslist AS ol
            JOIN RankedOOS AS oos ON ol.oos_id = oos.id AND oos.rn = 1
            JOIN tb_map_product_store_list AS mpsl ON ol.map_product_store_list_id = mpsl.id
            JOIN tb_product AS prod ON mpsl.product_id = prod.id
            JOIN tb_map_product_store AS mps ON mpsl.map_product_id = mps.id
            JOIN tb_store AS store ON oos.store_id = store.id
            JOIN tb_user AS user ON oos.user_id = user.id
            LEFT JOIN tb_brand AS brand ON prod.brand_id = brand.id
            LEFT JOIN tb_sub_brand AS subBrand ON prod.sub_brand_id = subBrand.id
            WHERE ol.isActive = 'Y' ${whereClause}
            ORDER BY prod.name ASC;
        `;

        const allDetails = await db.sequelize.query(mainQuery, {
            replacements: replacements,
            type: db.Sequelize.QueryTypes.SELECT
        });

        if (!allDetails || allDetails.length === 0) {
            return res.send({ status: "success", data: [], uniqueAccountsList: [] });
        }
        
        const accountQuery = `
            SELECT DISTINCT acc.id AS account_id, acc.name AS account_name
            FROM tb_ooslist AS ol
            JOIN tb_oos AS oos ON ol.oos_id = oos.id
            JOIN tb_map_product_store_list AS mpsl ON ol.map_product_store_list_id = mpsl.id
            JOIN tb_map_product_store AS mps ON mpsl.map_product_id = mps.id
            JOIN tb_account AS acc ON mps.account_id = acc.id
            JOIN tb_store AS store ON oos.store_id = store.id
            JOIN tb_user AS user ON oos.user_id = user.id
            JOIN tb_product AS prod ON mpsl.product_id = prod.id
            WHERE mpsl.stock = 'Y' AND ol.isActive = 'Y' AND ol.qty > 0
            ${whereClause}
        `;
        const allAccounts = await db.sequelize.query(accountQuery, {
            replacements: replacements,
            type: db.Sequelize.QueryTypes.SELECT
        });

        const groupedMap = new Map();

        for (const detail of allDetails) {
            const key = `${detail.product_id}-${detail.product_name}-${detail.flavor || ''}`;

            if (!groupedMap.has(key)) {
                groupedMap.set(key, {
                    product_id: detail.product_id,
                    name: detail.product_name,
                    flavor: detail.flavor,
                    brand: detail.brand || '',
                    sub_brand: detail.sub_brand || '',
                    accounts: allAccounts.map(acc => ({
                        account_id: acc.account_id,
                        account_name: acc.account_name,
                        qty: 0
                    }))
                });
            }
            
            if (detail.account_id) {
                const productGroup = groupedMap.get(key);
                const target = productGroup.accounts.find(a => a.account_id === detail.account_id);
                if (target) {
                    target.qty += detail.qty;
                }
            }
        }

        const initialResult = Array.from(groupedMap.values());
        const result = initialResult.filter(productGroup => {
            const totalQty = productGroup.accounts.reduce((sum, account) => sum + account.qty, 0);
            return totalQty > 0;
        });

        res.send({
            status: "success",
            data: result,
            uniqueAccountsList: allAccounts
        });

    } catch (err) {
        handleErrors(res, err, 'getTableProduct');
    }
}
async function getTableProductOfftake(req, res) {
    try {
      const { Op } = db.Sequelize;
      const whereConditionsProduct = {};
      const whereConditionsOfftake = {};
    
      if (req.body.group_customer_id) whereConditionsProduct.group_customer_id = req.body.group_customer_id;
      if (req.body.brand_id) whereConditionsProduct.brand_id = req.body.brand_id;
      if (req.body.product_name) {
        whereConditionsProduct.name = { [Op.like]: `%${req.body.product_name}%` };
      }
    
      if (req.body.daterange) {
        const [startDate, endDate] = req.body.daterange.split(" to ");
        whereConditionsOfftake[Op.and] = [];
        if (startDate) whereConditionsOfftake[Op.and].push({ datesave_start: { [Op.gte]: startDate } });
        if (endDate) whereConditionsOfftake[Op.and].push({ datesave_end: { [Op.lte]: endDate } });
      }
      if (req.body.user_id) whereConditionsOfftake.user_id = req.body.user_id;
    
      const dataList = await db.Offtake.findAll({
        where: whereConditionsOfftake,
        order: [['id', 'DESC']],
        include: [
          {
            model: db.OfftakeList,
            as: 'offtakeDetails',
            where: { isActive: 'Y' },
            include: [
              {
                model: db.MapProductStoreList,
                as: 'mapProductStoreList',
                include: [
                  {
                    model: db.Product,
                    as: 'product',
                    include: [
                      { model: db.Brand, as: 'brand' },
                      { model: db.SubBrand, as: 'subBrand' },
                    ],
                    where: whereConditionsProduct
                  }
                ]
              }
            ]
          },
          {
            model: db.User,
            as: 'user',
            where: {
              group_customer_id: req.body.group_customer_id,
              area_manager: req.body.area_manager_id,
              area_supervisor: req.body.area_supervisor_id
            }
          }
        ]
      });
    
      if (!dataList || dataList.length === 0) {
        return res.send({ status: "success", data: [], uniqueAccountsList: [] });
      }
    
      const allOfftakeDetails = dataList.flatMap(d => d.offtakeDetails);
    
      const whereClauseConditions = [];
      if (req.body.group_customer_id) whereClauseConditions.push(`store.group_customer_id = '${req.body.group_customer_id}'`);
      if (req.body.area_manager_id) whereClauseConditions.push(`user.area_manager = '${req.body.area_manager_id}'`);
      if (req.body.area_supervisor_id) whereClauseConditions.push(`user.area_supervisor = '${req.body.area_supervisor_id}'`);
      if (req.body.user_id) whereClauseConditions.push(`ot.user_id = '${req.body.user_id}'`);
      if (req.body.channel_id) whereClauseConditions.push(`store.channel_id = '${req.body.channel_id}'`);
      if (req.body.account_id) whereClauseConditions.push(`store.account_id = '${req.body.account_id}'`);
      if (req.body.store_name) whereClauseConditions.push(`store.store_name LIKE '%${req.body.store_name}%'`);
      if (req.body.provinces_id) whereClauseConditions.push(`store.provinces_id = '${req.body.provinces_id}'`);
      if (req.body.daterange) {
        const [startDate, endDate] = req.body.daterange.split(" to ");
        if (startDate) whereClauseConditions.push(`DATE(ot.datesave_start) >= '${startDate}'`);
        if (endDate) whereClauseConditions.push(`DATE(ot.datesave_end) <= '${endDate}'`);
      }
      const whereClause = whereClauseConditions.length > 0 ? `AND ${whereClauseConditions.join(" AND ")}` : "";
    
      const accountQuery = `
        SELECT DISTINCT acc.id AS account_id, acc.name AS account_name
        FROM tb_offtakelist AS ol
        JOIN tb_offtake AS ot ON ol.offtake_id = ot.id
        JOIN tb_map_product_store_list AS mpsl ON ol.map_product_store_list_id = mpsl.id
        JOIN tb_map_product_store AS mps ON mpsl.map_product_id = mps.id
        JOIN tb_account AS acc ON mps.account_id = acc.id
        JOIN tb_store AS store ON ot.store_id = store.id
        JOIN tb_user AS user ON ot.user_id = user.id
        WHERE mpsl.offtake = 'Y' AND ol.isActive = 'Y' ${whereClause} AND store.isActive = 'Y' AND ol.amount > 0
      `;
      const allAccounts = await db.sequelize.query(accountQuery, { type: db.Sequelize.QueryTypes.SELECT });
    
      const groupedMap = new Map();
    
      for (const offtakeDetail of allOfftakeDetails) {
        const mpsl = offtakeDetail.mapProductStoreList;
        const product = mpsl?.product;
        if (!product) continue;
    
        const key = `${product.id}-${product.name}-${product.flavor || ''}`;
    
        if (!groupedMap.has(key)) {
          groupedMap.set(key, {
            product_id: product.id,
            name: product.name,
            flavor: product.flavor,
            brand: product.brand?.name || '',
            sub_brand: product.subBrand?.name || '',
            accounts: allAccounts.map(acc => ({
              account_id: acc.account_id,
              account_name: acc.account_name,
              amount: 0
            }))
          });
        }
    
        const mps = await db.MapProductStore.findOne({ where: { id: mpsl.map_product_id } });
    
        if (mps && mps.account_id) {
          const productGroup = groupedMap.get(key);
          const target = productGroup.accounts.find(a => a.account_id === mps.account_id);
          if (target) {
            target.amount += offtakeDetail.amount;
          }
        }
      }
    
      const initialResult = Array.from(groupedMap.values());
      
      // เพิ่มการกรอง: เก็บเฉพาะสินค้าที่มี amount รวมทั้งหมด > 0
      const result = initialResult.filter(productGroup => {
        // คำนวณผลรวม amount ของทุก account ในสินค้านั้น
        const totalAmount = productGroup.accounts.reduce((sum, account) => sum + account.amount, 0);
        
        // ส่งคืน true หากผลรวม > 0 เพื่อเก็บรายการสินค้านี้ไว้
        return totalAmount > 0;
      });

      result.sort((a, b) => a.name.localeCompare(b.name));
    
      res.send({
        status: "success",
        data: result,
        uniqueAccountsList: allAccounts
      });
    
    } catch (err) {
        handleErrors(res, err, 'getTableProductOfftake');
    }
}

async function dashboard_stock_table(req, res) {
    try {
        // ✅ ดึงข้อมูล Area Manager IDs จาก `MapUserArea`
        const whereConditions_AreaManager = {};
        if (req.body.position_name != 'SuperAdmin') {
            if (req.body.group_customer_id) {
                whereConditions_AreaManager.group_customer_id = req.body.group_customer_id;
            }
        }

        const whereConditions_user_id = {};
        if (req.body.position_name != 'SuperAdmin' && req.body.position_name != 'Admin') {
            if (req.body.user_id) {
                whereConditions_user_id.user_id = req.body.user_id;
            }
        }

        let areaManagerData = await db.MapUserArea.findAll({
            attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('area_manager_id')), 'area_manager_id']],
            where: whereConditions_AreaManager,
            raw: true
        });

        const whereAreaManager = {};
        if (req.body.position_name == 'พนักงาน') {
            if (req.body.area_manager) {
                whereAreaManager.id = req.body.area_manager;
            }
        }else{
            whereAreaManager.id = areaManagerData.map(item => item.area_manager_id);
        }
        // ✅ ดึงชื่อ Area Manager จาก `AreaManager`
        let areaManagers = await db.AreaManager.findAll({
            attributes: ['id', 'name'],
            where: whereAreaManager,
            order: [['name', 'ASC']],
            raw: true
        });
        
        // ✅ ดึงข้อมูล Area Supervisor IDs จาก `MapUserArea`
        let areaSupervisorData = await db.MapUserArea.findAll({
            attributes: ['area_manager_id', 'area_supervisor_id'],
            where: { 
                area_manager_id: areaManagers.map(m => m.id),
                group_customer_id: req.body.group_customer_id
            },
            include: [
                { 
                    model: db.AreaSupervisor, 
                    as: 'areaSupervisor',
                    attributes: ['id', 'name']
                }
            ],
            order: [[Sequelize.col('areaSupervisor.name'), 'ASC']], // ✅ ใช้ Sequelize.col() เพื่ออ้างถึงฟิลด์ของ include model
            raw: true,
            nest: true
        });

        const whereAreaSupervisor = {};
        if (req.body.position_name == 'พนักงาน') {
            if (req.body.area_supervisor) {
                whereAreaSupervisor.id = req.body.area_supervisor;
            }
        }else{
            whereAreaSupervisor.id = areaSupervisorData.map(item => item.area_supervisor_id);
        }
        // ✅ ดึงชื่อ Area Supervisor จาก `AreaSupervisor`
        let areaSupervisors = await db.AreaSupervisor.findAll({
            attributes: ['id', 'name'],
            where: whereAreaSupervisor,
            order: [['name', 'ASC']],
            raw: true
        });
        
        // ✅ ดึงข้อมูลสินค้าและแบรนด์ที่เกี่ยวข้อง รวมถึงข้อมูล **Stock และ Account**
        let data = await db.Oos.findOne({
            order: [['id', 'DESC']],
            include: [{
                model: db.OosList,
                as: 'oosDetails',
                include: [{
                    model: db.MapProductStoreList,
                    as: 'mapProductStoreList',
                    include: [
                        {
                            model: db.Product,
                            as: 'product',
                            include: [
                                { model: db.Brand, as: 'brand' },
                                { model: db.SubBrand, as: 'subBrand' },
                                { model: db.Competitor, as: 'competitor' },
                                { model: db.ProductPromotion, as: 'productPromotion' },
                            ],
                            where:{
                                group_customer_id:req.body.group_customer_id
                            }
                        },
                        { 
                            model: db.MapProductStore, 
                            as: 'mapProductStore', 
                            attributes: ['id'],
                             include: [
                                { 
                                    model: db.Account, 
                                    as: 'account', 
                                    attributes: ['id', 'name'] 
                                }
                            ],
                            where:{
                                group_customer_id:req.body.group_customer_id
                            }
                        }
                    ]
                }]
            },{ 
                model: db.Store, 
                as: 'store', 
                where:{
                    group_customer_id:req.body.group_customer_id
                }
            }],
            where:whereConditions_user_id
        });

        // ตรวจสอบว่า data ที่ได้มามี oosDetails หรือไม่
        if (!data || !data.oosDetails || !Array.isArray(data.oosDetails)) {
            return res.send({ status: "success", groupedData: {}, uniqueAccountsList: [] });
        }
        
        // ✅ สร้างโครงสร้าง `groupedData`
        const groupedData = {};

        // ✅ จัดกลุ่มข้อมูลตาม Area Manager และ Area Supervisor
        for (const manager of areaManagers) {
            const managerName = manager.name;
            groupedData[managerName] = {}; // ✅ สร้างโครงสร้างให้ Area Manager

            const relatedSupervisors = areaSupervisorData.filter(item => item.area_manager_id === manager.id);
            for (const supervisorData of relatedSupervisors) {
                const supervisor = areaSupervisors.find(sup => sup.id === supervisorData.area_supervisor_id);
                if (supervisor) {
                    const supervisorName = supervisor.name;
                    groupedData[managerName][supervisorName] = {}; // ✅ สร้างโครงสร้างให้ Area Supervisor

                }
            }
        }

        const whereConditions = [];

        if (req.body.group_customer_id) whereConditions.push(`store.group_customer_id = '${req.body.group_customer_id}'`);
        if (req.body.area_manager) whereConditions.push(`user.area_manager = '${req.body.area_manager}'`);
        if (req.body.area_supervisor) whereConditions.push(`user.area_supervisor = '${req.body.area_supervisor}'`);
        if (req.body.user_id) whereConditions.push(`oos.user_id = '${req.body.user_id}'`);
        if (req.body.channel_id) whereConditions.push(`store.channel_id = '${req.body.channel_id}'`);
        if (req.body.account_id) whereConditions.push(`store.account_id = '${req.body.account_id}'`);
        if (req.body.store_name) whereConditions.push(`store.store_name LIKE '%${req.body.store_name}%'`);
        if (req.body.provinces_id) whereConditions.push(`store.provinces_id = '${req.body.provinces_id}'`);
        if (req.body.categoryId) whereConditions.push(`prod.categoryId = '${req.body.categoryId}'`);
        if (req.body.brand_id) whereConditions.push(`prod.brand_id = '${req.body.brand_id}'`);
        if (req.body.sub_brand_id) whereConditions.push(`prod.sub_brand_id = '${req.body.sub_brand_id}'`);
        if (req.body.product_name) whereConditions.push(`prod.id = '${req.body.product_name}'`);

        if (req.body.daterange) {
            const [startDate, endDate] = req.body.daterange.split(" to ");
            if (startDate && endDate) {
                whereConditions.push(`DATE(oos.datesave) BETWEEN '${startDate}' AND '${endDate}'`);
            }
        }
        
        const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(" AND ")}` : "";

        const query2 = `
        SELECT MIN(acc.id) AS account_id, acc.name AS account_name
        FROM tb_ooslist
        LEFT JOIN tb_oos AS oos ON tb_ooslist.oos_id = oos.id
        LEFT JOIN tb_map_product_store_list AS mpsl ON tb_ooslist.map_product_store_list_id = mpsl.id
        LEFT JOIN tb_map_product_store AS mps ON mpsl.map_product_id = mps.id
        LEFT JOIN tb_product AS prod ON mpsl.product_id = prod.id
        LEFT JOIN tb_account AS acc ON mps.account_id = acc.id
        LEFT JOIN tb_user AS user ON oos.user_id = user.id
        LEFT JOIN tb_store AS store ON mps.store_code = store.store_code
        LEFT JOIN tb_map_user_store_list AS store_list ON store.id = store_list.store_id
        WHERE 1=1 AND mpsl.stock = 'Y' AND prod.isActive = 'Y' AND store.isActive = 'Y'
        ${whereClause}
        GROUP BY acc.id, acc.name
        ORDER BY acc.id ASC;
        `;

        const rawData = await db.sequelize.query(query2, { type: db.Sequelize.QueryTypes.SELECT });
        const uniqueAccountsList = [
            ...new Map(
                rawData
                    .filter(item => item.account_id && item.account_name && Object.keys(item).length > 0)
                    .map(item => [item.account_id, { account_id: item.account_id, account_name: item.account_name }])
            ).values()
        ];

        const listIds = data.oosDetails.map(oosDetail => oosDetail.mapProductStoreList?.id).filter(Boolean);

        const allQtyData = await db.OosList.findAll({
            where: {
                map_product_store_list_id: { [Op.in]: listIds }
            },
            order: [['createdAt', 'DESC']],
            attributes: ['map_product_store_list_id', 'qty'],
            raw: true
        });

        const qtyMap = {};
        for (const item of allQtyData) {
            if (!qtyMap[item.map_product_store_list_id]) {
                qtyMap[item.map_product_store_list_id] = item.qty;
            }
        }

        const allAccountsData = await db.sequelize.query(`
        SELECT mpsl.id AS list_id, acc.id AS account_id, acc.name AS account_name
        FROM tb_map_product_store_list AS mpsl
        LEFT JOIN tb_map_product_store AS mps ON mpsl.map_product_id = mps.id
        LEFT JOIN tb_account AS acc ON mps.account_id = acc.id
        WHERE mpsl.stock = 'Y' AND mps.group_customer_id = '${req.body.group_customer_id}'
        `, { type: db.Sequelize.QueryTypes.SELECT });

        const accountMap = {};
        for (const row of allAccountsData) {
            if (!accountMap[row.list_id]) accountMap[row.list_id] = [];
            accountMap[row.list_id].push({
                account_id: row.account_id,
                account_name: row.account_name
            });
        }
        
        for (const oosDetails of data.oosDetails) {
            const product = oosDetails.mapProductStoreList?.product;
            const mapProductStoreListx = oosDetails.mapProductStoreList;
            if (!product || !mapProductStoreListx) continue;
          
            const brandName = product.brand ? product.brand.name : 'Unknown Brand';
            const listId = mapProductStoreListx.id;
            const latestQty = qtyMap[listId] || 0;
            const accounts = (accountMap[listId] || []).map(acc => ({
                ...acc,
                qty: latestQty
            }));
          
            for (const supervisorData of areaSupervisorData) {
                const manager = areaManagers.find(m => m.id === supervisorData.area_manager_id);
                const supervisor = areaSupervisors.find(sup => sup.id === supervisorData.area_supervisor_id);
          
                if (manager && supervisor) {
                    const managerName = manager.name;
                    const supervisorName = supervisor.name;
          
                    if (!groupedData[managerName][supervisorName]) {
                        groupedData[managerName][supervisorName] = {};
                    }
          
                    if (!groupedData[managerName][supervisorName][brandName]) {
                        groupedData[managerName][supervisorName][brandName] = [];
                    }
          
                    groupedData[managerName][supervisorName][brandName].push({
                        ...oosDetails.dataValues,
                        accounts
                    });
                }
            }
        }
  
        // ✅ ส่งผลลัพธ์ออกไป
        res.send({
            status: "success",
            groupedData,
            uniqueAccountsList
        });

    } catch (err) {
        handleErrors(res, err, 'dashboard_stock_table');
    }
}
async function dashboard_offtake_table(req, res) {
    try {
        // ✅ ดึงข้อมูล Area Manager IDs จาก `MapUserArea`
        const whereConditions_AreaManager = {};
        if (req.body.position_name != 'SuperAdmin') {
            if (req.body.group_customer_id) {
                whereConditions_AreaManager.group_customer_id = req.body.group_customer_id;
            }
        }

        const whereConditions_user_id = {};
        if (req.body.position_name != 'SuperAdmin' && req.body.position_name != 'Admin') {
            if (req.body.user_id) {
                whereConditions_user_id.user_id = req.body.user_id;
            }
        }

        let areaManagerData = await db.MapUserArea.findAll({
            attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('area_manager_id')), 'area_manager_id']],
            where: whereConditions_AreaManager,
            raw: true
        });

        const whereAreaManager = {};
        if (req.body.position_name == 'พนักงาน') {
            if (req.body.area_manager) {
                whereAreaManager.id = req.body.area_manager;
            }
        }else{
            whereAreaManager.id = areaManagerData.map(item => item.area_manager_id);
        }
        // ✅ ดึงชื่อ Area Manager จาก `AreaManager`
        let areaManagers = await db.AreaManager.findAll({
            attributes: ['id', 'name'],
            where: whereAreaManager,
            order: [['name', 'ASC']],
            raw: true
        });
        
        // ✅ ดึงข้อมูล Area Supervisor IDs จาก `MapUserArea`
        let areaSupervisorData = await db.MapUserArea.findAll({
            attributes: ['area_manager_id', 'area_supervisor_id'],
            where: { 
                area_manager_id: areaManagers.map(m => m.id),
                group_customer_id: req.body.group_customer_id
            },
            include: [
                { 
                    model: db.AreaSupervisor, 
                    as: 'areaSupervisor',
                    attributes: ['id', 'name']
                }
            ],
            order: [[Sequelize.col('areaSupervisor.name'), 'ASC']], // ✅ ใช้ Sequelize.col() เพื่ออ้างถึงฟิลด์ของ include model
            raw: true,
            nest: true
        });

        const whereAreaSupervisor = {};
        if (req.body.position_name == 'พนักงาน') {
            if (req.body.area_supervisor) {
                whereAreaSupervisor.id = req.body.area_supervisor;
            }
        }else{
            whereAreaSupervisor.id = areaSupervisorData.map(item => item.area_supervisor_id);
        }
        // ✅ ดึงชื่อ Area Supervisor จาก `AreaSupervisor`
        let areaSupervisors = await db.AreaSupervisor.findAll({
            attributes: ['id', 'name'],
            where: whereAreaSupervisor,
            order: [['name', 'ASC']],
            raw: true
        });
        
        // ✅ ดึงข้อมูลสินค้าและแบรนด์ที่เกี่ยวข้อง รวมถึงข้อมูล **Stock และ Account**
        let data = await db.Offtake.findOne({
            order: [['id', 'DESC']],
            include: [{
                model: db.OfftakeList,
                as: 'offtakeDetails',
                include: [{
                    model: db.MapProductStoreList,
                    as: 'mapProductStoreList',
                    include: [
                        {
                            model: db.Product,
                            as: 'product',
                            include: [
                                { model: db.Brand, as: 'brand' },
                                { model: db.SubBrand, as: 'subBrand' },
                                { model: db.Competitor, as: 'competitor' },
                                { model: db.ProductPromotion, as: 'productPromotion' },
                            ],
                            where:{
                                group_customer_id:req.body.group_customer_id
                            }
                        },
                        { 
                            model: db.MapProductStore, 
                            as: 'mapProductStore', 
                            attributes: ['id'],
                             include: [
                                { 
                                    model: db.Account, 
                                    as: 'account', 
                                    attributes: ['id', 'name'] 
                                }
                            ],
                            where:{
                                group_customer_id:req.body.group_customer_id
                            }
                        }
                    ]
                }]
            }],
            where:whereConditions_user_id
        });

        if (!data || !data.offtakeDetails || !Array.isArray(data.offtakeDetails)) {
            return res.send({ status: "success", groupedData: {}, uniqueAccountsList: [] });
        }
        
        const groupedData = {};

        for (const manager of areaManagers) {
            const managerName = manager.name;
            groupedData[managerName] = {}; 
            const relatedSupervisors = areaSupervisorData.filter(item => item.area_manager_id === manager.id);
            for (const supervisorData of relatedSupervisors) {
                const supervisor = areaSupervisors.find(sup => sup.id === supervisorData.area_supervisor_id);
                if (supervisor) {
                    const supervisorName = supervisor.name;
                    groupedData[managerName][supervisorName] = {};
                }
            }
        }

        const whereConditions = [];

        if (req.body.group_customer_id) whereConditions.push(`store.group_customer_id = '${req.body.group_customer_id}'`);
        if (req.body.area_manager) whereConditions.push(`user.area_manager = '${req.body.area_manager}'`);
        if (req.body.area_supervisor) whereConditions.push(`user.area_supervisor = '${req.body.area_supervisor}'`);
        if (req.body.user_id) whereConditions.push(`offtake.user_id = '${req.body.user_id}'`);
        if (req.body.channel_id) whereConditions.push(`store.channel_id = '${req.body.channel_id}'`);
        if (req.body.account_id) whereConditions.push(`store.account_id = '${req.body.account_id}'`);
        if (req.body.store_name) whereConditions.push(`store.store_name LIKE '%${req.body.store_name}%'`);
        if (req.body.provinces_id) whereConditions.push(`store.provinces_id = '${req.body.provinces_id}'`);
        if (req.body.categoryId) whereConditions.push(`prod.categoryId = '${req.body.categoryId}'`);
        if (req.body.brand_id) whereConditions.push(`prod.brand_id = '${req.body.brand_id}'`);
        if (req.body.sub_brand_id) whereConditions.push(`prod.sub_brand_id = '${req.body.sub_brand_id}'`);
        if (req.body.product_name) whereConditions.push(`prod.id = '${req.body.product_name}'`);

        if (req.body.daterange) {
            const [startDate, endDate] = req.body.daterange.split(" to ");
            if (startDate) {
                whereConditions.push(`DATE(offtake.datesave_start) >= '${startDate}' `);
            }
            if (endDate) {
                whereConditions.push(`DATE(offtake.datesave_end) <= '${endDate}'`);
            }
        }
        
        const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(" AND ")}` : "";


        const query2 = `
        SELECT MIN(acc.id) AS account_id, acc.name AS account_name
        FROM tb_offtakelist
        LEFT JOIN tb_offtake AS offtake ON tb_offtakelist.offtake_id = offtake.id
        LEFT JOIN tb_map_product_store_list AS mpsl ON tb_offtakelist.map_product_store_list_id = mpsl.id
        LEFT JOIN tb_map_product_store AS mps ON mpsl.map_product_id = mps.id
        LEFT JOIN tb_product AS prod ON mpsl.product_id = prod.id
        LEFT JOIN tb_account AS acc ON mps.account_id = acc.id
        LEFT JOIN tb_user AS user ON offtake.user_id = user.id
        LEFT JOIN tb_store AS store ON mps.store_code = store.store_code
        LEFT JOIN tb_map_user_store_list AS store_list ON store.id = store_list.store_id
        WHERE 1=1 AND mpsl.offtake = 'Y' AND prod.isActive = 'Y' AND store.isActive = 'Y'
        ${whereClause}
        GROUP BY acc.id, acc.name
        ORDER BY acc.id ASC;
        `;
        
        const rawData = await db.sequelize.query(query2, { type: db.Sequelize.QueryTypes.SELECT });
        const uniqueAccountsList = [
            ...new Map(
                rawData
                    .filter(item => item.account_id && item.account_name && Object.keys(item).length > 0)
                    .map(item => [item.account_id, { account_id: item.account_id, account_name: item.account_name }])
            ).values()
        ];
        
        const productPromises = data.offtakeDetails.map(async (offtakeDetails) => {
            const product = offtakeDetails.mapProductStoreList.product;
            const mapProductStoreListx = offtakeDetails.mapProductStoreList;
            if (!product) return null;

            const brandName = product.brand ? product.brand.name : 'Unknown Brand';

            const query2x = `
            SELECT MIN(acc.id) AS account_id, acc.name AS account_name
            FROM tb_offtakelist
            LEFT JOIN tb_offtake AS offtake ON tb_offtakelist.offtake_id = offtake.id
            LEFT JOIN tb_map_product_store_list AS mpsl ON tb_offtakelist.map_product_store_list_id = mpsl.id
            LEFT JOIN tb_map_product_store AS mps ON mpsl.map_product_id = mps.id
            LEFT JOIN tb_product AS prod ON mpsl.product_id = prod.id
            LEFT JOIN tb_account AS acc ON mps.account_id = acc.id
            LEFT JOIN tb_user AS user ON offtake.user_id = user.id
            LEFT JOIN tb_store AS store ON mps.store_code = store.store_code
            LEFT JOIN tb_map_user_store_list AS store_list ON store.id = store_list.store_id
            WHERE 1=1 AND mpsl.offtake = 'Y' AND prod.isActive = 'Y' AND store.isActive = 'Y'
            ${whereClause}
            GROUP BY acc.id, acc.name
            ORDER BY acc.id ASC;
            `;
            
            const rawDatax = await db.sequelize.query(query2x, { type: db.Sequelize.QueryTypes.SELECT });
            const uniqueAccountsListx = [
                ...new Map(
                    rawDatax
                        .filter(item => item.account_id && item.account_name && Object.keys(item).length > 0)
                        .map(item => [item.account_id, { account_id: item.account_id, account_name: item.account_name }])
                ).values()
            ];
            
            const uniqueAccounts = Array.from(new Map(
                uniqueAccountsListx.map(store => [store['account.id'], {
                    account_id: store['account.id'],
                    account_name: store['account.name']
                }])
            ).values());
            
            const offtakeData = await db.OfftakeList.findOne({
                where: { map_product_store_list_id: mapProductStoreListx.id },
                order: [['createdAt', 'DESC']],
                attributes: ['amount'],
                raw: true
            });

            const latestQty = offtakeData ? offtakeData.amount : 0;

            const storesWithQty = uniqueAccounts.map(store => ({
                account_id: store['account_id'],
                account_name: store['account_name'],
                qty: latestQty,
            }));

            for (const supervisorData of areaSupervisorData) {
                const manager = areaManagers.find(m => m.id === supervisorData.area_manager_id);
                const supervisor = areaSupervisors.find(sup => sup.id === supervisorData.area_supervisor_id);

                if (manager && supervisor) {
                    const managerName = manager.name;
                    const supervisorName = supervisor.name;

                    if (!groupedData[managerName][supervisorName]) {
                        groupedData[managerName][supervisorName] = {};
                    }

                    if (!groupedData[managerName][supervisorName][brandName]) {
                        groupedData[managerName][supervisorName][brandName] = [];
                    }

                    groupedData[managerName][supervisorName][brandName].push({
                        ...offtakeDetails.dataValues,
                        accounts: storesWithQty,
                    });
                }
            }
        });

        await Promise.all(productPromises);

        res.send({
            status: "success",
            groupedData,
            uniqueAccountsList
        });

    } catch (err) {
        handleErrors(res, err, 'dashboard_offtake_table');
    }
}
async function dashboard_offtake(req, res) {
    try {
        const whereConditions = [];

        // ✅ ดักค่าที่ส่งมา และสร้างเงื่อนไขการกรอง
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

        if (req.body.daterange) {
            const [startDate, endDate] = req.body.daterange.split(" to ");
            if (startDate) {
                whereConditions.push(`DATE(offtake.datesave_start) >= '${startDate}' `);
            }
            if (endDate) {
                whereConditions.push(`DATE(offtake.datesave_end) <= '${endDate}'`);
            }
        }

        const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(" AND ")}` : "";

        // --- START: SQL QUERY CORRECTION ---
        // เปลี่ยนจาก WITH clause (CTE) มาเป็น Subquery ใน FROM clause
        // เพื่อให้รองรับ MySQL/MariaDB เวอร์ชันเก่า
        const query = `
            SELECT 
                offtake_list.id AS offtake_list_id,
                store.id AS store_id,
                acc.id AS account_id,
                acc.name AS account_name,
                brand.id AS brand_id,
                brand.name AS brand_name,
                prod.id AS product_id,
                prod.name AS product_name,
                prod.flavor AS flavor,
                offtake_list.amount AS amount,
                mpsl.id AS map_product_store_list_id
            FROM tb_offtakelist AS offtake_list
            JOIN tb_offtake offtake ON offtake_list.offtake_id = offtake.id
            JOIN tb_store store ON offtake.store_id = store.id
            JOIN tb_account acc ON store.account_id = acc.id
            JOIN tb_map_product_store_list mpsl ON offtake_list.map_product_store_list_id = mpsl.id
            JOIN tb_product prod ON mpsl.product_id = prod.id
            JOIN tb_brand brand ON prod.brand_id = brand.id
            JOIN tb_map_product_store mps ON mpsl.map_product_id = mps.id
            JOIN tb_user user ON offtake.user_id = user.id
                AND mpsl.isActive = 'Y' AND mpsl.offtake = 'Y'
                AND amount > 0
                ${whereClause}
            ORDER BY acc.id ASC;
        `;
        // --- END: SQL QUERY CORRECTION ---

        const rawData = await db.sequelize.query(query, {
            type: db.Sequelize.QueryTypes.SELECT
        });
        
        const groupedData = {};
        const productSummary = {};
        const brandSummary = {};

        rawData.forEach(item => {
            const {
                account_id,
                account_name,
                brand_id,
                brand_name,
                product_id,
                product_name,
                flavor,
                amount,
                offtake_list_id
            } = item;

            if (!groupedData[account_id]) {
                groupedData[account_id] = {
                    account_id,
                    account_name,
                    total_amount: 0,
                    brands: [],
                };
            }
            groupedData[account_id].total_amount += amount;

            let brandInAccount = groupedData[account_id].brands.find(b => b.brand_id === brand_id);
            if (brandInAccount) {
                brandInAccount.total_amount += amount;
            } else {
                groupedData[account_id].brands.push({ brand_id, brand_name, total_amount: amount });
            }

            if (!brandSummary[product_id]) {
                brandSummary[product_id] = {
                    product_id,
                    product_name,
                    flavor,
                    brand_id,
                    brand_name,
                    total_amount: 0,
                    total_products: new Set(),
                    total_offtakelists: new Set(),
                };
            }
            brandSummary[product_id].total_amount += amount;
            brandSummary[product_id].total_products.add(product_id);
            brandSummary[product_id].total_offtakelists.add(offtake_list_id);

            if (!productSummary[product_id]) {
                productSummary[product_id] = {
                    product_id,
                    product_name,
                    flavor,
                    total_amount: 0,
                    brand_id,
                    brand_name,
                };
            }
            productSummary[product_id].total_amount += amount;
        });

        Object.values(groupedData).forEach(account => {
            account.brands.sort((a, b) => a.brand_id - b.brand_id);
        });

        const top5_offtake_products = Object.values(brandSummary)
            .sort((a, b) => b.total_amount - a.total_amount)
            .slice(0, 5)
            .map((item, index) => ({
                rank: index + 1,
                brand_name: item.brand_name,
                brand_id: item.brand_id,
                product_name: item.product_name,
                flavor: item.flavor,
                product_id: item.product_id,
                total_amount: item.total_amount,
                total_products: item.total_products.size,
                total_offtakelists: item.total_offtakelists.size,
            }));

        const less5_offtake_products = Object.values(brandSummary)
            .sort((a, b) => a.total_amount - b.total_amount)
            .slice(0, 5)
            .map((item, index) => ({
                rank: index + 1,
                brand_name: item.brand_name,
                brand_id: item.brand_id,
                product_name: item.product_name,
                flavor: item.flavor,
                product_id: item.product_id,
                total_amount: item.total_amount
            }));

        const result = Object.values(groupedData);

        res.send({
            status: "success",
            data: result,
            top5_offtake_products,
            less5_offtake_products,
            query,
            rawData
        });

    } catch (err) {
        handleErrors(res, err, 'dashboard_offtake');
    }
}

module.exports = {
    dashboard_oos,
    dashboard_oos_test,
    dashboard_stock_test,
    dashboard_stock_table,
    dashboard_offtake_table,
    dashboard_offtake,
    dashboard_premium_test,
    dashboard_compliance,
    dashboard_extra,
    areaManagers,
    areaSupervisor,
    getBrands,
    getBrandsOfftake,
    getTableProduct,
    getTableProductOfftake
};