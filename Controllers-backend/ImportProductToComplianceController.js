const db = require("../models")

const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const { json } = require("sequelize");
const { stack } = require("sequelize/lib/utils");
const { group } = require("console");
const Op = db.Sequelize.Op


async function import_productTocompliance(req, res) {
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
        await file.mv('./uploads/excel/' + new_name);
        let data = await read_excel('./uploads/excel/' + new_name);
        
        // เรียกใช้ฟังก์ชัน import
        await insert_ProductTocompliance(data);

        // ถ้าไม่เกิด Error ใดๆ จะส่ง response สำเร็จกลับไป
        return res.send({ status: "success", message: "Import data successfully." });

    } catch (error) {
        // ===== จุดที่แก้ไขสำคัญ =====
        // เมื่อ catch error จาก insert_ProductTocompliance ให้นำ message มาแสดงผล
        console.error("Error in import_productTocompliance:", error.message);
        
        // ส่ง status 400 (Bad Request) พร้อมกับข้อความ Error ที่เจาะจงกลับไปหา User
        return res.send({ 
            status: "error", 
            message: error.message // <--- ใช้ error.message ที่ถูกโยนมาจากฟังก์ชันด้านใน
        });
        // =========================
    }
}

/**
 * [REFACTORED & UPSERT LOGIC] เพิ่ม Logic การ Update ข้อมูลที่มีอยู่แล้ว
 */
