const db = require("../models");
const { Sequelize, sequelize } = db; // ✅ เพิ่ม sequelize ที่ใช้ execute query

const { validation, getPagingData, getPagination } = require("../utilities/function");
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op;
const path = require('path');
const fs = require('fs');

const ExcelJS = require('exceljs');
const { now } = require("sequelize/lib/utils");

// ฟังก์ชันสำหรับ Export Excel
async function exceloos(req, res) {
    const userid = req.params.id;
    const startDate_select = req.params.startDate_select;
    const endDate_select = req.params.endDate_select;
    try {
        if (!userid) {
            return res.status(400).send('User code is required');
        }

        const Userdata = await db.User.findOne({
            where: { id: userid },
            include: [{ model: db.Position, as: 'position', required: false }]
        });
        if (!Userdata || !Userdata.position) {
            return res.status(404).send('User or User position not found');
        }

        const whereConditions = [];
        let startDate;
        let endDate;
        const today = new Date();
        const todayISO = today.toISOString().slice(0, 10);

        if (Userdata.position.name !== 'พนักงาน') {
            startDate = startDate_select || todayISO;
            endDate = endDate_select || todayISO;
        } else {
            endDate = todayISO;
            const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            startDate = firstDayOfLastMonth.toISOString().slice(0, 10);
        }

        if (startDate && startDate !== "null" && endDate && endDate !== "null") {
            whereConditions.push(`CAST(oos.datesave AS DATE) BETWEEN '${startDate}' AND '${endDate}'`);
        }

        // --- Logic การกรองตามตำแหน่ง (เหมือนเดิม) ---
        if (Userdata.position.name === 'Assistant Management' || Userdata.position.name === 'Management') {
            // whereConditions.push(`(position.name = 'พนักงาน' OR position.name = 'Supervisor')`);
            if (Userdata.group_customer_id) whereConditions.push(`mps.group_customer_id = '${Userdata.group_customer_id}'`);
            // if (Userdata.area_manager) whereConditions.push(`user.area_manager = '${Userdata.area_manager}'`);
        } else if (Userdata.position.name !== 'SuperAdmin') {
            if (Userdata.position.name == 'พนักงาน') {
                if (userid) whereConditions.push(`oos.user_id = '${userid}'`);
            } else if (Userdata.position.name == 'Supervisor') {
                if (Userdata.group_customer_id) whereConditions.push(`mps.group_customer_id = '${Userdata.group_customer_id}'`);
                if (Userdata.area_supervisor) whereConditions.push(`user.area_supervisor = '${Userdata.area_supervisor}'`);
                if (Userdata.area_manager) whereConditions.push(`user.area_manager = '${Userdata.area_manager}'`);
            } else if (Userdata.position.name == 'Management' || Userdata.position.name == 'Admin') {
                if (Userdata.group_customer_id) whereConditions.push(`mps.group_customer_id = '${Userdata.group_customer_id}'`);
            }
        }
        
        if (req.params.group_id != "null") whereConditions.push(`oos.group_id = '${parseInt(req.params.group_id)}'`);
        if (req.params.store_id != "null") whereConditions.push(`oos.store_id = '${parseInt(req.params.store_id)}'`);
        if (req.params.user_id != "null") whereConditions.push(`oos.user_id = '${parseInt(req.params.user_id)}'`);

        const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(" AND ")}` : "";

        // --- เริ่มส่วนของการเขียนไฟล์แบบ Stream ---
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + `OOS-Stock-data-${Date.now()}.xlsx`);

        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res, useStyles: true, useSharedStrings: true });
        const worksheet = workbook.addWorksheet('OOS & Stock Data');

        worksheet.columns = [
            { header: 'วันที่ทำรายงาน', key: 'datesave', width: 15 },
            { header: 'กลุ่มลูกค้า', key: 'group_customer_id', width: 15 },
            { header: 'Area Manager (VIP2)', key: 'areaManager_name', width: 20 },
            { header: 'เขต Supervisor', key: 'areaSupervisor_name', width: 20 },
            { header: 'รหัสพนักงาน', key: 'user_code', width: 15 },
            { header: 'ชื่อ-นามสกุล', key: 'user_fullname', width: 25 },
            { header: 'Channel', key: 'channel_name', width: 15 },
            { header: 'Account', key: 'account_id', width: 20 },
            { header: 'รหัสสโตร์', key: 'store_code', width: 15 },
            { header: 'สาขา', key: 'store_name', width: 25 },
            { header: 'Account Type', key: 'account_type_id', width: 15 },
            { header: 'Group Name', key: 'name', width: 15 },
            { header: 'จังหวัด', key: 'province_thai', width: 15 },
            { header: 'Category', key: 'cate_name', width: 15 },
            { header: 'Brand', key: 'brand_name', width: 15 },
            { header: 'Sub brand', key: 'sub_brand_name', width: 15 },
            { header: 'ชื่อสินค้า', key: 'product_name', width: 30 },
            { header: 'Flavor', key: 'product_flavor', width: 15 },
            { header: 'ไม่ขาย', key: 'not_sell', width: 10 },
            { header: 'สต๊อกคงเหลือ', key: 'qty', width: 15 },
            { header: 'ไม่มี OOS/มี OOS', key: 'oos_status', width: 20 },
            { header: 'Report oos', key: 'oos', width: 15 },
            { header: 'Report Stock', key: 'stock', width: 15 },
            { header: 'เหตุผล', key: 'note_name', width: 30 },
        ];
        
        const BATCH_SIZE = 15000;
        let offset = 0;
        let hasMoreData = true;

        while (hasMoreData) {
            // ✅ [แก้ไข] ใช้ SQL Query ใหม่ที่รวมทุกอย่างและกรองข้อมูลซ้ำแล้ว
            const query = `
                WITH RankedOOSExport AS (
                    SELECT 
                        ooslist.not_sell, ooslist.qty, ooslist.oos_status,
                        store.store_code, store.store_name, mpsl.oos, mpsl.stock, oos.datesave,
                        gc.name AS group_customer_id, user.code AS user_code,
                        CONCAT(user.name, ' ', user.last_name) AS user_fullname,
                        acc.name AS account_id,
                        mps.branch_name, acct.name AS account_type_id, mps.name,
                        cate.name AS cate_name, brand.name AS brand_name, subbrand.name AS sub_brand_name,
                        prod.name AS product_name, prod.id AS product_id, prod.flavor AS product_flavor,
                        provinces.name_in_thai AS province_thai,
                        note.name AS note_name, channel.name AS channel_name,
                        areaManager.name AS areaManager_name,
                        areaSupervisor.name AS areaSupervisor_name,
                        ROW_NUMBER() OVER (
                            PARTITION BY store.id, acc.name, prod.name, oos.user_id 
                            ORDER BY oos.datesave DESC
                        ) AS rn
                    FROM tb_ooslist AS ooslist
                    LEFT JOIN tb_oos AS oos ON ooslist.oos_id = oos.id
                    LEFT JOIN tb_map_product_store_list AS mpsl ON ooslist.map_product_store_list_id = mpsl.id
                    LEFT JOIN tb_map_product_store AS mps ON mpsl.map_product_id = mps.id
                    
                    -- ✅ [แก้ไข] ย้าย JOIN ของ store ขึ้นมาก่อน
                    LEFT JOIN tb_store AS store ON oos.store_id = store.id
                    -- ✅ แล้วจึง JOIN account โดยอ้างอิงจาก store
                    LEFT JOIN tb_account AS acc ON store.account_id = acc.id

                    LEFT JOIN tb_account_type AS acct ON mps.account_type_id = acct.id
                    LEFT JOIN tb_group_customer AS gc ON mps.group_customer_id = gc.id
                    LEFT JOIN tb_product AS prod ON mpsl.product_id = prod.id
                    LEFT JOIN tb_category AS cate ON prod.categoryId = cate.id
                    LEFT JOIN tb_brand AS brand ON prod.brand_id = brand.id
                    LEFT JOIN tb_sub_brand AS subbrand ON prod.sub_brand_id = subbrand.id
                    LEFT JOIN tb_user AS user ON oos.user_id = user.id
                    LEFT JOIN tb_position AS position ON user.position_id = position.id
                    -- ❌ ลบ JOIN ของ store ที่ซ้ำซ้อนจากตำแหน่งเดิมด้านล่างออกแล้ว
                    LEFT JOIN tb_provinces AS provinces ON store.provinces_id = provinces.id
                    LEFT JOIN tb_noteoosstock AS note ON ooslist.note = note.id
                    LEFT JOIN tb_channel AS channel ON store.channel_id = channel.id
                    LEFT JOIN tb_area_manager AS areaManager ON user.area_manager = areaManager.id
                    LEFT JOIN tb_area_supervisor AS areaSupervisor ON user.area_supervisor = areaSupervisor.id
                    WHERE mpsl.isActive = 'Y' AND (mpsl.oos = 'Y' OR mpsl.stock = 'Y')
                    ${whereClause}
                )
                SELECT * FROM RankedOOSExport
                WHERE rn = 1
                ORDER BY datesave DESC
                LIMIT ${BATCH_SIZE} OFFSET ${offset};
            `;
            
            console.log(`Exporting OOS/Stock... Fetching batch, offset: ${offset}`);
            const batchData = await db.sequelize.query(query, { type: db.Sequelize.QueryTypes.SELECT });

            if (batchData.length === 0) {
                hasMoreData = false;
                continue;
            }
            
            // ✅ [แก้ไข] ลบการ query ข้อมูลเสริมซ้ำซ้อนออกไปแล้ว

            // ✅ [แก้ไข] วน Loop เพิ่มข้อมูลทีละแถวโดยใช้ข้อมูลจาก Query หลักโดยตรง
            for (const row of batchData) {
                worksheet.addRow({
                    datesave: row.datesave,
                    group_customer_id: row.group_customer_id,
                    areaManager_name: row.areaManager_name || 'N/A',
                    areaSupervisor_name: row.areaSupervisor_name || 'N/A',
                    user_code: row.user_code,
                    user_fullname: row.user_fullname,
                    channel_name: row.channel_name || 'N/A',
                    account_id: row.account_id,
                    store_code: row.store_code,
                    store_name: row.store_name,
                    account_type_id: row.account_type_id,
                    name: row.name,
                    province_thai: row.province_thai,
                    cate_name: row.cate_name || 'N/A',
                    brand_name: row.brand_name || 'N/A',
                    sub_brand_name: row.sub_brand_name || 'N/A',
                    product_name: row.product_name,
                    product_flavor: row.product_flavor || 'N/A',
                    not_sell: row.not_sell === 'Y' ? 'Yes' : 'No',
                    qty: row.qty || 0,
                    oos_status: row.oos_status === 'Y' ? 'Yes' : 'No',
                    oos: row.oos === 'Y' ? 'Yes' : 'No',
                    stock: row.stock === 'Y' ? 'Yes' : 'No',
                    note_name: row.note_name || '',
                }).commit();
            }
            
            offset += BATCH_SIZE;
        }

        worksheet.commit();
        await workbook.commit();
        console.log('OOS/Stock Excel export finished successfully.');

    } catch (error) {
        console.error('Error exporting OOS/Stock Excel:', error);
        if (!res.headersSent) {
            res.status(500).send('Error exporting Excel: ' + error.stack);
        } else {
            res.end();
        }
    }
}

async function excelofftake(req, res) {
    const userid = req.params.id;
    const startDate_select = req.params.startDate_select;
    const endDate_select = req.params.endDate_select;
    try {
        if (!userid) {
            return res.status(400).send('User code is required');
        }

        // ✅ FIX 1: เพิ่มการตรวจสอบ Userdata และ Position เพื่อป้องกันแอปแครช
        const Userdata = await db.User.findOne({
            where: { id: userid },
            include: [{ model: db.Position, as: 'position', required: false }]
        });
        if (!Userdata || !Userdata.position) {
            return res.status(404).send('User or User position not found');
        }

        // ✅ FIX 2: แก้ไข Logic การกรองตำแหน่งสำหรับ Assistant Management
        const whereConditions = [];

        let startDate;
        let endDate;

        const today = new Date();
        const todayISO = today.toISOString().slice(0, 10);

        if (Userdata.position.name !== 'พนักงาน') {
            startDate = startDate_select || todayISO;
            endDate = endDate_select || todayISO;
        } else {
            endDate = todayISO;
            const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            startDate = firstDayOfLastMonth.toISOString().slice(0, 10);
        }

        if (startDate && startDate !== "null" && endDate && endDate !== "null") {
            const finalCondition = `CAST(offtake.datenow AS DATE) BETWEEN '${startDate}' AND '${endDate}'`;
            console.log("Final SQL WHERE condition:", finalCondition); 
            whereConditions.push(finalCondition);
        }

        if (Userdata.position.name === 'Assistant Management' || Userdata.position.name === 'Management') {
            // whereConditions.push(`(position.name = 'พนักงาน' OR position.name = 'Supervisor')`);
            if (Userdata.group_customer_id) whereConditions.push(`mps.group_customer_id = '${Userdata.group_customer_id}'`);
            // if (Userdata.area_manager) whereConditions.push(`user.area_manager = '${Userdata.area_manager}'`);
        } else if (Userdata.position.name !== 'SuperAdmin') {
            if (Userdata.position.name == 'พนักงาน') {
                if (userid) whereConditions.push(`offtake.user_id = '${userid}'`);
            } else if (Userdata.position.name == 'Supervisor') {
                if (Userdata.group_customer_id) whereConditions.push(`mps.group_customer_id = '${Userdata.group_customer_id}'`);
                if (Userdata.area_supervisor) whereConditions.push(`user.area_supervisor = '${Userdata.area_supervisor}'`);
                if (Userdata.area_manager) whereConditions.push(`user.area_manager = '${Userdata.area_manager}'`);
            } else if (Userdata.position.name == 'Management' || Userdata.position.name == 'Admin') {
                if (Userdata.group_customer_id) whereConditions.push(`mps.group_customer_id = '${Userdata.group_customer_id}'`);
            }
        }

        if (req.params.group_id != "null") whereConditions.push(`offtake.group_id = '${parseInt(req.params.group_id)}'`);
        if (req.params.store_id != "null") whereConditions.push(`offtake.store_id = '${parseInt(req.params.store_id)}'`);
        if (req.params.user_id != "null") whereConditions.push(`offtake.user_id = '${parseInt(req.params.user_id)}'`);

        const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(" AND ")}` : "";

        // --- เริ่มส่วนของการเขียนไฟล์แบบ Stream ---
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + `Offtake-data-${Date.now()}.xlsx`);

        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res, useStyles: true, useSharedStrings: true });
        const worksheet = workbook.addWorksheet('Offtake Data');

        worksheet.columns = [
            { header: 'เริ่มต้น', key: 'datesave_start', width: 15 }, { header: 'สิ้นสุด', key: 'datesave_end', width: 15 },
            { header: 'กลุ่มลูกค้า', key: 'group_customer_id', width: 15 }, { header: 'Area Manager (VIP2)', key: 'area_manager', width: 20 },
            { header: 'เขต Supervisor', key: 'area_supervisor', width: 20 }, { header: 'รหัสพนักงาน', key: 'user_code', width: 15 },
            { header: 'ชื่อ', key: 'user_name', width: 15 }, { header: 'นามสกุล', key: 'user_lastname', width: 15 },
            { header: 'Channel', key: 'channel_name', width: 15 }, // ✅ เพิ่ม Channel กลับเข้ามา
            { header: 'Account', key: 'account_id', width: 20 }, { header: 'รหัสสโตร์', key: 'store_code', width: 15 },
            { header: 'สาขา', key: 'store_name', width: 25 }, { header: 'Account Type', key: 'account_type_id', width: 15 },
            { header: 'Group Name', key: 'name', width: 15 }, { header: 'จังหวัด', key: 'province_name', width: 15 },
            { header: 'ชื่อสินค้า', key: 'product_name', width: 30 }, { header: 'Flavor', key: 'product_flavor', width: 15 },
            { header: 'Category', key: 'cate_name', width: 15 }, { header: 'Brand', key: 'brand_name', width: 15 },
            { header: 'Sub brand', key: 'sub_brand_name', width: 15 },
            { header: 'ไม่ขาย', key: 'not_sell', width: 10 }, { header: 'ยอดขาย', key: 'amount', width: 10 },
            { header: 'ราคาขาย/หน่วย', key: 'note', width: 30 },
        ];
        
        const BATCH_SIZE = 15000;
        let offset = 0;
        let hasMoreData = true;

        while (hasMoreData) {
            // ✅ FIX 3: ลบ GROUP BY ที่ไม่มีประสิทธิภาพ และเพิ่ม channel.name
            const query = `
                SELECT 
                    offtakelist.not_sell, offtakelist.amount, offtakelist.note,
                    offtake.user_id, store.store_code, store.store_name, mpsl.offtake, mpsl.stock,
                    gc.name AS group_customer_id, user.code AS user_code, user.name AS user_name, 
                    user.last_name AS user_lastname, area_supervisor.name AS area_supervisor,
                    area_manager.name AS area_manager, acc.name AS account_id,
                    mps.branch_name AS branch_name, acct.name AS account_type_id, mps.name AS name,
                    provinces.name_in_thai AS province_name, cate.name AS cate_name, brand.name AS brand_name,
                    subbrand.name AS sub_brand_name, prod.name AS product_name, prod.id AS product_id,
                    prod.flavor AS product_flavor, offtake.datesave_start AS datesave_start,
                    offtake.datesave_end AS datesave_end, offtake.datenow AS datenow,
                    channel.name AS channel_name
                FROM tb_offtakelist AS offtakelist
                LEFT JOIN tb_offtake AS offtake ON offtakelist.offtake_id = offtake.id
                LEFT JOIN tb_map_product_store_list AS mpsl ON offtakelist.map_product_store_list_id = mpsl.id
                LEFT JOIN tb_map_product_store AS mps ON mpsl.map_product_id = mps.id
                LEFT JOIN tb_account AS acc ON mps.account_id = acc.id
                LEFT JOIN tb_account_type AS acct ON mps.account_type_id = acct.id
                LEFT JOIN tb_group_customer AS gc ON mps.group_customer_id = gc.id
                LEFT JOIN tb_product AS prod ON mpsl.product_id = prod.id
                LEFT JOIN tb_category AS cate ON prod.categoryId = cate.id
                LEFT JOIN tb_brand AS brand ON prod.brand_id = brand.id
                LEFT JOIN tb_sub_brand AS subbrand ON prod.sub_brand_id = subbrand.id
                LEFT JOIN tb_user AS user ON offtake.user_id = user.id
                LEFT JOIN tb_position AS position ON user.position_id = position.id
                LEFT JOIN tb_area_manager AS area_manager ON user.area_manager = area_manager.id
                LEFT JOIN tb_area_supervisor AS area_supervisor ON user.area_supervisor = area_supervisor.id
                LEFT JOIN tb_store AS store ON offtake.store_id = store.id
                LEFT JOIN tb_provinces AS provinces ON store.provinces_id = provinces.id
                LEFT JOIN tb_channel AS channel ON store.channel_id = channel.id
                WHERE mpsl.isActive = 'Y' AND mpsl.offtake = 'Y'
                ${whereClause}
                ORDER BY offtake.datesave_start ASC, offtakelist.id DESC
                LIMIT ${BATCH_SIZE} OFFSET ${offset};
            `;

            //console.log(`Exporting Offtake... Fetching batch, offset: ${offset}`);
            const batchData = await db.sequelize.query(query, { type: db.Sequelize.QueryTypes.SELECT });

            if (batchData.length === 0) {
                hasMoreData = false;
                continue;
            }

            for (const row of batchData) {
                // แปลงค่า Y/N สำหรับคอลัมน์ not_sell
                const notSellValue = row.not_sell === 'Y' ? 'Yes' : 'No';

                worksheet.addRow({
                    ...row, // ใช้ Spread Operator เพราะชื่อ Field ส่วนใหญ่ตรงกับ Key ใน Column
                    not_sell: notSellValue // ใช้ค่าที่แปลงแล้ว
                }).commit();
            }

            offset += BATCH_SIZE;
        }
        
        worksheet.commit();
        await workbook.commit();
        //console.log('Offtake Excel export finished successfully.');

    } catch (error) {
        console.error('====== EXCEL OFFTAKE ERROR START ======');
        console.error('Timestamp:', new Date().toISOString());
        console.error('Error Message:', error.message);
        console.error('Error Stack:', error.stack);
        console.error('====== EXCEL OFFTAKE ERROR END ======');
        if (!res.headersSent) {
            res.status(500).send('Error exporting Offtake Excel: ' + error.stack);
        } else {
            res.end();
        }
    }
}

