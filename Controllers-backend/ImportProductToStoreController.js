const db = require("../models")

const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const { json } = require("sequelize");
const Op = db.Sequelize.Op

// --- Main HTTP Handler ---
// ไม่มีการแก้ไขในส่วนนี้ ยังคงทำหน้าที่รับไฟล์และเรียกฟังก์ชันหลัก
async function import_productTostore(req, res) {
    //console.log(req.files.file_excel);
    try {
        let file = req.files.file_excel;
        if (!file) {
            return res.status(400).send({ status: "error", message: "No file uploaded" });
        }
        var ext = file.name.split(".").pop();
        var today = new Date();
        var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + '-' +
            today.getHours() + "" + today.getMinutes() + "" + today.getSeconds();
        var new_name = date + '.' + ext;

        const filePath = './uploads/excel/' + new_name;
        await file.mv(filePath);

        // เปลี่ยนให้การอ่านไฟล์เป็นส่วนหนึ่งของ try-catch หลัก
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);
        
        // ลบไฟล์หลังจากอ่านข้อมูลเสร็จ
        fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) console.error("Error deleting temp file: ", unlinkErr);
        });
        
        // เรียกใช้ฟังก์ชันที่ปรับปรุงใหม่
        await insert_ProductToStore_Optimized(data);

        // ตอบกลับ client ทันทีว่าสำเร็จ
        return res.send({ status: "success", message: "File processed and data import started successfully.", data });

    } catch (error) {
        console.error("Error in import_productTostore: ", error);
        return res.status(500).send({ status: "error", message: error.message || "Error processing file" });
    }
}