async function insert_ProductTocompliance(data) {
    // ฟังก์ชันแปลงวันที่ยังคงเดิม
    function excelDateToJSDate(serial) {
        if (!serial) return null;
        if (!isNaN(serial)) {
            const utc_days = Math.floor(serial - 25569);
            const utc_value = utc_days * 86400;
            const date_info = new Date(utc_value * 1000);
            const isoDate = new Date(date_info.getTime() + (7 * 60 * 60 * 1000));
            return isoDate.toISOString().split('T')[0];
        }
        if (typeof serial === 'string') {
            const d = new Date(serial);
            if (!isNaN(d)) return d.toISOString().split('T')[0];
        }
        return null;
    }

    const transaction = await db.sequelize.transaction();

    try {
        console.log('Step 1: Processing Excel data and finding/creating related records...');
        const potentialComplianceList = [];
        let errorCount = 0;
        
        // ===== จุดที่เพิ่มเข้ามาที่ 1: สร้าง Array เพื่อเก็บ Store ที่ไม่พบ =====
        const missingStores = [];
        // ===============================================================

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            try {
                if (!row['กลุ่มลูกค้า'] || !row['Account'] || !row['รหัสสโตร์']) {
                    console.warn(`Skipping row ${i + 2} due to missing critical data.`);
                    errorCount++;
                    continue;
                }

                const [groupCustomer] = await db.GroupCustomer.findOrCreate({ where: { name: row['กลุ่มลูกค้า'] }, defaults: { name: row['กลุ่มลูกค้า'], isActive: 'Y' }, transaction });
                const [account] = await db.Account.findOrCreate({ where: { name: row['Account'], group_customer_id: groupCustomer.id }, defaults: { name: row['Account'], isActive: 'Y', group_customer_id: groupCustomer.id }, transaction });
                const [accountType] = await db.AccountType.findOrCreate({ where: { name: row['Account Type'], account_id: account.id }, defaults: { name: row['Account Type'], isActive: 'Y', account_id: account.id }, transaction });
                const [province] = await db.Provinces.findOrCreate({ where: { name_in_thai: row['จังหวัด'] }, defaults: { name_in_thai: row['จังหวัด'], isActive: 'Y' }, transaction });
                const [channel] = await db.Channel.findOrCreate({ where: { name: row['Channel'], group_customer_id: groupCustomer.id }, defaults: { name: row['Channel'], isActive: 'Y', group_customer_id: groupCustomer.id }, transaction });
                const [placementPoint] = await db.PlacementPoint.findOrCreate({ where: { name: row['ตำแหน่งที่วาง'], group_customer_id: groupCustomer.id }, defaults: { name: row['ตำแหน่งที่วาง'], isActive: 'Y', group_customer_id: groupCustomer.id }, transaction });
                const [rentalAreaUnit] = await db.RentalAreaUnit.findOrCreate({ where: { name: row['พื้นที่เช่า'], unit: row['หน่วย'], account_id: account.id }, defaults: { name: row['พื้นที่เช่า'], unit: row['หน่วย'], isActive: 'Y', group_customer_id: groupCustomer.id, account_id: account.id }, transaction });
                const [product] = await db.Product.findOrCreate({ where: { name: row['สินค้า'], flavor: row['Product Flavor'] ?? null }, defaults: { name: row['สินค้า'], flavor: row['Product Flavor'] ?? null, group_customer_id: groupCustomer.id, isActive: 'Y' }, transaction });
                
                if (!groupCustomer || !account || !product) {
                    throw new Error("Failed to get critical related data (GroupCustomer, Account, or Product).");
                }

                // ===== จุดที่แก้ไข: เปลี่ยนจาก findOrCreate เป็น findOne =====
                const store = await db.Store.findOne({
                    where: {
                        store_code: row['รหัสสโตร์'],
                        store_name: row['สาขา'],
                        group_customer_id: groupCustomer.id,
                        account_id: account.id,
                        channel_id: channel.id,
                        account_type_id: accountType.id,
                    },
                    transaction
                });

                // ถ้าไม่พบ Store ให้เก็บชื่อไว้ใน Array แล้วข้ามไปทำงานแถวถัดไป
                if (!store) {
                    const storeIdentifier = `${row['สาขา']} (รหัส: ${row['รหัสสโตร์']})`;
                    if (!missingStores.includes(storeIdentifier)) {
                        missingStores.push(storeIdentifier);
                    }
                    console.warn(`Skipping row ${i + 2} because store was not found: ${storeIdentifier}`);
                    continue; // ข้ามการประมวลผลสำหรับแถวนี้
                }
                // ===== สิ้นสุดจุดที่แก้ไข =====

                const [mapStoreCompliance, isNewMap] = await db.MapStoreCompliance.findOrCreate({ where: { store_id: store.id, name: row['Group Name'] }, defaults: { store_id: store.id, name: row['Group Name'], isActive: 'Y' }, transaction });

                if (!isNewMap) {
                    await mapStoreCompliance.update({ isActive: 'Y' }, { transaction });
                }
                
                if (product && mapStoreCompliance) {
                    const qty = parseInt(row['จำนวน'], 10);
                    const startDate = excelDateToJSDate(row['วันเริ่มต้น']);
                    const endDate = excelDateToJSDate(row['วันสิ้นสุด']);

                    potentialComplianceList.push({
                        map_product_id: mapStoreCompliance.id,
                        product_id: product.id,
                        placement_point_id: placementPoint?.id,
                        rental_area_unit_id: rentalAreaUnit?.id,
                        rental_area_unit_name: rentalAreaUnit?.id,
                        qty: isNaN(qty) ? 0 : qty,
                        startdate: startDate || new Date(),
                        enddate: endDate || new Date()
                    });
                }
            } catch (rowError) {
                console.error(`Error processing Excel row ${i + 2}:`, row);
                console.error(rowError.message);
                errorCount++;
            }
        }
        
        // ===== จุดที่เพิ่มเข้ามาที่ 2: ตรวจสอบและโยน Error หากมี Store ที่ไม่พบ =====
        console.log(missingStores);
        if (missingStores.length > 0) {
            // สร้างข้อความ Error ที่ชัดเจน
            const errorMessage = `ไม่พบ Store ต่อไปนี้ในระบบ: ${missingStores.join(', ')}. กรุณาตรวจสอบข้อมูลก่อน Import ใหม่อีกครั้ง`;
            throw new Error(errorMessage);
        }
        // ===============================================================

        // ส่วนที่เหลือของโค้ดทำงานตามปกติ หากไม่มี Error เกิดขึ้น
        console.log(`Step 2: Separating records for insert and update...`);
        const recordsToInsert = [];
        const recordsToUpdate = [];

        if (potentialComplianceList.length > 0) {
            const whereClauses = potentialComplianceList.map(item => ({ map_product_id: item.map_product_id, product_id: item.product_id }));
            const existingItems = await db.MapStoreComplianceList.findAll({ where: { [Op.or]: whereClauses }, transaction });
            const existingItemsMap = new Map(existingItems.map(item => [`${item.map_product_id}-${item.product_id}`, item]));

            for (const item of potentialComplianceList) {
                const key = `${item.map_product_id}-${item.product_id}`;
                const existingItem = existingItemsMap.get(key);

                if (existingItem) {
                    recordsToUpdate.push({ id: existingItem.id, data: item });
                } else {
                    recordsToInsert.push(item);
                }
            }
        }
        
        console.log(`Step 3: Inserting ${recordsToInsert.length} new records and updating ${recordsToUpdate.length} existing records.`);

        if (recordsToInsert.length > 0) {
            await db.MapStoreComplianceList.bulkCreate(recordsToInsert, { transaction });
        }

        if (recordsToUpdate.length > 0) {
            await Promise.all(
                recordsToUpdate.map(item =>
                    db.MapStoreComplianceList.update(item.data, {
                        where: { id: item.id },
                        transaction
                    })
                )
            );
        }

        await transaction.commit();
        console.log('Data import completed successfully!');

    } catch (error) {
        await transaction.rollback();
        // แก้ไขการแสดงผล error ให้ชัดเจนขึ้น
        console.error("Error during data import process: ", error.message ); 
        throw new Error(error.message); // โยน error message ที่เราสร้างขึ้นเองกลับไป
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
        throw new Error("Error reading Excel file");
    }
}

module.exports = {
    import_productTocompliance,
}