async function excelweek(req, res) {
    const userid = req.params.id;
    const startDate_select = req.params.startDate_select;
    const endDate_select = req.params.endDate_select;
    try {
        if (!userid) {
            return res.status(400).send('User code is required');
        }

        // ✅ FIX 1: เพิ่มการตรวจสอบ Userdata และ Position เพื่อป้องกันแอปแครช
        const Userdata = await db.User.findOne({
            where: { id: userid },
            include: [{ model: db.Position, as: 'position', required: false }]
        });
        if (!Userdata || !Userdata.position) {
            return res.status(404).send('User or User position not found');
        }

        // ✅ FIX 2: แก้ไข Logic การกรองตำแหน่งสำหรับ Assistant Management
        const whereConditions = [];

        let startDate;
        let endDate;

        const today = new Date();
        const todayISO = today.toISOString().slice(0, 10);

        if (Userdata.position.name !== 'พนักงาน') {
            startDate = startDate_select || todayISO;
            endDate = endDate_select || todayISO;
        } else {
            endDate = todayISO;
            const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            startDate = firstDayOfLastMonth.toISOString().slice(0, 10);
        }

        if (startDate && startDate !== "null" && endDate && endDate !== "null") {
            const finalCondition = `CAST(week.datesave AS DATE) BETWEEN '${startDate}' AND '${endDate}'`;
            console.log("Final SQL WHERE condition:", finalCondition); 
            whereConditions.push(finalCondition);
        }

        if (Userdata.position.name === 'Assistant Management' || Userdata.position.name === 'Management') {
            // whereConditions.push(`(position.name = 'พนักงาน' OR position.name = 'Supervisor')`);
            if (Userdata.group_customer_id) whereConditions.push(`mps.group_customer_id = '${Userdata.group_customer_id}'`);
            // if (Userdata.area_manager) whereConditions.push(`user.area_manager = '${Userdata.area_manager}'`);
        } else if (Userdata.position.name !== 'SuperAdmin') {
            if (Userdata.position.name == 'พนักงาน') {
                if (userid) whereConditions.push(`week.user_id = '${userid}'`);
            } else if (Userdata.position.name == 'Supervisor') {
                if (Userdata.group_customer_id) whereConditions.push(`mps.group_customer_id = '${Userdata.group_customer_id}'`);
                if (Userdata.area_supervisor) whereConditions.push(`user.area_supervisor = '${Userdata.area_supervisor}'`);
                if (Userdata.area_manager) whereConditions.push(`user.area_manager = '${Userdata.area_manager}'`);
            } else if (Userdata.position.name == 'Management' || Userdata.position.name == 'Admin') {
                if (Userdata.group_customer_id) whereConditions.push(`mps.group_customer_id = '${Userdata.group_customer_id}'`);
            }
        }
        
        if (req.params.group_id != "null") whereConditions.push(`week.group_id = '${parseInt(req.params.group_id)}'`);
        if (req.params.store_id != "null") whereConditions.push(`week.store_id = '${parseInt(req.params.store_id)}'`);
        if (req.params.user_id != "null") whereConditions.push(`week.user_id = '${parseInt(req.params.user_id)}'`);

        const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(" AND ")}` : "";

        // --- เริ่มส่วนของการเขียนไฟล์แบบ Stream ---
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + `12-Week-data-${Date.now()}.xlsx`);

        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res, useStyles: true, useSharedStrings: true });
        const worksheet = workbook.addWorksheet('12 Week Data');

        worksheet.columns = [
            { header: 'วันที่ทำรายงาน', key: 'datesave', width: 15 }, { header: 'วันที่เริ่มของ Week 1', key: 'startweek', width: 15 },
            { header: 'กลุ่มลูกค้า', key: 'group_customer_id', width: 15 }, { header: 'Area Manager (VIP2)', key: 'area_manager', width: 20 },
            { header: 'เขต Supervisor', key: 'area_supervisor', width: 20 }, { header: 'รหัสพนักงาน', key: 'user_code', width: 15 },
            { header: 'ชื่อ', key: 'user_name', width: 15 }, { header: 'นามสกุล', key: 'user_lastname', width: 15 },
            { header: 'Channel', key: 'channel_name', width: 15 }, { header: 'Account', key: 'account_id', width: 20 },
            { header: 'รหัสสโตร์', key: 'store_code', width: 15 }, { header: 'สาขา', key: 'store_name', width: 25 },
            { header: 'Account Type', key: 'account_type_id', width: 15 }, { header: 'Group Name', key: 'name', width: 15 },
            { header: 'จังหวัด', key: 'province_name', width: 15 }, { header: 'ชื่อสินค้า', key: 'product_name', width: 30 },
            { header: 'Flavor', key: 'product_flavor', width: 15 }, { header: 'Category', key: 'cate_name', width: 15 },
            { header: 'Brand', key: 'brand_name', width: 15 }, { header: 'Sub brand', key: 'sub_brand_name', width: 15 },
            { header: 'T Rank', key: 't_rank', width: 10 }, { header: 'หมายเหตุ', key: 'note', width: 30 },
            { header: 'period week1', key: 'week1Range', width: 12 }, { header: 'Week1', key: 'week1', width: 10 },
            { header: 'period week2', key: 'week2Range', width: 12 }, { header: 'Week2', key: 'week2', width: 10 },
            { header: 'period week3', key: 'week3Range', width: 12 }, { header: 'Week3', key: 'week3', width: 10 },
            { header: 'period week4', key: 'week4Range', width: 12 }, { header: 'Week4', key: 'week4', width: 10 },
            { header: 'period week5', key: 'week5Range', width: 12 }, { header: 'Week5', key: 'week5', width: 10 },
            { header: 'period week6', key: 'week6Range', width: 12 }, { header: 'Week6', key: 'week6', width: 10 },
            { header: 'period week7', key: 'week7Range', width: 12 }, { header: 'Week7', key: 'week7', width: 10 },
            { header: 'period week8', key: 'week8Range', width: 12 }, { header: 'Week8', key: 'week8', width: 10 },
            { header: 'period week9', key: 'week9Range', width: 12 }, { header: 'Week9', key: 'week9', width: 10 },
            { header: 'period week10', key: 'week10Range', width: 12 }, { header: 'Week10', key: 'week10', width: 10 },
            { header: 'period week11', key: 'week11Range', width: 12 }, { header: 'Week11', key: 'week11', width: 10 },
            { header: 'period week12', key: 'week12Range', width: 12 }, { header: 'Week12', key: 'week12', width: 10 },
        ];

        const BATCH_SIZE = 15000;
        let offset = 0;
        let hasMoreData = true;

        while (hasMoreData) {
            // ✅ FIX 3: ลบ GROUP BY ที่ไม่มีประสิทธิภาพออก
            const query = `
                WITH ranked_promos AS (
                    SELECT 
                        weeklist.*, ROW_NUMBER() OVER (PARTITION BY weeklist.id ORDER BY week.datesave DESC) as rn,
                        week.user_id, week.startweek, store.store_code, store.store_name, mpsl.price AS mpsl_price,
                        mpsl.isActive AS mpsl_isActive, gc.name AS group_customer_id, user.code AS user_code,
                        user.name AS user_name, user.last_name AS user_lastname, area_supervisor.name AS area_supervisor,
                        area_manager.name AS area_manager, acc.name AS account_id, mps.branch_name AS branch_name,
                        acct.name AS account_type_id, mps.name AS name, cate.name AS cate_name,
                        brand.name AS brand_name, subbrand.name AS sub_brand_name, prod.name AS product_name,
                        prod.id AS product_id, prod.flavor AS product_flavor, week.datesave AS datesave,
                        channel.name AS channel_name, provinces.name_in_thai AS province_name
                    FROM tb_weeklist AS weeklist
                    LEFT JOIN tb_week AS week ON weeklist.week_id = week.id
                    LEFT JOIN tb_map_product_store_list AS mpsl ON weeklist.map_product_store_list_id = mpsl.id
                    LEFT JOIN tb_map_product_store AS mps ON mpsl.map_product_id = mps.id
                    LEFT JOIN tb_account AS acc ON mps.account_id = acc.id
                    LEFT JOIN tb_account_type AS acct ON mps.account_type_id = acct.id
                    LEFT JOIN tb_group_customer AS gc ON mps.group_customer_id = gc.id
                    LEFT JOIN tb_product AS prod ON mpsl.product_id = prod.id
                    LEFT JOIN tb_category AS cate ON prod.categoryId = cate.id
                    LEFT JOIN tb_brand AS brand ON prod.brand_id = brand.id
                    LEFT JOIN tb_sub_brand AS subbrand ON prod.sub_brand_id = subbrand.id
                    LEFT JOIN tb_user AS user ON week.user_id = user.id
                    LEFT JOIN tb_position AS position ON user.position_id = position.id
                    LEFT JOIN tb_area_manager AS area_manager ON user.area_manager = area_manager.id
                    LEFT JOIN tb_area_supervisor AS area_supervisor ON user.area_supervisor = area_supervisor.id
                    LEFT JOIN tb_store AS store ON week.store_id = store.id
                    LEFT JOIN tb_provinces AS provinces ON store.provinces_id = provinces.id
                    LEFT JOIN tb_channel AS channel ON store.channel_id = channel.id
                    WHERE mpsl.isActive = 'Y' AND mpsl.week = 'Y'
                    ${whereClause}
                )
                SELECT * FROM ranked_promos WHERE rn = 1
                ORDER BY datesave ASC, id DESC
                LIMIT ${BATCH_SIZE} OFFSET ${offset};
            `;

            //console.log(`Exporting 12 Week... Fetching batch, offset: ${offset}`);
            const batchData = await db.sequelize.query(query, { type: db.Sequelize.QueryTypes.SELECT });

            if (batchData.length === 0) {
                hasMoreData = false;
                continue;
            }

            for (const row of batchData) {
                const rowData = {
                    datesave: row.datesave, startweek: row.startweek, group_customer_id: row.group_customer_id,
                    area_manager: row.area_manager, area_supervisor: row.area_supervisor, user_code: row.user_code,
                    user_name: row.user_name, user_lastname: row.user_lastname, channel_name: row.channel_name,
                    account_id: row.account_id, store_code: row.store_code, store_name: row.store_name,
                    account_type_id: row.account_type_id, name: row.name, province_name: row.province_name,
                    cate_name: row.cate_name, brand_name: row.brand_name, sub_brand_name: row.sub_brand_name,
                    product_name: row.product_name, product_flavor: row.product_flavor, t_rank: row.t_rank || 0,
                    note: row.note || '', week1: row.week1 || 0, week2: row.week2 || 0, week3: row.week3 || 0,
                    week4: row.week4 || 0, week5: row.week5 || 0, week6: row.week6 || 0, week7: row.week7 || 0,
                    week8: row.week8 || 0, week9: row.week9 || 0, week10: row.week10 || 0, week11: row.week11 || 0,
                    week12: row.week12 || 0,
                };
                
                // คำนวณช่วงวันที่และใส่ใน rowData
                if (row.startweek) {
                    let currentWeekStart = new Date(row.startweek);
                    const formatDate = (date) => `${date.getDate()}/${date.getMonth() + 1}`;
                    for (let i = 1; i <= 12; i++) {
                        const currentWeekEnd = new Date(currentWeekStart);
                        currentWeekEnd.setDate(currentWeekStart.getDate() + 6);
                        rowData[`week${i}Range`] = `${formatDate(currentWeekStart)} - ${formatDate(currentWeekEnd)}`;
                        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
                    }
                }
                
                const addedRow = worksheet.addRow(rowData);
                
                // ✅ FIX 4: ย้ายการใส่ Style มาทำทันทีหลังจาก addRow
                // ใช้ไม่ได้กับ .eachRow ในโหมด Stream
                for (let i = 1; i <= 12; i++) {
                    const cell = addedRow.getCell(`week${i}Range`);
                    cell.fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FF87CEEB' }, // สีฟ้า SkyBlue
                    };
                }

                addedRow.commit();
            }

            offset += BATCH_SIZE;
        }

        worksheet.commit();
        await workbook.commit();
        //console.log('12 Week Excel export finished successfully.');

    } catch (error) {
        console.error('Error exporting 12 Week Excel:', error);
        if (!res.headersSent) {
            res.status(500).send('Error exporting Excel: ' + error.stack);
        } else {
            res.end();
        }
    }
}

async function excelprice(req, res) {
    try {
        const userid = req.params.id;
        const startDate_select = req.params.startDate_select;
        const endDate_select = req.params.endDate_select;
        if (!userid) {
            return res.status(400).send('User code is required');
        }

        const Userdata = await db.User.findOne({
            where: { id: userid },
            include: [{
                model: db.Position,
                as: 'position',
                required: false,
            }]
        });

        if (!Userdata || !Userdata.position) {
            return res.status(404).send('User or User Position not found');
        }

        const whereConditions = [];

        let startDate;
        let endDate;

        const today = new Date();
        const todayISO = today.toISOString().slice(0, 10);

        if (Userdata.position.name !== 'พนักงาน') {
            startDate = startDate_select || todayISO;
            endDate = endDate_select || todayISO;
        } else {
            endDate = todayISO;
            const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            startDate = firstDayOfLastMonth.toISOString().slice(0, 10);
        }

        if (startDate && startDate !== "null" && endDate && endDate !== "null") {
            const finalCondition = `CAST(pricepromotion.datesave AS DATE) BETWEEN '${startDate}' AND '${endDate}'`;
            console.log("Final SQL WHERE condition:", finalCondition); 
            whereConditions.push(finalCondition);
        }

        if (Userdata.position.name !== 'SuperAdmin') {
            if (Userdata.position.name == 'พนักงาน') {
                if (userid) whereConditions.push(`pricepromotion.user_id = '${userid}'`);
            } else if (Userdata.position.name == 'Supervisor') {
                if (Userdata.group_customer_id) whereConditions.push(`mps.group_customer_id = '${Userdata.group_customer_id}'`);
                if (Userdata.area_supervisor) whereConditions.push(`user.area_supervisor = '${Userdata.area_supervisor}'`);
                if (Userdata.area_manager) whereConditions.push(`user.area_manager = '${Userdata.area_manager}'`);
            } else if (Userdata.position.name == 'Assistant Management' || Userdata.position.name == 'Management') {
                const positionConditions = `(position.name = 'พนักงาน' OR position.name = 'Supervisor')`;
                whereConditions.push(positionConditions);
                if (Userdata.group_customer_id) whereConditions.push(`mps.group_customer_id = '${Userdata.group_customer_id}'`);
                if (Userdata.area_manager) whereConditions.push(`user.area_manager = '${Userdata.area_manager}'`);
            } else if (Userdata.position.name == 'Management' || Userdata.position.name == 'Admin') {
                if (Userdata.group_customer_id) whereConditions.push(`mps.group_customer_id = '${Userdata.group_customer_id}'`);
            }
        }

        if (req.params.group_id != "null") whereConditions.push(`pricepromotion.group_id = '${parseInt(req.params.group_id)}'`);
        if (req.params.store_id != "null") whereConditions.push(`pricepromotion.store_id = '${parseInt(req.params.store_id)}'`);
        if (req.params.user_id != "null") whereConditions.push(`pricepromotion.user_id = '${parseInt(req.params.user_id)}'`);

        const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(" AND ")}` : "";

        // --- ส่วนของการเขียนไฟล์แบบ Stream ---

        // 1. ตั้งค่า Header สำหรับการส่งไฟล์แบบ Stream
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=' + `Price-Promotion-data-${Date.now()}.xlsx`
        );

        // 2. สร้าง WorkbookWriter สำหรับการเขียนแบบ Stream
        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
            stream: res, // เขียนข้อมูลลงใน response stream โดยตรง
            useStyles: true,
            useSharedStrings: true
        });
        const worksheet = workbook.addWorksheet('Price & Promotion Data');
        
        // 3. กำหนด Columns (เหมือนเดิม แต่แก้ key ของ Promotion)
        worksheet.columns = [
            { header: 'วันที่ทำรายงาน', key: 'datesave', width: 15 },
            { header: 'กลุ่มลูกค้า', key: 'group_customer_id', width: 10 },
            { header: 'Area Manager (VIP2)', key: 'area_manager', width: 15 },
            { header: 'เขต Supervisor', key: 'area_supervisor', width: 15 },
            { header: 'รหัสพนักงาน', key: 'user_code', width: 15 },
            { header: 'ชื่อ', key: 'user_name', width: 15 },
            { header: 'นามสกุล', key: 'user_lastname', width: 15 },
            { header: 'Channel', key: 'channel_name', width: 15 },
            { header: 'Account', key: 'account_id', width: 15 },
            { header: 'รหัสสโตร์', key: 'store_code', width: 15 },
            { header: 'สาขา', key: 'store_name', width: 15 },
            { header: 'Account Type', key: 'account_type_id', width: 15 },
            { header: 'Group Name', key: 'name', width: 10 },
            { header: 'จังหวัด', key: 'province_name', width: 10 },
            { header: 'ชื่อสินค้า', key: 'product_name', width: 30 },
            { header: 'Flavor', key: 'product_flavor', width: 15 },
            { header: 'Category', key: 'cate_name', width: 15 },
            { header: 'Brand', key: 'brand_name', width: 15 },
            { header: 'Sub brand', key: 'sub_brand_name', width: 15 },
            { header: 'ไม่ขาย', key: 'not_sell', width: 10 },
            { header: 'ราคาปกติ', key: 'price', width: 10 },
            { header: 'Promotion', key: 'promotion_name_data', width: 20 },
            { header: 'ราคาพิเศษ', key: 'special_price', width: 10 },
            { header: 'ช่วงวันที่', key: 'daterange', width: 25 },
            { header: 'หมายเหตุ', key: 'note', width: 10 },
            { header: 'W1 ตั้งต้น', key: 'qty_start', width: 10 }, { header: 'W1 รับเข้า', key: 'qty_in', width: 10 }, { header: 'W1 ใช้ไป', key: 'qty_out', width: 10 }, { header: 'W1 คงเหลือ', key: 'stock', width: 10 },
            { header: 'W2 ตั้งต้น', key: 'qty_start2', width: 10 }, { header: 'W2 รับเข้า', key: 'qty_in2', width: 10 }, { header: 'W2 ใช้ไป', key: 'qty_out2', width: 10 }, { header: 'W2 คงเหลือ', key: 'stock2', width: 10 },
            { header: 'W3 ตั้งต้น', key: 'qty_start3', width: 10 }, { header: 'W3 รับเข้า', key: 'qty_in3', width: 10 }, { header: 'W3 ใช้ไป', key: 'qty_out3', width: 10 }, { header: 'W3 คงเหลือ', key: 'stock3', width: 10 },
            { header: 'W4 ตั้งต้น', key: 'qty_start4', width: 10 }, { header: 'W4 รับเข้า', key: 'qty_in4', width: 10 }, { header: 'W4 ใช้ไป', key: 'qty_out4', width: 10 }, { header: 'W4 คงเหลือ', key: 'stock4', width: 10 },
            { header: 'รูปภาพ', key: 'picture', width: 10 },
        ];

        const BATCH_SIZE = 15000; // ดึงข้อมูลทีละ 15000 แถว (ปรับค่านี้ได้ตามความเหมาะสม)
        let offset = 0;
        let hasMoreData = true;
        const BASE_IMAGE_URL = 'https://test.iservreport.com/';

        // 4. วน Loop ดึงข้อมูลจาก DB ทีละชุด (Pagination)
        while (hasMoreData) {
            const query = `
                WITH ranked_promos AS (
                    SELECT 
                        pricepromotionlist.*,
                        -- ✅ [แก้ไขตรงนี้] เปลี่ยนเงื่อนไขการจัดกลุ่มข้อมูล
                        ROW_NUMBER() OVER (PARTITION BY user.code, store.store_code, mps.account_type_id, prod.name ORDER BY pricepromotion.datesave DESC) as rn,
                        pricepromotion.user_id, store.store_code, store.store_name, mpsl.price AS mpsl_price,
                        mpsl.isActive AS mpsl_isActive, gc.name AS group_customer_id, user.code AS user_code,
                        user.name AS user_name, user.last_name AS user_lastname, area_supervisor.name AS area_supervisor,
                        area_manager.name AS area_manager, acc.name AS account_id, mps.branch_name AS branch_name,
                        acct.name AS account_type_id, mps.name AS name, cate.name AS cate_name,
                        brand.name AS brand_name, subbrand.name AS sub_brand_name, prod.name AS product_name,
                        prod.id AS product_id, prod.flavor AS product_flavor, pricepromotion.datesave AS datesave,
                        channel.name AS channel_name, provinces.name_in_thai AS province_name,
                        p.name AS promotion_name_data
                    FROM tb_pricepromotionlist AS pricepromotionlist
                    LEFT JOIN tb_pricepromotion AS pricepromotion ON pricepromotionlist.pricepromotion_id = pricepromotion.id
                    LEFT JOIN tb_map_product_store_list AS mpsl ON pricepromotionlist.map_product_store_list_id = mpsl.id
                    LEFT JOIN tb_map_product_store AS mps ON mpsl.map_product_id = mps.id
                    LEFT JOIN tb_account AS acc ON mps.account_id = acc.id
                    LEFT JOIN tb_account_type AS acct ON mps.account_type_id = acct.id
                    LEFT JOIN tb_group_customer AS gc ON mps.group_customer_id = gc.id
                    LEFT JOIN tb_product AS prod ON mpsl.product_id = prod.id
                    LEFT JOIN tb_category AS cate ON prod.categoryId = cate.id
                    LEFT JOIN tb_brand AS brand ON prod.brand_id = brand.id
                    LEFT JOIN tb_sub_brand AS subbrand ON prod.sub_brand_id = subbrand.id
                    LEFT JOIN tb_user AS user ON pricepromotion.user_id = user.id
                    LEFT JOIN tb_position AS position ON user.position_id = position.id
                    LEFT JOIN tb_area_manager AS area_manager ON user.area_manager = area_manager.id
                    LEFT JOIN tb_area_supervisor AS area_supervisor ON user.area_supervisor = area_supervisor.id
                    LEFT JOIN tb_store AS store ON pricepromotion.store_id = store.id
                    LEFT JOIN tb_provinces AS provinces ON store.provinces_id = provinces.id
                    LEFT JOIN tb_channel AS channel ON store.channel_id = channel.id
                    LEFT JOIN tb_promotion AS p ON pricepromotionlist.promotion_id = p.id
                    WHERE mpsl.isActive = 'Y' AND mpsl.price = 'Y'
                    ${whereClause}
                )
                SELECT * FROM ranked_promos WHERE rn = 1
                ORDER BY datesave DESC
                LIMIT ${BATCH_SIZE} OFFSET ${offset};
            `;

            //console.log(`Exporting Excel... Fetching batch, offset: ${offset}, limit: ${BATCH_SIZE}`);
            const batchData = await db.sequelize.query(query, { type: db.Sequelize.QueryTypes.SELECT });

            if (batchData.length > 0) {
                // 5. วน Loop เพิ่มข้อมูลทีละแถวและ commit ลง stream
                batchData.forEach(user => {
                    let pictureValue = '';
                    if (user.picture) {
                        const filenames = user.picture.split(',');
                        const urls = filenames.map(filename => `${BASE_IMAGE_URL}${filename.trim()}`);
                        if (urls.length === 1) {
                            pictureValue = { text: 'คลิกเพื่อดูภาพ', hyperlink: urls[0] };
                        } else if (urls.length > 1) {
                            pictureValue = { text: `คลิกเพื่อดูภาพแรก (${urls.length} รูป)`, hyperlink: urls[0] };
                            pictureValue.note = `รูปภาพทั้งหมด:\n${urls.join('\n')}`;
                        }
                    }

                    const row = worksheet.addRow({
                        ...user, // ใช้ spread operator เพื่อ map field ส่วนใหญ่ที่ชื่อตรงกัน
                        not_sell: user.not_sell === 'Y' ? 'Yes' : 'No', // แปลงค่า
                        picture: pictureValue // ใส่ค่าที่ประมวลผลแล้ว
                    });

                    if (pictureValue && pictureValue.hyperlink) {
                        const pictureCell = row.getCell('picture');
                        pictureCell.font = { color: { argb: 'FF0000FF' }, underline: true };
                        if (pictureValue.note) {
                            pictureCell.note = pictureValue.note;
                        }
                    }
                    
                    // ✅ Commit แถวนี้เพื่อเขียนลง stream ทันที (สำคัญมาก!)
                    row.commit(); 
                });
                offset += BATCH_SIZE;
            } else {
                hasMoreData = false; // ไม่มีข้อมูลเหลือแล้ว, ออกจาก loop
            }
        }

        // 6. Commit worksheet และ workbook เพื่อจบการเขียนไฟล์
        worksheet.commit();
        await workbook.commit();
        // res.end() จะถูกเรียกโดยอัตโนมัติเมื่อ stream สิ้นสุด ไม่ต้องเรียกเอง
        //console.log('Excel export finished successfully.');

    } catch (error) {
        console.error('Error exporting streaming Excel:', error);
        // หากเกิด error กลางคัน อาจไม่สามารถส่ง status 500 ได้เพราะ header ถูกส่งไปแล้ว
        // การ log error ยังสำคัญมาก และพยายามปิดการเชื่อมต่อ
        if (!res.headersSent) {
            res.status(500).send('Error exporting Excel: ' + error.stack);
        } else {
            res.end();
        }
    }
}