// --- Optimized Data Insertion Function ---
// นี่คือฟังก์ชันที่ถูกเขียนขึ้นใหม่ทั้งหมดเพื่อประสิทธิภาพสูงสุด
async function insert_ProductToStore_Optimized(data) {
    const t = await db.sequelize.transaction(); // เริ่ม Transaction
    try {
        // --- Step 1: รวบรวมข้อมูล Master ที่ไม่ซ้ำทั้งหมดจาก Excel ---
        //console.log("Step 1: Gathering unique data from Excel...");
        
        const uniqueGroupCustomerNames = [...new Set(data.map(row => row['กลุ่มลูกค้า']).filter(Boolean))];
        
        const uniqueAccounts = [...new Set(data.map(row => JSON.stringify({ name: row['Account'], groupName: row['กลุ่มลูกค้า'] })).filter(Boolean))].map(str => JSON.parse(str));
        
        const uniqueAccountTypes = [...new Set(data.map(row => JSON.stringify({ name: row['Account Type'], groupName: row['กลุ่มลูกค้า'], accountName: row['Account'] })).filter(Boolean))].map(str => JSON.parse(str));
        
        const uniqueMapProductStores = [...new Set(data.map(row => JSON.stringify({ name: row['Group Name'], groupName: row['กลุ่มลูกค้า'], accountName: row['Account'], accountTypeName: row['Account Type'] })).filter(Boolean))].map(str => JSON.parse(str));

        const uniqueProducts = [...new Set(data.map(row => JSON.stringify({ name: row['สินค้า'], flavor: row['Product Flavor'] ?? null, groupName: row['กลุ่มลูกค้า'] })).filter(Boolean))].map(str => JSON.parse(str));

        // --- Step 2: สร้างและดึงข้อมูล Master ทั้งหมด และสร้าง Map เพื่อการค้นหาที่รวดเร็ว ---
        //console.log("Step 2: Bulk creating and fetching master data...");

        // GroupCustomer
        await db.GroupCustomer.bulkCreate(
            uniqueGroupCustomerNames.map(name => ({ name, isActive: 'Y' })),
            { ignoreDuplicates: true, transaction: t }
        );
        const groupCustomers = await db.GroupCustomer.findAll({ where: { name: uniqueGroupCustomerNames }, transaction: t });
        const groupCustomerMap = new Map(groupCustomers.map(gc => [gc.name, gc]));

        // Account
        await db.Account.bulkCreate(
            uniqueAccounts.map(acc => ({ 
                name: acc.name, 
                group_customer_id: groupCustomerMap.get(acc.groupName)?.id, 
                isActive: 'Y' 
            })).filter(acc => acc.group_customer_id),
            { ignoreDuplicates: true, transaction: t }
        );
        const accounts = await db.Account.findAll({ transaction: t });
        const accountMap = new Map(accounts.map(acc => [`${acc.name}_${acc.group_customer_id}`, acc]));

        // AccountType
        await db.AccountType.bulkCreate(
            uniqueAccountTypes.map(at => {
                const groupCustomer = groupCustomerMap.get(at.groupName);
                const account = accountMap.get(`${at.accountName}_${groupCustomer?.id}`); 
                return {
                    name: at.name,
                    group_customer_id: groupCustomer?.id,
                    account_id: account?.id,
                    isActive: 'Y'
                }
            }).filter(at => at.group_customer_id && at.account_id),
            { ignoreDuplicates: true, transaction: t }
        );

        const accountTypes = await db.AccountType.findAll({ transaction: t });
        const accountTypeMap = new Map(accountTypes.map(at => [`${at.name}_${at.group_customer_id}_${at.account_id}`, at]));


        // MapProductStore
        await db.MapProductStore.bulkCreate(
            uniqueMapProductStores.map(mps => {
                const groupCustomer = groupCustomerMap.get(mps.groupName);
                const account = accountMap.get(`${mps.accountName}_${groupCustomer?.id}`);
                const accountType = accountTypeMap.get(`${mps.accountTypeName}_${groupCustomer?.id}_${account?.id}`); 
                return {
                    name: mps.name,
                    group_customer_id: groupCustomer?.id,
                    account_id: account?.id,
                    account_type_id: accountType?.id,
                    group_customer_name: mps.groupName,
                    account_name: mps.accountName,
                    account_type_name: mps.accountTypeName,
                    group_name: mps.name,
                    isActive: 'Y'
                };
            }).filter(mps => mps.group_customer_id && mps.account_id && mps.account_type_id),
            { ignoreDuplicates: true, transaction: t }
        );
        const mapProductStores = await db.MapProductStore.findAll({ transaction: t });
        const mapProductStoreMap = new Map(mapProductStores.map(mps => [`${mps.name}_${mps.group_customer_id}_${mps.account_id}_${mps.account_type_id}`, mps]));
        // Product
        await db.Product.bulkCreate(
            uniqueProducts.map(p => ({
                name: p.name,
                flavor: p.flavor,
                group_customer_id: groupCustomerMap.get(p.groupName)?.id,
                isActive: 'Y'
            })).filter(p => p.group_customer_id),
            { ignoreDuplicates: true, transaction: t }
        );
        const products = await db.Product.findAll({ transaction: t });
        const productMap = new Map(products.map(p => [`${p.name}_${p.flavor}_${p.group_customer_id}`, p]));
        
        // --- Step 3: เตรียมข้อมูลสุดท้ายสำหรับ MapProductStoreList ---
        //console.log("Step 3: Preparing final data for insertion...");
        let productTostoresListToInsert = [];
        for (const row of data) {
            const groupCustomer = groupCustomerMap.get(row['กลุ่มลูกค้า']);
            if (!groupCustomer) continue; // ข้ามแถวที่ไม่มีข้อมูลหลัก

            const account = accountMap.get(`${row['Account']}_${groupCustomer.id}`);
            const accountType = accountTypeMap.get(`${row['Account Type']}_${groupCustomer.id}_${account?.id}`);
            const mapProductStore = mapProductStoreMap.get(`${row['Group Name']}_${groupCustomer.id}_${account?.id}_${accountType?.id}`);
            const product = productMap.get(`${row['สินค้า']}_${row['Product Flavor'] ?? null}_${groupCustomer.id}`);

            if (mapProductStore && product) {
                productTostoresListToInsert.push({
                    map_product_id: mapProductStore.id,
                    product_id: product.id,
                    oos: row['OOS'] ? 'Y' : 'N',
                    stock: row['Stock'] ? 'Y' : 'N',
                    price: row['Price'] ? 'Y' : 'N',
                    offtake: row['Offtake'] ? 'Y' : 'N',
                    week: row['12Week'] ? 'Y' : 'N',
                    area: row['พื้นที่'] ? 'Y' : 'N',
                    msl: row['MSL'] ? 'Y' : 'N',
                });
            }
        }
        
        // กรองข้อมูลซ้ำที่อาจเกิดขึ้นใน Array ก่อน Insert
        const uniqueKeys = new Set();
        const uniqueProductTostoresList = productTostoresListToInsert;

        // --- Step 4: Bulk Insert ข้อมูลสุดท้าย ---
        //console.log(`Step 4: Bulk inserting ${uniqueProductTostoresList.length} records into MapProductStoreList...`);
        if (uniqueProductTostoresList.length > 0) {
            await db.MapProductStoreList.bulkCreate(uniqueProductTostoresList, {
                transaction: t,
                updateOnDuplicate: [
                    "oos", 
                    "stock", 
                    "price", 
                    "offtake", 
                    "week", 
                    "area", 
                    "msl"
                ] 
            });
        }

        // --- Step 5: Commit Transaction ---
        await t.commit();
        //console.log('Optimized import completed successfully!');

    } catch (error) {
        // --- Rollback Transaction on Error ---
        console.error("Error during optimized data insertion: ", error.message, error.stack);
        // [FIX] ตรวจสอบว่า transaction ยังไม่ถูกปิด ก่อนที่จะสั่ง rollback
        if (t && !t.finished) {
            await t.rollback();
        }
        throw new Error("Error inserting data with optimized function.");
    }
}

async function read_excel(path) {
    try {
        const workbook = xlsx.readFile(path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json(worksheet);
        fs.unlink(path, (unlinkErr) => {
            if (unlinkErr) {
                console.error("Error deleting file: ", unlinkErr);
            }
        });
        return jsonData;
    } catch (error) {
        console.error("Error reading file: ", error);
        throw new Error("Error reading Excel file"); // Throw an error to be handled in import_store
    }
}
module.exports = {
    import_productTostore,
}