async function excelcompliance(req, res) {
    const userid = req.params.id;
    const startDate_select = req.params.startDate_select;
    const endDate_select = req.params.endDate_select;
    try {
        if (!userid) {
            return res.status(400).send('User id is required');
        }

        // ✅ FIX 1: เพิ่มการตรวจสอบ Userdata และ Position เพื่อป้องกันแอปแครช
        const Userdata = await db.User.findOne({
            where: { id: userid },
            include: [{ model: db.Position, as: 'position', required: false }]
        });
        if (!Userdata || !Userdata.position) {
            return res.status(404).send('User or User position not found');
        }

        // ✅ FIX 2: แก้ไข Logic การกรองตำแหน่งสำหรับ Assistant Management ให้ถูกต้อง
        const whereConditions = [];

        let startDate;
        let endDate;

        const today = new Date();
        const todayISO = today.toISOString().slice(0, 10);

        if (Userdata.position.name !== 'พนักงาน') {
            startDate = startDate_select || todayISO;
            endDate = endDate_select || todayISO;
        } else {
            endDate = todayISO;
            const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            startDate = firstDayOfLastMonth.toISOString().slice(0, 10);
        }

        if (startDate && startDate !== "null" && endDate && endDate !== "null") {
            const finalCondition = `CAST(compliance.datesave AS DATE) BETWEEN '${startDate}' AND '${endDate}'`;
            console.log("Final SQL WHERE condition:", finalCondition); 
            whereConditions.push(finalCondition);
        }

        if (Userdata.position.name === 'Assistant Management' || Userdata.position.name === 'Management') {
            // whereConditions.push(`(position.name = 'พนักงาน' OR position.name = 'Supervisor')`);
            if (Userdata.group_customer_id) whereConditions.push(`store.group_customer_id = '${Userdata.group_customer_id}'`);
            // if (Userdata.area_manager) whereConditions.push(`user.area_manager = '${Userdata.area_manager}'`);
        } else if (Userdata.position.name !== 'SuperAdmin') {
            if (Userdata.position.name == 'พนักงาน') {
                if (userid) whereConditions.push(`compliance.user_id = '${userid}'`);
            } else if (Userdata.position.name == 'Supervisor') {
                if (Userdata.group_customer_id) whereConditions.push(`store.group_customer_id = '${Userdata.group_customer_id}'`);
                if (Userdata.area_supervisor) whereConditions.push(`user.area_supervisor = '${Userdata.area_supervisor}'`);
                if (Userdata.area_manager) whereConditions.push(`user.area_manager = '${Userdata.area_manager}'`);
            } else if (Userdata.position.name == 'Management' || Userdata.position.name == 'Admin') {
                if (Userdata.group_customer_id) whereConditions.push(`store.group_customer_id = '${Userdata.group_customer_id}'`);
            }
        }

        if (req.params.store_id != "null") whereConditions.push(`compliance.store_id = '${parseInt(req.params.store_id)}'`);
        if (req.params.user_id != "null") whereConditions.push(`compliance.user_id = '${parseInt(req.params.user_id)}'`);
        
        const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(" AND ")}` : "";
        
        // --- เริ่มส่วนของการเขียนไฟล์แบบ Stream ---
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + `Compliance-data-${Date.now()}.xlsx`);

        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res, useStyles: true, useSharedStrings: true });
        const worksheet = workbook.addWorksheet('Compliance Data');

        worksheet.columns = [
            { header: 'วันที่ทำรายงาน', key: 'datesave', width: 15 },
            { header: 'กลุ่มลูกค้า', key: 'group_customer_id', width: 15 },
            { header: 'Area Manager (VIP2)', key: 'areaManager_name', width: 20 },
            { header: 'เขต Supervisor', key: 'areaSupervisor_name', width: 20 },
            { header: 'รหัสพนักงาน', key: 'user_code', width: 15 },
            { header: 'ชื่อ-นามสกุล', key: 'user_fullname', width: 25 },
            { header: 'Channel', key: 'channel_name', width: 15 },
            { header: 'Account', key: 'account_id', width: 20 },
            { header: 'รหัสสโตร์', key: 'store_code', width: 15 },
            { header: 'สาขา', key: 'store_name', width: 25 },
            { header: 'จังหวัด', key: 'province_thai', width: 15 },
            { header: 'Group Name', key: 'name', width: 15 },
            { header: 'Category', key: 'cate_name', width: 15 },
            { header: 'Brand', key: 'brand_name', width: 15 },
            { header: 'Sub brand', key: 'sub_brand_name', width: 15 },
            { header: 'ชื่อสินค้า', key: 'product_name', width: 30 },
            { header: 'Flavor', key: 'product_flavor', width: 15 },
            { header: 'สถานะพื้นที่', key: 'status_area', width: 15 },
            { header: 'บริเวณพื้นที่', key: 'placement_point_name', width: 20 },
            { header: 'พื้นที่', key: 'rental_area_unit_name', width: 15 },
            { header: 'จำนวน', key: 'qty', width: 10 },
            { header: 'หน่วย', key: 'rental_area_unit_unit', width: 10 },
            { header: 'สินค้าทดแทน', key: 'substitute_products_name', width: 30 },
            { header: 'สื่อส่งเสริมการขาย', key: 'posm_name', width: 20 },
            { header: 'สาเหตุ', key: 'reason_for_not_getting_space_name', width: 30 },
            { header: 'พื้นที่คู่แข่ง', key: 'competitor_area', width: 15 },
            { header: 'แบรนด์คู่แข่ง', key: 'competitor_name', width: 20 },
            { header: 'ช่วงวันที่แบรนด์คู่แข่ง', key: 'daterange', width: 20 },
            { header: 'หมายเหตุ', key: 'note', width: 30 },
            { header: 'Week1', key: 'week1_images', width: 20 },
            { header: 'Week2', key: 'week2_images', width: 20 },
            { header: 'Week3', key: 'week3_images', width: 20 },
            { header: 'Week4', key: 'week4_images', width: 20 },
        ];
        
        // Pre-fetch Master Data
        const allProducts = await db.Product.findAll({ attributes: ['id', 'name', 'flavor'], raw: true });
        const productIdToNameMap = new Map(allProducts.map(p => [p.id, p.name + (p.flavor ? ` (${p.flavor})` : '')]));
        function formatSubstituteProductNames(idString) {
            if (!idString) return '';
            return idString.split(',').map(id => productIdToNameMap.get(parseInt(id.trim())) || '').join('\n');
        }

        const BATCH_SIZE = 1000;
        let offset = 0;
        let hasMoreData = true;
        const imageBaseUrl = 'https://api-test.iservreport.com/view-images?files=';

        while (hasMoreData) {
            // ✅ FIX 3: ลบ GROUP BY ที่ไม่มีประสิทธิภาพออก
            const query = `
                SELECT 
                    compliancelist.*, store.store_code, store.store_name, compliance.datesave, gc.name AS group_customer_id,
                    user.code AS user_code, user.name AS user_name, user.last_name AS user_lastname, acc.name AS account_id,
                    store.store_name AS branch_name, acct.name AS account_type_id, mps.name AS name, cate.name AS cate_name,
                    brand.name AS brand_name, subbrand.name AS sub_brand_name, prod.name AS product_name, prod.id AS product_id,
                    prod.flavor AS product_flavor, mpsl.isActive, provinces.name_in_thai AS province_thai,
                    placement_point.name AS placement_point_name, rental_area_unit.name AS rental_area_unit_name,
                    rental_area_unit.unit AS rental_area_unit_unit, posm.name AS posm_name,
                    reason_for_not_getting_space.name AS reason_for_not_getting_space_name,
                    competitor.name AS competitor_name
                FROM tb_compliancelist AS compliancelist
                LEFT JOIN tb_compliance AS compliance ON compliancelist.compliance_id = compliance.id
                LEFT JOIN tb_map_storecompliance_list AS mpsl ON compliancelist.map_storecompliance_list_id = mpsl.id
                LEFT JOIN tb_map_storecompliance AS mps ON mpsl.map_product_id = mps.id
                LEFT JOIN tb_placement_point AS placement_point ON compliancelist.placement_point_id = placement_point.id
                LEFT JOIN tb_rental_area_unit AS rental_area_unit ON compliancelist.rental_area_unit_id = rental_area_unit.id
                LEFT JOIN tb_posm AS posm ON compliancelist.posm_id = posm.id
                LEFT JOIN tb_reason_for_not_getting_space AS reason_for_not_getting_space ON compliancelist.reason_for_not_getting_space_id = reason_for_not_getting_space.id
                LEFT JOIN tb_competitor AS competitor ON compliancelist.competitor_id = competitor.id
                LEFT JOIN tb_product AS prod ON mpsl.product_id = prod.id
                LEFT JOIN tb_category AS cate ON prod.categoryId = cate.id
                LEFT JOIN tb_brand AS brand ON prod.brand_id = brand.id
                LEFT JOIN tb_sub_brand AS subbrand ON prod.sub_brand_id = subbrand.id
                LEFT JOIN tb_user AS user ON compliance.user_id = user.id
                LEFT JOIN tb_position AS position ON user.position_id = position.id
                LEFT JOIN tb_store AS store ON compliance.store_id = store.id
                LEFT JOIN tb_group_customer AS gc ON store.group_customer_id = gc.id
                LEFT JOIN tb_account AS acc ON store.account_id = acc.id
                LEFT JOIN tb_account_type AS acct ON store.account_type_id = acct.id
                LEFT JOIN tb_provinces AS provinces ON store.provinces_id = provinces.id
                WHERE mpsl.isActive = 'Y' ${whereClause}
                ORDER BY compliancelist.id DESC
                LIMIT ${BATCH_SIZE} OFFSET ${offset};
            `;
            
            //console.log(`Exporting Compliance... Fetching batch, offset: ${offset}`);
            const batchData = await db.sequelize.query(query, { type: db.Sequelize.QueryTypes.SELECT });

            if (batchData.length === 0) {
                hasMoreData = false;
                continue;
            }
            
            // ✅ FIX 4: แก้ปัญหา N+1 โดยการดึงข้อมูลเสริมสำหรับ Batch นี้ในครั้งเดียว
            const storeCodes = [...new Set(batchData.map(r => r.store_code).filter(Boolean))];
            const userCodes = [...new Set(batchData.map(r => r.user_code).filter(Boolean))];
            const complianceListIds = batchData.map(r => r.id);

            const [stores, datausers, allImages] = await Promise.all([
                db.Store.findAll({ where: { store_code: storeCodes }, include: [{ model: db.Channel, as: 'channel', attributes: ['name'] }] }),
                db.User.findAll({ where: { code: userCodes }, include: [{ model: db.AreaManager, as: 'areaManager', attributes: ['name'] }, { model: db.AreaSupervisor, as: 'areaSupervisor', attributes: ['name'] }] }),
                db.ComplianceListImages.findAll({ where: { compliance_list_id: complianceListIds }, attributes: ['compliance_list_id', 'week', 'filename'], raw: true })
            ]);

            const storeMap = new Map(stores.map(s => [s.store_code, s.channel?.name]));
            const userAreaManagerMap = new Map(datausers.map(u => [u.code, u.areaManager?.name]));
            const userAreaSupervisorMap = new Map(datausers.map(u => [u.code, u.areaSupervisor?.name]));
            const allImagesMap = new Map();
            for (const image of allImages) {
                if (!allImagesMap.has(image.compliance_list_id)) allImagesMap.set(image.compliance_list_id, []);
                allImagesMap.get(image.compliance_list_id).push(image);
            }

            for (const row of batchData) {
                const userImages = allImagesMap.get(row.id) || [];
                const rowData = {
                    datesave: row.datesave,
                    group_customer_id: row.group_customer_id,
                    areaManager_name: userAreaManagerMap.get(row.user_code) || 'N/A',
                    areaSupervisor_name: userAreaSupervisorMap.get(row.user_code) || 'N/A',
                    user_code: row.user_code,
                    user_fullname: `${row.user_name || ''} ${row.user_lastname || ''}`.trim(),
                    channel_name: storeMap.get(row.store_code) || 'N/A',
                    account_id: row.account_id,
                    store_code: row.store_code,
                    store_name: row.store_name,
                    province_thai: row.province_thai,
                    name: row.name,
                    cate_name: row.cate_name, brand_name: row.brand_name, sub_brand_name: row.sub_brand_name,
                    product_name: row.product_name, product_flavor: row.product_flavor,
                    status_area: (row.status_area == 0 ? 'ได้' : (row.status_area == 1 ? 'ไม่ได้' : 'ได้ทดแทน')),
                    placement_point_name: row.placement_point_name,
                    rental_area_unit_name: row.rental_area_unit_name,
                    qty: row.qty,
                    rental_area_unit_unit: row.rental_area_unit_unit,
                    substitute_products_name: formatSubstituteProductNames(row.substitute_products_id),
                    posm_name: row.posm_name,
                    reason_for_not_getting_space_name: row.reason_for_not_getting_space_name,
                    competitor_area: (row.competitor_area == 0 ? 'ได้' : 'ไม่ได้'),
                    competitor_name: row.competitor_name,
                    daterange: row.daterange,
                    note: row.note,
                };
                
                // สร้าง Hyperlink สำหรับแต่ละ Week
                for (let week = 1; week <= 4; week++) {
                    const weekImages = userImages.filter(img => img.week == week);
                    if (weekImages.length > 0) {
                        const galleryUrl = `${imageBaseUrl}/${encodeURIComponent(weekImages.map(img => img.filename).join(','))}`;
                        rowData[`week${week}_images`] = { text: `ดูรูปภาพ (${weekImages.length})`, hyperlink: galleryUrl };
                    } else {
                        rowData[`week${week}_images`] = '';
                    }
                }
                
                const addedRow = worksheet.addRow(rowData);
                for (let week = 1; week <= 4; week++) {
                    if (rowData[`week${week}_images`]) {
                        addedRow.getCell(`week${week}_images`).font = { color: { argb: 'FF0000FF' }, underline: true };
                    }
                }
                addedRow.commit();
            }
            offset += BATCH_SIZE;
        }

        worksheet.commit();
        await workbook.commit();
        //console.log('Compliance Excel export finished successfully.');

    } catch (error) {
        console.error('Error exporting Compliance Excel:', error);
        if (!res.headersSent) {
            res.status(500).send('Error exporting Excel: ' + error.stack);
        } else {
            res.end();
        }
    }
}

async function excelcomplianceextra(req, res) {
    try {
        const userid = req.params.id;
        const startDate_select = req.params.startDate_select;
        const endDate_select = req.params.endDate_select;
        if (!userid) {
            return res.status(400).send('User id is required');
        }

        const Userdata = await db.User.findOne({
            where: { id: userid },
            include: [{ model: db.Position, as: 'position', required: false }]
        });

        if (!Userdata || !Userdata.position) {
            return res.status(404).send('User or User position not found');
        }

        // --- ส่วนการสร้างเงื่อนไขการค้นหา (เหมือนเดิม) ---
        const whereConditions = [];

        let startDate;
        let endDate;

        const today = new Date();
        const todayISO = today.toISOString().slice(0, 10);

        if (Userdata.position.name !== 'พนักงาน') {
            startDate = startDate_select || todayISO;
            endDate = endDate_select || todayISO;
        } else {
            endDate = todayISO;
            const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            startDate = firstDayOfLastMonth.toISOString().slice(0, 10);
        }

        if (startDate && startDate !== "null" && endDate && endDate !== "null") {
            const finalCondition = `CAST(complianceextra.datesave AS DATE) BETWEEN '${startDate}' AND '${endDate}'`;
            console.log("Final SQL WHERE condition:", finalCondition); 
            whereConditions.push(finalCondition);
        }

        if (Userdata.position.name === 'Assistant Management' || Userdata.position.name === 'Management') {
            // whereConditions.push(`(position.name = 'พนักงาน' OR position.name = 'Supervisor')`);
            if (Userdata.group_customer_id) whereConditions.push(`store.group_customer_id = '${Userdata.group_customer_id}'`);
            // if(Userdata.area_manager.name !== 'All'){
            //     if (Userdata.area_manager) whereConditions.push(`user.area_manager = '${Userdata.area_manager}'`);
            // }
        } else if (Userdata.position.name !== 'SuperAdmin') {
            // Logic เดิมสำหรับ Role อื่นๆ
            if (Userdata.position.name === 'พนักงาน') {
                if (userid) whereConditions.push(`complianceextra.user_id = '${userid}'`);
            } else if (Userdata.position.name === 'Supervisor') {
                if (Userdata.group_customer_id) whereConditions.push(`store.group_customer_id = '${Userdata.group_customer_id}'`);
                if (Userdata.area_supervisor) whereConditions.push(`user.area_supervisor = '${Userdata.area_supervisor}'`);
                if (Userdata.area_manager) whereConditions.push(`user.area_manager = '${Userdata.area_manager}'`);
            } else if (Userdata.position.name === 'Management' || Userdata.position.name === 'Admin') {
                if (Userdata.group_customer_id) whereConditions.push(`store.group_customer_id = '${Userdata.group_customer_id}'`);
            }
        }
        
        if (req.params.store_id && req.params.store_id !== "null") whereConditions.push(`complianceextra.store_id = '${parseInt(req.params.store_id)}'`);
        if (req.params.user_id && req.params.user_id !== "null") whereConditions.push(`complianceextra.user_id = '${parseInt(req.params.user_id)}'`);

        const whereClause = whereConditions.length > 0 ? `AND ${whereConditions.join(" AND ")}` : "";

        // --- ส่วนของการเขียนไฟล์แบบ Stream ---
        
        // 1. ตั้งค่า Header สำหรับการส่งไฟล์
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + `Extra-data-${Date.now()}.xlsx`);

        // 2. สร้าง WorkbookWriter สำหรับการเขียนแบบ Stream
        const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res, useStyles: true, useSharedStrings: true });
        const worksheet = workbook.addWorksheet('Extra Data');

        // 3. กำหนด Columns
        worksheet.columns = [
            { header: 'วันที่ทำรายงาน', key: 'datesave', width: 15 },
            { header: 'กลุ่มลูกค้า', key: 'group_customer_id', width: 15 },
            { header: 'Area Manager (VIP2)', key: 'areaManager_name', width: 20 },
            { header: 'เขต Supervisor', key: 'areaSupervisor_name', width: 20 },
            { header: 'รหัสพนักงาน', key: 'user_code', width: 15 },
            { header: 'ชื่อ-นามสกุล', key: 'user_fullname', width: 25 },
            { header: 'Channel', key: 'channel_name', width: 15 },
            { header: 'Account', key: 'account_id', width: 20 },
            { header: 'รหัสสโตร์', key: 'store_code', width: 15 },
            { header: 'สาขา', key: 'store_name', width: 25 },
            { header: 'จังหวัด', key: 'province_thai', width: 15 },
            { header: 'Category', key: 'cate_name', width: 15 },
            { header: 'Brand', key: 'brand_name', width: 15 },
            { header: 'Sub brand', key: 'sub_brand_name', width: 15 },
            { header: 'สินค้า', key: 'prod2_name', width: 30 },
            { header: 'บริเวณพื้นที่', key: 'placement_point_name', width: 20 },
            { header: 'พื้นที่', key: 'rental_area_unit_name', width: 15 },
            { header: 'จำนวน', key: 'qty', width: 10 },
            { header: 'หน่วย', key: 'rental_area_unit_unit', width: 10 },
            // { header: 'สินค้าทดแทน', key: 'substitute_products', width: 30 },
            { header: 'สื่อส่งเสริมการขาย', key: 'posm_products', width: 30 },
            { header: 'หมายเหตุ', key: 'note', width: 30 },
            { header: 'Week1', key: 'week1_images', width: 20 },
            { header: 'Week2', key: 'week2_images', width: 20 },
            { header: 'Week3', key: 'week3_images', width: 20 },
            { header: 'Week4', key: 'week4_images', width: 20 },
        ];
        
        // 4. Pre-fetch Master Data ที่ใช้บ่อยๆ
        const allProducts = await db.Product.findAll({ attributes: ['id', 'name', 'flavor'], raw: true });
        const productIdToNameMap = new Map(allProducts.map(p => [p.id, p.name + (p.flavor ? ` (${p.flavor})` : '')]));

        const allPosms = await db.Posm.findAll({ attributes: ['id', 'name'], raw: true });
        const posmIdToNameMap = new Map(allPosms.map(p => [p.id, p.name]));
        
        function formatNamesFromIds(idString, map) {
            if (!idString) return '';
            return idString.split(',').map(id => map.get(parseInt(id.trim())) || `(Unknown ID: ${id})`).join('\n');
        }

        const BATCH_SIZE = 5000; // ดึงข้อมูลทีละ 1000 แถว (ปรับค่าได้)
        let offset = 0;
        let hasMoreData = true;
        const imageBaseUrl = 'https://api-test.iservreport.com/view-images?files=';

        // 5. เริ่ม Streaming Loop
        while (hasMoreData) {
            const query = `
                SELECT 
                    compliancelistextra.*,
                    store.store_code, store.store_name, complianceextra.datesave,
                    gc.name AS group_customer_id, user.code AS user_code, user.name AS user_name, user.last_name AS user_lastname,
                    acc.name AS account_id, store.store_name AS branch_name, acct.name AS account_type_id,
                    cate.name AS cate_name, brand.name AS brand_name, subbrand.name AS sub_brand_name,
                    prod.name AS product_name, prod.flavor AS product_flavor, provinces.name_in_thai AS province_thai,
                    placement_point.name AS placement_point_name, rental_area_unit.name AS rental_area_unit_name,
                    rental_area_unit.unit AS rental_area_unit_unit, prod2.name AS prod2_name, posm.name AS posm_name
                FROM tb_compliancelistextra AS compliancelistextra
                LEFT JOIN tb_complianceextra AS complianceextra ON compliancelistextra.complianceextra_id = complianceextra.id
                LEFT JOIN tb_placement_point AS placement_point ON compliancelistextra.placement_point_id = placement_point.id
                LEFT JOIN tb_rental_area_unit AS rental_area_unit ON compliancelistextra.rental_area_unit_id = rental_area_unit.id
                LEFT JOIN tb_product AS prod2 ON compliancelistextra.substitute_products_id = prod2.id
                LEFT JOIN tb_posm AS posm ON compliancelistextra.posm_id = posm.id
                LEFT JOIN tb_product AS prod ON compliancelistextra.product_id = prod.id
                LEFT JOIN tb_category AS cate ON prod.categoryId = cate.id
                LEFT JOIN tb_brand AS brand ON prod.brand_id = brand.id
                LEFT JOIN tb_sub_brand AS subbrand ON prod.sub_brand_id = subbrand.id
                LEFT JOIN tb_user AS user ON complianceextra.user_id = user.id
                LEFT JOIN tb_position AS position ON user.position_id = position.id
                LEFT JOIN tb_store AS store ON complianceextra.store_id = store.id
                LEFT JOIN tb_group_customer AS gc ON store.group_customer_id = gc.id
                LEFT JOIN tb_account AS acc ON store.account_id = acc.id
                LEFT JOIN tb_account_type AS acct ON store.account_type_id = acct.id
                LEFT JOIN tb_provinces AS provinces ON store.provinces_id = provinces.id
                WHERE compliancelistextra.isActive = 'Y' ${whereClause}
                ORDER BY compliancelistextra.id DESC
                LIMIT ${BATCH_SIZE} OFFSET ${offset};
            `;
            
            //console.log(`Exporting Compliance Extra... Fetching batch, offset: ${offset}`);
            const batchData = await db.sequelize.query(query, { type: db.Sequelize.QueryTypes.SELECT });

            if (batchData.length === 0) {
                hasMoreData = false;
                continue; // ไปยังการ commit ไฟล์
            }
            
            // 6. Enrich in Batch: ดึงข้อมูลเสริมสำหรับ Batch นี้
            const storeCodes = [...new Set(batchData.map(r => r.store_code).filter(Boolean))];
            const userCodes = [...new Set(batchData.map(r => r.user_code).filter(Boolean))];
            const complianceListIds = batchData.map(r => r.id);

            const [stores, datausers, allImages] = await Promise.all([
                db.Store.findAll({ where: { store_code: storeCodes }, include: [{ model: db.Channel, as: 'channel', attributes: ['name'] }] }),
                db.User.findAll({ where: { code: userCodes }, include: [{ model: db.AreaManager, as: 'areaManager', attributes: ['name'] }, { model: db.AreaSupervisor, as: 'areaSupervisor', attributes: ['name'] }] }),
                db.ComplianceListImagesextra.findAll({ where: { complianceextra_list_id: complianceListIds }, attributes: ['complianceextra_list_id', 'week', 'filename'], order: [['id', 'ASC']], raw: true })
            ]);

            const storeMap = new Map(stores.map(s => [s.store_code, s.channel?.name || 'N/A']));
            const userAreaManagerMap = new Map(datausers.map(u => [u.code, u.areaManager?.name || 'N/A']));
            const userAreaSupervisorMap = new Map(datausers.map(u => [u.code, u.areaSupervisor?.name || 'N/A']));
            const allImagesMap = new Map();
            for (const image of allImages) {
                if (!allImagesMap.has(image.complianceextra_list_id)) allImagesMap.set(image.complianceextra_list_id, []);
                allImagesMap.get(image.complianceextra_list_id).push(image);
            }

            // 7. วน Loop ใน Batch เพื่อเขียนลง Stream
            for (const row of batchData) {
                const userImages = allImagesMap.get(row.id) || [];
                
                const rowData = {
                    datesave: row.datesave,
                    group_customer_id: row.group_customer_id,
                    areaManager_name: userAreaManagerMap.get(row.user_code) || 'N/A',
                    areaSupervisor_name: userAreaSupervisorMap.get(row.user_code) || 'N/A',
                    user_code: row.user_code,
                    user_fullname: `${row.user_name || ''} ${row.user_lastname || ''}`.trim(),
                    channel_name: storeMap.get(row.store_code) || 'N/A',
                    account_id: row.account_id,
                    store_code: row.store_code,
                    store_name: row.store_name,
                    province_thai: row.province_thai,
                    cate_name: row.cate_name, brand_name: row.brand_name, sub_brand_name: row.sub_brand_name,
                    prod2_name: row.prod2_name, placement_point_name: row.placement_point_name || '',
                    rental_area_unit_name: row.rental_area_unit_name || '', qty: row.qty || '',
                    rental_area_unit_unit: row.rental_area_unit_unit || '',
                    // substitute_products: formatNamesFromIds(row.substitute_products_id, productIdToNameMap),
                    posm_products: formatNamesFromIds(row.posm_id, posmIdToNameMap),
                    note: row.note || '',
                };
                
                for (let week = 1; week <= 4; week++) {
                    const weekImages = userImages.filter(img => img.week == week);
                    if (weekImages.length > 0) {
                        const encodedFilenames = encodeURIComponent(weekImages.map(img => img.filename.trim()).join(','));
                        const galleryUrl = `${imageBaseUrl}/${encodedFilenames}`;
                        rowData[`week${week}_images`] = { text: `ดูรูปภาพ (${weekImages.length})`, hyperlink: galleryUrl };
                    } else {
                        rowData[`week${week}_images`] = '';
                    }
                }

                const addedRow = worksheet.addRow(rowData);
                for (let week = 1; week <= 4; week++) {
                    if (rowData[`week${week}_images`]) {
                        addedRow.getCell(`week${week}_images`).font = { color: { argb: 'FF0000FF' }, underline: true };
                    }
                }
                
                addedRow.commit(); // Commit แถวลง Stream
            }
            
            offset += BATCH_SIZE;
        }

        // 8. สิ้นสุดการเขียนไฟล์
        worksheet.commit();
        await workbook.commit();
        //console.log('Compliance Extra Excel export finished successfully.');

    } catch (error) {
        console.error('Error exporting Compliance Extra Excel:', error);
        if (!res.headersSent) {
            res.status(500).send('Error exporting Excel: ' + error.stack);
        } else {
            res.end(); // พยายามปิดการเชื่อมต่อหากเกิดข้อผิดพลาด
        }
    }
}

module.exports = {
    exceloos,
    excelofftake,
    excelweek,
    excelprice,
    excelcompliance,
    excelcomplianceextra,

};
