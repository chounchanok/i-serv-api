const db = require("../models")

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op
const fs = require('fs');
const path = require('path');
// function create ComplianceList

async function saveAllComplianceListExtra(req, res) {
    const t = await db.sequelize.transaction();
    try {
        if (!req.body.data) {
            throw new Error("Missing 'data' in request body.");
        }
        const payload = JSON.parse(req.body.data);
        const files = req.files;

        const fileMap = new Map();
        if (files) {
            for (const file of files) {
                fileMap.set(file.fieldname, file);
            }
        }

        for (const [itemIndex, item] of payload.details.entries()) {
            let complianceListExtraId = item.id;

            // แปลง Array ของ ID ให้เป็น String คั่นด้วย comma เพื่อบันทึกลง Database
            const substitute_products_id_str = Array.isArray(item.substitute_products_id) ? item.substitute_products_id.join(',') : item.substitute_products_id;
            const posm_id_str = Array.isArray(item.posm_id) ? item.posm_id.join(',') : item.posm_id;
            
            // เตรียมข้อมูลที่จะบันทึก
            const itemData = {
                complianceextra_id: item.complianceextra_id,
                product_id: item.product_id || null,
                substitute_products_id: substitute_products_id_str || null,
                posm_id: posm_id_str || null,
                status_area: item.status_area || 0,
                placement_point_id: item.placement_point_id || null,
                rental_area_unit_name: item.rental_area_unit_name || null,
                qty: item.qty || 0,
                rental_area_unit_id: item.rental_area_unit_id || null,
                reason_for_not_getting_space_id: item.reason_for_not_getting_space_id || null,
                note: item.note || null,
                competitor_area: item.competitor_area,
                competitor_id: item.competitor_id || null,
                daterange: item.daterange || null,
            };

            if (!complianceListExtraId || complianceListExtraId === "null") {
                // สร้างรายการใหม่
                const newRecord = await db.ComplianceListextra.create(itemData, { transaction: t });
                complianceListExtraId = newRecord.id;
            } else {
                // อัปเดตรายการเดิม
                await db.ComplianceListextra.update(itemData, {
                    where: { id: complianceListExtraId },
                    transaction: t
                });
            }

            // จัดการไฟล์ที่ถูกบันทึกลง Disk ชั่วคราว
            for (let weekIndex = 0; weekIndex < 4; weekIndex++) {
                for (let fileIndex = 0; ; fileIndex++) {
                    const fieldName = `files_${itemIndex}_${weekIndex}_${fileIndex}`;
                    if (!fileMap.has(fieldName)) {
                        break; // ไม่มีไฟล์สำหรับ index นี้แล้ว จบ loop
                    }

                    const tempFile = fileMap.get(fieldName);
                    const datecreate = req.body[`${fieldName}_datecreate`];
                    const dateupdate = req.body[`${fieldName}_dateupdate`];
                    
                    const ext = path.extname(tempFile.originalname);
                    const final_filename = `extra-week${weekIndex + 1}-${complianceListExtraId}-${Date.now()}${ext}`;
                    const final_filepath = path.join(__dirname, '..', 'images', 'banner', final_filename);

                    // ย้ายไฟล์จากที่พักชั่วคราวไปยังปลายทาง
                    await fs.promises.rename(tempFile.path, final_filepath);

                    await db.ComplianceListImagesextra.create({
                        complianceextra_list_id: complianceListExtraId,
                        week: weekIndex + 1,
                        filename: `images/banner/${final_filename}`,
                        datecreate: datecreate,
                        dateupdate: dateupdate,
                        isActive: 'Y'
                    }, { transaction: t });
                }
            }
        }

        // ถ้าทุกอย่างสำเร็จ ให้ Commit Transaction
        await t.commit();
        res.status(200).send({ status: "success", message: "บันทึกข้อมูลทั้งหมดเรียบร้อยแล้ว" });

    } catch (err) {
        // หากเกิดข้อผิดพลาด ให้ Rollback Transaction
        await t.rollback();
        console.error("========== TRANSACTION ROLLED BACK DUE TO ERROR ==========");
        console.error("Full Error Stack:", err);
        console.error("==========================================================");
        res.status(500).send({ status: "error", message: err.message || "เกิดข้อผิดพลาด ไม่สามารถบันทึกข้อมูลได้" });
    }
}

async function create_ComplianceList(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }
    try {
        await db.ComplianceList.create(req.body)
        res.send({ status: "success", message: "เพิ่มข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
    }
}
async function createOrUpdate_Compliance(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    const ComplianceList = req.body.store_id; // สมมุติว่า array ถูกส่งเข้ามาใน req.body

    try {
        for (const item of ComplianceList) {
            if (item.id === null) {
                // ถ้า id เป็น null ให้สร้างรายการใหม่
                await db.ComplianceList.create({
                    map_product_id: item.map_product_id,
                    product_id: item.product_id,
                });
            } else {
                // ถ้า id มีค่า ให้ทำการ update โดยใช้ id ที่มี
                await db.ComplianceList.update({
                    map_product_id: item.map_product_id,
                    product_id: item.product_id,
                }, {
                    where: { id: item.id }
                });
            }
        }

        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลได้ในตอนนี้!" });
    }
}
async function createOrUpdate_ComplianceList(req, res) {
    try {
        if (!req.body.id) {
            return res.status(400).json({ status: "error", msg: "Invalid request, ID is required" });
        }

        const complianceList = await db.ComplianceList.findOne({ where: { id: req.body.id } });
        if (!complianceList) {
            return res.status(404).json({ status: "error", msg: "Compliance List not found" });
        }

        const compliance_list_id = complianceList.id;
        const week = req.body.week;

        // ✅ แยก `file_id != null` และ `file_id == null`
        const file_ids = Array.isArray(req.body.file_id) ? req.body.file_id : [req.body.file_id];
        const datecreateArray = Array.isArray(req.body.datecreate) ? req.body.datecreate : [req.body.datecreate];
        const dateupdateArray = Array.isArray(req.body.dateupdate) ? req.body.dateupdate : [req.body.dateupdate];

        // ✅ กรองเฉพาะรายการที่ต้อง **อัปเดตรูปเดิม**
        const updateFileIds = file_ids.filter(file_id => file_id !== "null" && file_id !== null);
        const updateDateCreate = datecreateArray.filter((_, index) => file_ids[index] !== "null");
        const updateDateUpdate = dateupdateArray.filter((_, index) => file_ids[index] !== "null");

        // ✅ อัปเดตรูปเดิม (update)
        for (let i = 0; i < updateFileIds.length; i++) {
            const file_id = updateFileIds[i];
            const datecreate = updateDateCreate[i] || new Date().toISOString().split('T')[0]; 
            const dateupdate = updateDateUpdate[i] || new Date().toISOString().split('.')[0].replace('T', ' ');

            await db.ComplianceListImages.update(
                { datecreate, dateupdate },
                { where: { id: file_id } }
            );
        }

        // ✅ กรองเฉพาะรายการที่เป็น **ไฟล์ใหม่ (`file_id = null`)**
        const newFileIndexes = file_ids
            .map((file_id, index) => (file_id === "null" ? index : null))
            .filter(index => index !== null);

        const newDateCreate = newFileIndexes.map(index => datecreateArray[index]);
        const newDateUpdate = newFileIndexes.map(index => dateupdateArray[index]);

        // ✅ อัปโหลดไฟล์ใหม่เท่านั้น
        if (req.files && req.files.picture) {
            const images = Array.isArray(req.files.picture) ? req.files.picture : [req.files.picture];

            for (let i = 0; i < newFileIndexes.length; i++) {
                const index = newFileIndexes[i];
                const image = images[i];

                if (!image) continue;

                const datecreate = newDateCreate[i] || new Date().toISOString().split('T')[0];
                const dateupdate = newDateUpdate[i] || new Date().toISOString().split('.')[0].replace('T', ' ');

                //console.log(`✅ Processing new image: ${image.name}, datecreate: ${datecreate}, dateupdate: ${dateupdate}`);

                const ext = image.name.split('.').pop().toLowerCase();
                if (!['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
                    return res.status(400).json({ status: 'error', msg: 'Invalid file type' });
                }

                const now = Date.now(); // มิลลิวินาที
                const new_name = `week${week}-${req.body.id}-${now}.${ext}`;
                const savePath = `./images/banner/${new_name}`;

                try {
                    await image.mv(savePath);

                    await db.ComplianceListImages.create({
                        compliance_list_id,
                        week,
                        filename: `images/banner/${new_name}`,
                        datecreate,
                        dateupdate
                    });

                    //console.log(`✅ Uploaded new image: ${new_name} with datecreate: ${datecreate} and dateupdate: ${dateupdate}`);

                } catch (error) {
                    console.error("Error saving image:", error);
                    return res.status(500).json({ status: 'error', msg: 'File save failed', error });
                }
            }
        }

        res.json({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });

    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลได้ในตอนนี้!" });
    }
}
async function createOrUpdate_ComplianceListExtra(req, res) {
    try {
        const week = req.body.week;

        // ...existing code...
        let substitute_products_id = req.body.substitute_products_id;

        // ถ้าเป็น string ที่มี comma ให้ split เป็น array
        if (typeof substitute_products_id === 'string') {
            if (substitute_products_id.includes(',')) {
                substitute_products_id = substitute_products_id.split(',').map(s => s.trim());
            } else if (substitute_products_id !== '') {
                substitute_products_id = [substitute_products_id];
            } else {
                substitute_products_id = [];
            }
        }

        // ถ้าเป็น null หรือ undefined ให้เป็น array ว่าง
        if (!Array.isArray(substitute_products_id)) {
            substitute_products_id = [];
        }

        // ใช้ substitute_products_id[0] ได้อย่างถูกต้อง
        const product_id = substitute_products_id[0] || null;


        const createdItems = [];
        const updatedItems = [];

        // for (const item of items) {
            let compliance_list_id = req.body.id; // รับ ID จาก request
            
            if (!compliance_list_id || compliance_list_id === "null") {
                // ✅ **เคสเพิ่มสินค้าใหม่ (`id = null`) → ให้สร้าง ComplianceList ก่อน**
                const newCompliance = await db.ComplianceListextra.create({
                    complianceextra_id: req.body.complianceextra_id,
                    product_id: product_id,
                    status_area: 0,
                    placement_point_id: req.body.placement_point_id || 0,
                    rental_area_unit_name: req.body.rental_area_unit_name || "",
                    qty: req.body.qty || 0,
                    rental_area_unit_id: req.body.rental_area_unit_id || 0,
                    substitute_products_id: (Array.isArray(req.body.substitute_products_id) && req.body.substitute_products_id.length > 0) 
                    ? req.body.substitute_products_id.join(",") // ✅ แปลง Array เป็น String
                    : (req.body.substitute_products_id ? String(req.body.substitute_products_id) : null),
                    posm_id: (Array.isArray(req.body.posm_id) && req.body.posm_id.length > 0) 
                    ? req.body.posm_id.join(",") // ✅ แปลง Array เป็น String
                    : (req.body.posm_id ? String(req.body.posm_id) : null),
                    // posm_id: req.body.posm_id || 0,
                    reason_for_not_getting_space_id: req.body.reason_for_not_getting_space_id || 0,
                    note: req.body.note || "",
                    competitor_area: req.body.competitor_area || 0,
                    competitor_id: req.body.competitor_id || 0,
                    daterange: req.body.daterange || null
                });
                compliance_list_id = newCompliance.id;
            } else {
                // ✅ **เคสอัปเดตสินค้าเดิม**
                await db.ComplianceListextra.update({
                    product_id: product_id,
                    status_area: 0,
                    placement_point_id: req.body.placement_point_id || 0,
                    rental_area_unit_name: req.body.rental_area_unit_name || "",
                    qty: req.body.qty || 0,
                    rental_area_unit_id: req.body.rental_area_unit_id || 0,
                    substitute_products_id: (Array.isArray(req.body.substitute_products_id) && req.body.substitute_products_id.length > 0) 
                    ? req.body.substitute_products_id.join(",") // ✅ แปลง Array เป็น String
                    : (req.body.substitute_products_id ? String(req.body.substitute_products_id) : null),
                    posm_id: (Array.isArray(req.body.posm_id) && req.body.posm_id.length > 0) 
                    ? req.body.posm_id.join(",") // ✅ แปลง Array เป็น String
                    : (req.body.posm_id ? String(req.body.posm_id) : null),
                    // posm_id: req.body.posm_id && req.body.posm_id !== 'null' ? req.body.posm_id : 0,
                    reason_for_not_getting_space_id: req.body.reason_for_not_getting_space_id && req.body.reason_for_not_getting_space_id !== 'null' ? req.body.reason_for_not_getting_space_id : 0,
                    note: req.body.note || "",
                    competitor_area: req.body.competitor_area && req.body.competitor_area !== 'null' ? req.body.competitor_area : 0,
                    competitor_id: req.body.competitor_id && req.body.competitor_id !== 'null' ? req.body.competitor_id : 0,
                    daterange: req.body.daterange || null
                }, { where: { id: req.body.id } });
                compliance_list_id = req.body.id;
            }
        // }
        
        res.json({ status: "success", message: "บันทึกข้อมูลเรียบร้อย", id: compliance_list_id });

    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลได้ในตอนนี้!" });
    }
}
async function createOrUpdate_ComplianceListExtrabk(req, res) {
    try {
        const week = req.body.week;

        const items = req.body; // รับ Array ของสินค้า
        if (!Array.isArray(items)) {
            return res.status(400).json({ status: "error", message: "Invalid data format" });
        }

        const createdItems = [];
        const updatedItems = [];

        for (const item of items) {
            let compliance_list_id = item.id; // รับ ID จาก request
            
            if (!compliance_list_id || compliance_list_id === "null") {
                // ✅ **เคสเพิ่มสินค้าใหม่ (`id = null`) → ให้สร้าง ComplianceList ก่อน**
                const newCompliance = await db.ComplianceListextra.create({
                    complianceextra_id: item.complianceextra_id,
                    product_id: item.product_id,
                    status_area: 0,
                    placement_point_id: item.placement_point_id || 0,
                    rental_area_unit_name: item.rental_area_unit_name || "",
                    qty: item.qty || 0,
                    rental_area_unit_id: item.rental_area_unit_id || 0,
                    substitute_products_id: item.substitute_products_id || 0,
                    posm_id: item.posm_id || 0,
                    reason_for_not_getting_space_id: item.reason_for_not_getting_space_id || 0,
                    note: item.note || "",
                    competitor_area: item.competitor_area || 0,
                    competitor_id: item.competitor_id || 0,
                    daterange: item.daterange || null
                });
                compliance_list_id = newCompliance.id;
            } else {
                // ✅ **เคสอัปเดตสินค้าเดิม**
                await db.ComplianceListextra.update({
                    product_id: item.product_id,
                    status_area: item.status_area,
                    placement_point_id: item.placement_point_id || 0,
                    rental_area_unit_name: item.rental_area_unit_name || "",
                    qty: item.qty || 0,
                    rental_area_unit_id: item.rental_area_unit_id || 0,
                    substitute_products_id: item.substitute_products_id ? item.substitute_products_id : 0,
                    posm_id: item.posm_id && item.posm_id !== 'null' ? item.posm_id : 0,
                    reason_for_not_getting_space_id: item.reason_for_not_getting_space_id && item.reason_for_not_getting_space_id !== 'null' ? item.reason_for_not_getting_space_id : 0,
                    note: item.note || "",
                    competitor_area: item.competitor_area && item.competitor_area !== 'null' ? item.competitor_area : 0,
                    competitor_id: item.competitor_id && item.competitor_id !== 'null' ? item.competitor_id : 0,
                    daterange: item.daterange || null
                }, { where: { id: item.id } });
                compliance_list_id = item.id;
            }
        }
        
        // ✅ **แยก `file_id != null` และ `file_id == null`**
        const file_ids = Array.isArray(req.body.file_id) ? req.body.file_id : [req.body.file_id];
        const datecreateArray = Array.isArray(req.body.datecreate) ? req.body.datecreate : [req.body.datecreate];
        const dateupdateArray = Array.isArray(req.body.dateupdate) ? req.body.dateupdate : [req.body.dateupdate];

        // ✅ **กรองเฉพาะรายการที่ต้องอัปเดตรูปเดิม**
        const validFileData = file_ids
            .map((file_id, index) => ({
                file_id: file_id,
                datecreate: datecreateArray[index] || new Date().toISOString().split('T')[0],
                dateupdate: dateupdateArray[index] || new Date().toISOString().split('.')[0].replace('T', ' ')
            }))
            .filter(item => item.file_id && item.file_id !== "null" && item.file_id !== "undefined");

        //console.log("🔹 Files to update:", validFileData); // ✅ ตรวจสอบค่าก่อนอัปเดต

        for (const fileData of validFileData) {
            await db.ComplianceListImagesextra.update(
                { datecreate: fileData.datecreate, dateupdate: fileData.dateupdate },
                { where: { id: fileData.file_id } }
            );
        }

        // // ✅ **กรองเฉพาะรายการที่เป็นไฟล์ใหม่ (`file_id = null`)**
        const newFileIndexes = file_ids
            .map((file_id, index) => (file_id === "null" ? index : null))
            .filter(index => index !== null);

        const newDateCreate = newFileIndexes.map(index => datecreateArray[index]);
        const newDateUpdate = newFileIndexes.map(index => dateupdateArray[index]);

        // ✅ **อัปโหลดไฟล์ใหม่เท่านั้น**
        if (req.files && req.files.picture) {
            const images = Array.isArray(req.files.picture) ? req.files.picture : [req.files.picture];

            for (let i = 0; i < newFileIndexes.length; i++) {
                const index = newFileIndexes[i];
                const image = images[i];

                if (!image) continue;

                const datecreate = newDateCreate[i] || new Date().toISOString().split('T')[0];
                const dateupdate = newDateUpdate[i] || new Date().toISOString().split('.')[0].replace('T', ' ');

                //console.log(`✅ Processing new image: ${image.name}, datecreate: ${datecreate}, dateupdate: ${dateupdate}`);

                const ext = image.name.split('.').pop().toLowerCase();
                if (!['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
                    return res.status(400).json({ status: 'error', msg: 'Invalid file type' });
                }

                const new_name = `week${week}-${compliance_list_id}-${Date.now()}.${ext}`;
                const savePath = `./images/banner/${new_name}`;

                try {
                    await image.mv(savePath);

                    await db.ComplianceListImagesextra.create({
                        compliance_list_id,
                        week,
                        filename: `images/banner/${new_name}`,
                        datecreate,
                        dateupdate
                    });

                    //console.log(`✅ Uploaded new image: ${new_name} with datecreate: ${datecreate} and dateupdate: ${dateupdate}`);

                } catch (error) {
                    console.error("Error saving image:", error);
                    return res.status(500).json({ status: 'error', msg: 'File save failed', error });
                }
            }
        }

        res.json({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });

    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลได้ในตอนนี้!" });
    }
}
async function createOrUpdate_ComplianceListExtraImage(req, res) {
    try {
        const week = req.body.week;

        let substitute_products_id = req.body.substitute_products_id;

        // ถ้าเป็น string ที่มี comma ให้ split เป็น array
        if (typeof substitute_products_id === 'string') {
            if (substitute_products_id.includes(',')) {
                substitute_products_id = substitute_products_id.split(',').map(s => s.trim());
            } else if (substitute_products_id !== '') {
                substitute_products_id = [substitute_products_id];
            } else {
                substitute_products_id = [];
            }
        }

        // ถ้าเป็น null หรือ undefined ให้เป็น array ว่าง
        if (!Array.isArray(substitute_products_id)) {
            substitute_products_id = [];
        }

        // ใช้ substitute_products_id[0] ได้อย่างถูกต้อง
        const product_id = substitute_products_id[0] || null;

        const items = req.body;

        const createdItems = [];
        const updatedItems = [];

        let compliance_list_id = req.body.id; // รับ ID จาก request
            
        if (!compliance_list_id || compliance_list_id === "null") {
            // ✅ **เคสเพิ่มสินค้าใหม่ (`id = null`) → ให้สร้าง ComplianceList ก่อน**
            const newCompliance = await db.ComplianceListextra.create({
                complianceextra_id: req.body.complianceextra_id,
                product_id: product_id,
                status_area: 0,
                placement_point_id: req.body.placement_point_id || 0,
                rental_area_unit_name: req.body.rental_area_unit_name || "",
                qty: req.body.qty || 0,
                rental_area_unit_id: req.body.rental_area_unit_id || 0,
                substitute_products_id: (Array.isArray(req.body.substitute_products_id) && req.body.substitute_products_id.length > 0) 
                ? req.body.substitute_products_id.join(",") // ✅ แปลง Array เป็น String
                : (req.body.substitute_products_id ? String(req.body.substitute_products_id) : null),
                posm_id: (Array.isArray(req.body.posm_id) && req.body.posm_id.length > 0) 
                ? req.body.posm_id.join(",") // ✅ แปลง Array เป็น String
                : (req.body.posm_id ? String(req.body.posm_id) : null),
                // posm_id: req.body.posm_id || 0,
                reason_for_not_getting_space_id: 0,
                note: req.body.note || "",
                competitor_area: 0,
                competitor_id: 0,
                daterange: req.body.daterange || null
            });
            compliance_list_id = newCompliance.id;
        } else {
            // ✅ **เคสอัปเดตสินค้าเดิม**
            await db.ComplianceListextra.update({
                product_id: product_id,
                status_area: 0,
                placement_point_id: req.body.placement_point_id || 0,
                rental_area_unit_name: req.body.rental_area_unit_name || "",
                qty: req.body.qty || 0,
                rental_area_unit_id: req.body.rental_area_unit_id || 0,
                substitute_products_id: (Array.isArray(req.body.substitute_products_id) && req.body.substitute_products_id.length > 0) 
                ? req.body.substitute_products_id.join(",") // ✅ แปลง Array เป็น String
                : (req.body.substitute_products_id ? String(req.body.substitute_products_id) : null),
                posm_id: (Array.isArray(req.body.posm_id) && req.body.posm_id.length > 0) 
                ? req.body.posm_id.join(",") // ✅ แปลง Array เป็น String
                : (req.body.posm_id ? String(req.body.posm_id) : null),
                // posm_id: req.body.posm_id && req.body.posm_id !== 'null' ? req.body.posm_id : 0,
                reason_for_not_getting_space_id: 0,
                note: req.body.note || "",
                competitor_area: 0,
                competitor_id: 0,
                daterange: req.body.daterange || null
            }, { where: { id: req.body.id } });
            compliance_list_id = req.body.id;
        }
        // ✅ **แยก `file_id != null` และ `file_id == null`**
        const file_ids = Array.isArray(req.body.file_id) ? req.body.file_id : [req.body.file_id];
        const datecreateArray = Array.isArray(req.body.datecreate) ? req.body.datecreate : [req.body.datecreate];
        const dateupdateArray = Array.isArray(req.body.dateupdate) ? req.body.dateupdate : [req.body.dateupdate];

        // ✅ **กรองเฉพาะรายการที่ต้องอัปเดตรูปเดิม**
        const validFileData = file_ids
            .map((file_id, index) => ({
                file_id: file_id,
                datecreate: datecreateArray[index] || new Date().toISOString().split('T')[0],
                dateupdate: dateupdateArray[index] || new Date().toISOString().split('.')[0].replace('T', ' ')
            }))
            .filter(item => item.file_id && item.file_id !== "null" && item.file_id !== "undefined");

        //console.log("🔹 Files to update:", validFileData); // ✅ ตรวจสอบค่าก่อนอัปเดต

        for (const fileData of validFileData) {
            await db.ComplianceListImages.update(
                { datecreate: fileData.datecreate, dateupdate: fileData.dateupdate },
                { where: { id: fileData.file_id } }
            );
        }

        // // ✅ **กรองเฉพาะรายการที่เป็นไฟล์ใหม่ (`file_id = null`)**
        const newFileIndexes = file_ids
            .map((file_id, index) => (file_id === "null" ? index : null))
            .filter(index => index !== null);

        const newDateCreate = newFileIndexes.map(index => datecreateArray[index]);
        const newDateUpdate = newFileIndexes.map(index => dateupdateArray[index]);

        // ✅ **อัปโหลดไฟล์ใหม่เท่านั้น**
        if (req.files && req.files.picture) {
            const images = Array.isArray(req.files.picture) ? req.files.picture : [req.files.picture];

            for (let i = 0; i < newFileIndexes.length; i++) {
                const index = newFileIndexes[i];
                const image = images[i];

                if (!image) continue;

                const datecreate = newDateCreate[i] || new Date().toISOString().split('T')[0];
                const dateupdate = newDateUpdate[i] || new Date().toISOString().split('.')[0].replace('T', ' ');

                //console.log(`✅ Processing new image: ${image.name}, datecreate: ${datecreate}, dateupdate: ${dateupdate}`);

                const ext = image.name.split('.').pop().toLowerCase();
                if (!['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
                    return res.status(400).json({ status: 'error', msg: 'Invalid file type' });
                }
                const complianceextra_list_id = parseInt(compliance_list_id, 10);
                const new_name = `week${week}-${complianceextra_list_id}-${Date.now()}.${ext}`;
                const savePath = `./images/banner/${new_name}`;

                const extra = await db.ComplianceListextra.findByPk(complianceextra_list_id);
                if (!extra) {
                    return res.status(400).json({ status: "error", message: "ไม่พบ complianceextra_list_id นี้ใน tb_compliancelistextra" });
                }

                try {
                    
                    if(complianceextra_list_id){
                        await image.mv(savePath);

                        await db.ComplianceListImagesextra.create({
                            complianceextra_list_id: complianceextra_list_id,
                            week: week,
                            filename: `images/banner/${new_name}`,
                            datecreate: datecreate,
                            dateupdate: dateupdate,
                            isActive: 'Y'
                        });

                        //console.log(`✅ Uploaded new image: ${new_name} with datecreate: ${datecreate} and dateupdate: ${dateupdate}`);
                    }

                } catch (error) {
                    console.error("Error saving image:", error);
                    return res.status(500).json({ status: 'error', msg: 'File save failed', error, });
                }
            }
        }

        res.json({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });

    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลได้ในตอนนี้!" });
    }
}
async function createOrUpdate_ComplianceList_bk4(req, res) {
    try {
        // //console.log("Request Body:", req.body); // ✅ Debug ค่า Request ที่ได้รับ

        if (!req.body.id) {
            return res.status(400).json({ status: "error", msg: "Invalid request, ID is required" });
        }

        const complianceList = await db.ComplianceList.findOne({ where: { id: req.body.id } });

        if (!complianceList) {
            return res.status(404).json({ status: "error", msg: "Compliance List not found" });
        }

        const compliance_list_id = complianceList.id;
        const week = req.body.week;

        // ✅ ตรวจสอบ `datecreate` และ `dateupdate` ให้รองรับหลายไฟล์
        const datecreateArray = Array.isArray(req.body.datecreate) ? req.body.datecreate : [req.body.datecreate];
        const dateupdateArray = Array.isArray(req.body.dateupdate) ? req.body.dateupdate : [req.body.dateupdate];

        // //console.log("Formatted datecreate:", datecreateArray);
        // //console.log("Formatted dateupdate:", dateupdateArray);

        // ✅ อัปเดต ComplianceListImages ถ้ามี file_id
        if (req.body.file_id) {
            const file_ids = Array.isArray(req.body.file_id) ? req.body.file_id : [req.body.file_id];

            for (let i = 0; i < file_ids.length; i++) {
                const file_id = file_ids[i];

                const datecreate = datecreateArray[i] || new Date().toISOString().split('T')[0]; // กำหนดค่าเริ่มต้น
                const dateupdate = dateupdateArray[i] || new Date().toISOString().split('.')[0].replace('T', ' ');

                if (file_id && file_id !== "null" && file_id !== "") {
                    await db.ComplianceListImages.update(
                        { datecreate, dateupdate },
                        { where: { id: file_id } }
                    );
                }
            }
        }

        // ✅ อัปโหลดไฟล์ใหม่ (รองรับหลายรูป)
        if (req.body && req.body.datecreate) {
            const imagesdatecreate = Array.isArray(req.body.datecreate) ? req.body.datecreate : [req.body.datecreate];
            const images = Array.isArray(req.files.picture) ? req.files.picture : [req.files.picture];
            for (let i = 0; i < imagesdatecreate.length; i++) {
                const image = images[i];
                const datecreate = datecreateArray[i] || new Date().toISOString().split('T')[0]; 
                const dateupdate = dateupdateArray[i] || new Date().toISOString().split('.')[0].replace('T', ' ');
                //console.log("image:", image);
                //console.log("datecreate:", datecreate);
                //console.log("dateupdate:", dateupdate);
                if(image){
                    // ✅ ตรวจสอบและแปลงวันที่
                    

                    const ext = image.name.split('.').pop().toLowerCase();
                    if (!['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
                        return res.status(400).json({ status: 'error', msg: 'Invalid file type' });
                    }

                    const now = Date.now(); // มิลลิวินาที
                    const new_name = `week${week}-${req.body.id}-${now}.${ext}`;
                    const savePath = `./images/banner/${new_name}`;

                    try {
                        await image.mv(savePath);

                        await db.ComplianceListImages.create({
                            compliance_list_id,
                            week,
                            filename: `images/banner/${new_name}`,
                            datecreate,
                            dateupdate
                        });

                        //console.log(`✅ Uploaded: ${new_name} with datecreate: ${datecreate} and dateupdate: ${dateupdate}`);

                    } catch (error) {
                        console.error("Error saving image:", error);
                        return res.status(500).json({ status: 'error', msg: 'File save failed', error });
                    }
                }
            }
        }

        res.json({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });

    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลได้ในตอนนี้!" });
    }
}
async function createOrUpdate_ComplianceList_bk3(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }
    try {
        const complianceList = await db.ComplianceList.findOne({
            where: { id: req.body.id }
        });

        if (!complianceList) {
            return res.status(404).json({ status: "error", msg: "Compliance List not found" });
        }

        const compliance_list_id = complianceList.id;
        const week = req.body.week;

        if (req.body && req.body.file_id) {
            if (Array.isArray(req.body.file_id) && req.body.file_id.length > 0) {
                const file_ids = Array.isArray(req.body.file_id) ? req.body.file_id : [req.body.file_id];
                for (let i = 0; i < file_ids.length; i++) {
                    const file_id = file_ids[i];
                    const datecreate = req.body.datecreate[i];
                    const dateupdate = req.body.dateupdate[i];
                    //console.log(file_id);
                    //console.log(datecreate);
                    try {
                        if (file_id>0) {
                            await db.ComplianceListImages.update({
                                datecreate: datecreate,
                                // dateupdate: dateUpdate
                            }, {
                                where: { id: file_id }
                            });
                        }
                    } catch (error) {
                        
                    }
                }
            }else{
                if (req.body.file_id != "") {
                    await db.ComplianceListImages.update({
                        datecreate: req.body.datecreate,
                        // dateupdate: dateUpdate
                    }, {
                        where: { id: req.body.file_id }
                    });
                }
            }
            
        }
        if (req.files && req.files.picture) {
            const images = Array.isArray(req.files.picture) ? req.files.picture : [req.files.picture];
            
            for (let i = 0; i < images.length; i++) {
                const image = images[i];
                const datecreate = req.body.datecreate[i];
                const dateupdate = req.body.dateupdate[i];
                
                const ext = image.name.split('.').pop().toLowerCase();
                if (!['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
                    return res.status(500).send({ status: 'error', msg: 'Invalid file type' });
                }

                const today = new Date();
                const timestamp = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}-${today.getHours()}${today.getMinutes()}${today.getSeconds()}`;
                const new_name = `week${week}-${req.body.id}-${timestamp}.${ext}`;
                const savePath = `./images/banner/${new_name}`;

                try {
                    await image.mv(savePath);

                    // const dateCreate = req.body.datecreate || new Date();
                    // const dateUpdate = req.body.dateupdate || new Date();

                    const existingImage = await db.ComplianceListImages.findOne({
                        where: { compliance_list_id, week, filename: `images/banner/${new_name}` }
                    });
                    
                    if (!existingImage) {
                        await db.ComplianceListImages.create({
                            compliance_list_id,
                            week,
                            filename: `images/banner/${new_name}`,
                            datecreate: datecreate,
                            dateupdate: dateupdate
                        });
                    }
                } catch (error) {
                    return res.status(500).send({ status: 'error', msg: 'File save failed', error });
                }
            }
        }

        await db.ComplianceList.update({
            status_area: req.body.status_area,
            placement_point_id: req.body.placement_point_id || 0,
            rental_area_unit_name: req.body.rental_area_unit_name || 0,
            qty: req.body.qty || 0,
            rental_area_unit_id: req.body.rental_area_unit_id || 0,
            substitute_products_id: req.body.substitute_products_id !== 'null' ? req.body.substitute_products_id : 0,
            posm_id: req.body.posm_id !== 'null' ? req.body.posm_id : 0,
            reason_for_not_getting_space_id: req.body.reason_for_not_getting_space_id !== 'null' ? req.body.reason_for_not_getting_space_id : 0,
            note: req.body.note || null,
            competitor_area: req.body.competitor_area !== 'null' ? req.body.competitor_area : 0,
            competitor_id: req.body.competitor_id !== 'null' ? req.body.competitor_id : 0,
            daterange: req.body.daterange || null
        }, {
            where: { id: req.body.id }
        });

        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });

    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลได้ในตอนนี้!" });
    }
}
async function createOrUpdate_ComplianceList_bk(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }
    try {
        const count = await db.Compliance.count({
            where: {
                datesave: req.body.datesave,
                store_id: req.body.store_id,
            }
        });
        if(count > 0){
            const complianceList = await db.ComplianceList.findOne({
                where: { id: req.body.id }
            });
            // ตรวจสอบว่ามีไฟล์ picture อยู่ในคำขอ
            const compliance_list_id = complianceList.id;
            const uploadedFiles = [];
            const uploadedFiles2 = [];
            const uploadedFiles3 = [];
            const uploadedFiles4 = [];
            const datecreate = [];
            const dateupdate = [];
            
            // ✅ วนลูปตรวจสอบ 4 สัปดาห์ (Week 1 - 4)
            for (let week = 1; week <= 4; week++) {
                const fileKey = `picture_week${week}`;
                const dateCreateKey = `datecreate_week${week}`;
                const dateUpdateKey = `dateupdate_week${week}`;

                if (req.files && req.files[fileKey]) {
                    const images = Array.isArray(req.files[fileKey]) ? req.files[fileKey] : [req.files[fileKey]];
                    for (let i = 0; i < images.length; i++) {
                        const image = images[i];
                        const ext = image.name.split('.').pop().toLowerCase();
                        if (!['jpg', 'jpeg', 'png', 'gif'].includes(ext)) {
                            return res.status(500).send({ status: 'error', msg: 'Invalid file type' });
                        }

                        const today = new Date();
                        const timestamp = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}-${today.getHours()}${today.getMinutes()}${today.getSeconds()}`;
                        const new_name = `week${week}-${req.body.id}-${timestamp}.${ext}`;
                        const savePath = `./images/banner/${new_name}`;

                        try {
                            await image.mv(savePath);

                            const dateCreate = Array.isArray(req.body[dateCreateKey]) ? req.body[dateCreateKey][i] : req.body[dateCreateKey];
                            const dateUpdate = Array.isArray(req.body[dateUpdateKey]) ? req.body[dateUpdateKey][i] : req.body[dateUpdateKey];

                            const existingImage = await db.ComplianceListImages.findOne({
                                where: { compliance_list_id, week, filename: `images/banner/${new_name}` }
                            });

                            if (existingImage) {
                                await db.ComplianceListImages.update({
                                    datecreate: dateCreate || new Date(),
                                    dateupdate: dateUpdate || new Date()
                                }, {
                                    where: { id: existingImage.id }
                                });
                            } else {
                                await db.ComplianceListImages.create({
                                    compliance_list_id,
                                    week,
                                    filename: `images/banner/${new_name}`,
                                    datecreate: dateCreate || new Date(),
                                    dateupdate: dateUpdate || new Date()
                                });
                            }
                        } catch (error) {
                            return res.status(500).send({ status: 'error', msg: 'File save failed', error });
                        }
                    }
                }
            }
            if (req.body.id > 0) {
                const existingRecord = await db.ComplianceList.findOne({ where: { id: req.body.id } });
                
                // ถ้ามีภาพใหม่ ให้ต่อเข้ากับภาพเดิม
                if(existingRecord){
                    var updatedpicture_week1 = existingRecord.picture_week1 || '';
                    if (uploadedFiles.length > 0) {
                        updatedpicture_week1 = updatedpicture_week1 ? `${updatedpicture_week1},${uploadedFiles.join(',')}` : uploadedFiles.join(',');
                    }
                    if (uploadedFiles2.length > 0) {
                        updatedpicture_week2 = updatedpicture_week2 ? `${updatedpicture_week2},${uploadedFiles2.join(',')}` : uploadedFiles2.join(',');
                    }
                    if (uploadedFiles3.length > 0) {
                        updatedpicture_week3 = updatedpicture_week3 ? `${updatedpicture_week3},${uploadedFiles3.join(',')}` : uploadedFiles3.join(',');
                    }
                    if (uploadedFiles4.length > 0) {
                        updatedpicture_week4 = updatedpicture_week4 ? `${updatedpicture_week4},${uploadedFiles4.join(',')}` : uploadedFiles4.join(',');
                    }
                    var datecreate_week1 = '';
                    if (Array.isArray(req.body.datecreate_week1) && req.body.datecreate_week1.length > 0) {
                        datecreate_week1 = datecreate_week1 ? `${datecreate_week1},${req.body.datecreate_week1.join(',')}` : req.body.datecreate_week1.join(',');
                    }else{
                        if (req.body.datecreate_week1 != "") {
                            datecreate_week1 = req.body.datecreate_week1;
                        }
                    }
                    var datecreate_week2 = '';
                    if (Array.isArray(req.body.datecreate_week2) && req.body.datecreate_week2.length > 0) {
                        datecreate_week2 = datecreate_week2 ? `${datecreate_week2},${req.body.datecreate_week2.join(',')}` : req.body.datecreate_week2.join(',');
                    }else{
                        if (req.body.datecreate_week2 != "") {
                            datecreate_week2 = req.body.datecreate_week2;
                        }
                    }
                    
                    var datecreate_week3 = '';
                    if (Array.isArray(req.body.datecreate_week3) && req.body.datecreate_week3.length > 0) {
                        datecreate_week3 = datecreate_week3 ? `${datecreate_week3},${req.body.datecreate_week3.join(',')}` : req.body.datecreate_week3.join(',');
                    }else{
                        if (req.body.datecreate_week3 != "") {
                            datecreate_week3 = req.body.datecreate_week3;
                        }
                    }
                    var datecreate_week4 = '';
                    if (Array.isArray(req.body.datecreate_week4) && req.body.datecreate_week4.length > 0) {
                        datecreate_week4 = datecreate_week4 ? `${datecreate_week4},${req.body.datecreate_week4.join(',')}` : req.body.datecreate_week4.join(',');
                    }else{
                        if (req.body.datecreate_week4 != "") {
                            datecreate_week4 = req.body.datecreate_week4;
                        }
                    }

                    var dateupdate_week1 = existingRecord.dateupdate_week1 || '';
                    if (Array.isArray(req.body.dateupdate_week1) && req.body.dateupdate_week1.length > 0) {
                        dateupdate_week1 = dateupdate_week1 ? `${dateupdate_week1},${req.body.dateupdate_week1.join(',')}` : req.body.dateupdate_week1.join(',');
                    }else{
                        if (req.body.dateupdate_week1 != "") {
                            dateupdate_week1 = req.body.dateupdate_week1;
                        }
                    }
                    var dateupdate_week2 = existingRecord.dateupdate_week2 || '';
                    if (Array.isArray(req.body.dateupdate_week2) && req.body.dateupdate_week2.length > 0) {
                        dateupdate_week2 = dateupdate_week2 ? `${dateupdate_week2},${req.body.dateupdate_week2.join(',')}` : req.body.dateupdate_week2.join(',');
                    }else{
                        if (req.body.dateupdate_week2 != "") {
                            dateupdate_week2 = req.body.dateupdate_week2;
                        }
                    }
                    var dateupdate_week3 = existingRecord.dateupdate_week3 || '';
                    if (Array.isArray(req.body.dateupdate_week3) && req.body.dateupdate_week3.length > 0) {
                        dateupdate_week3 = dateupdate_week3 ? `${dateupdate_week3},${req.body.dateupdate_week3.join(',')}` : req.body.dateupdate_week3.join(',');
                    }else{
                        if (req.body.dateupdate_week3 != "") {
                            dateupdate_week3 = req.body.dateupdate_week3;
                        }
                    }
                    var dateupdate_week4 = existingRecord.dateupdate_week4 || '';
                    if (Array.isArray(req.body.dateupdate_week4) && req.body.dateupdate_week4.length > 0) {
                        dateupdate_week4 = dateupdate_week4 ? `${dateupdate_week4},${req.body.dateupdate_week4.join(',')}` : req.body.dateupdate_week4.join(',');
                    }else{
                        if (req.body.dateupdate_week4 != "") {
                            dateupdate_week4 = req.body.dateupdate_week4;
                        }
                    }
                }else{
                    var updatedpicture_week1 = '';
                    if (uploadedFiles.length > 0) {
                        updatedpicture_week1 = updatedpicture_week1 ? `${updatedpicture_week1},${uploadedFiles.join(',')}` : uploadedFiles.join(',');
                    }
                    var updatedpicture_week2 = '';
                    if (uploadedFiles2.length > 0) {
                        updatedpicture_week2 = updatedpicture_week2 ? `${updatedpicture_week2},${uploadedFiles2.join(',')}` : uploadedFiles2.join(',');
                    }
                    var updatedpicture_week3 = '';
                    if (uploadedFiles3.length > 0) {
                        updatedpicture_week3 = updatedpicture_week3 ? `${updatedpicture_week3},${uploadedFiles3.join(',')}` : uploadedFiles3.join(',');
                    }
                    var updatedpicture_week4 = '';
                    if (uploadedFiles4.length > 0) {
                        updatedpicture_week4 = updatedpicture_week4 ? `${updatedpicture_week4},${uploadedFiles4.join(',')}` : uploadedFiles4.join(',');
                    }

                    var datecreate_week1 = '';
                    if (Array.isArray(req.body.datecreate_week1) && req.body.datecreate_week1.length > 0) {
                        datecreate_week1 = datecreate_week1 ? `${datecreate_week1},${req.body.datecreate_week1.join(',')}` : req.body.datecreate_week1.join(',');
                    }else{
                        if (req.body.datecreate_week1 != "") {
                            datecreate_week1 = req.body.datecreate_week1;
                        }
                    }
                    var datecreate_week2 = '';
                    if (Array.isArray(req.body.datecreate_week2) && req.body.datecreate_week2.length > 0) {
                        datecreate_week2 = datecreate_week2 ? `${datecreate_week2},${req.body.datecreate_week2.join(',')}` : req.body.datecreate_week2.join(',');
                    }else{
                        if (req.body.datecreate_week2 != "") {
                            datecreate_week2 = req.body.datecreate_week2;
                        }
                    }
                    var datecreate_week3 = '';
                    if (Array.isArray(req.body.datecreate_week3) && req.body.datecreate_week3.length > 0) {
                        datecreate_week3 = datecreate_week3 ? `${datecreate_week3},${req.body.datecreate_week3.join(',')}` : req.body.datecreate_week3.join(',');
                    }else{
                        if (req.body.datecreate_week3 != "") {
                            datecreate_week3 = req.body.datecreate_week3;
                        }
                    }
                    var datecreate_week4 = '';
                    if (Array.isArray(req.body.datecreate_week4) && req.body.datecreate_week4.length > 0) {
                        datecreate_week4 = datecreate_week4 ? `${datecreate_week4},${req.body.datecreate_week4.join(',')}` : req.body.datecreate_week4.join(',');
                    }else{
                        if (req.body.datecreate_week4 != "") {
                            datecreate_week4 = req.body.datecreate_week4;
                        }
                    }

                    var dateupdate_week1 = '';
                    if (Array.isArray(req.body.dateupdate_week1) && req.body.dateupdate_week1.length > 0) {
                        dateupdate_week1 = dateupdate_week1 ? `${dateupdate_week1},${req.body.dateupdate_week1.join(',')}` : req.body.dateupdate_week1.join(',');
                    }else{
                        if (req.body.dateupdate_week1 != "") {
                            dateupdate_week1 = req.body.dateupdate_week1;
                        }
                    }
                    var dateupdate_week2 = '';
                    if (Array.isArray(req.body.dateupdate_week2) && req.body.dateupdate_week2.length > 0) {
                        dateupdate_week2 = dateupdate_week2 ? `${dateupdate_week2},${req.body.dateupdate_week2.join(',')}` : req.body.dateupdate_week2.join(',');
                    }else{
                        if (req.body.dateupdate_week2 != "") {
                            dateupdate_week2 = req.body.dateupdate_week2;
                        }
                    }
                    var dateupdate_week3 = '';
                    if (Array.isArray(req.body.dateupdate_week3) && req.body.dateupdate_week3.length > 0) {
                        dateupdate_week3 = dateupdate_week3 ? `${dateupdate_week3},${req.body.dateupdate_week3.join(',')}` : req.body.dateupdate_week3.join(',');
                    }else{
                        if (req.body.dateupdate_week3 != "") {
                            dateupdate_week3 = req.body.dateupdate_week3;
                        }
                    }
                    var dateupdate_week4 = '';
                    if (Array.isArray(req.body.dateupdate_week4) && req.body.dateupdate_week4.length > 0) {
                        dateupdate_week4 = dateupdate_week4 ? `${dateupdate_week4},${req.body.dateupdate_week4.join(',')}` : req.body.dateupdate_week4.join(',');
                    }else{
                        if (req.body.dateupdate_week4 != "") {
                            dateupdate_week4 = req.body.dateupdate_week4;
                        }
                    }
                }
                
                await db.ComplianceList.update({
                    status_area: req.body.status_area,
                    placement_point_id: req.body.placement_point_id || 0,
                    rental_area_unit_name: req.body.rental_area_unit_name || 0,
                    qty: req.body.qty || 0,
                    rental_area_unit_id: req.body.rental_area_unit_id || 0,
                    substitute_products_id: (req.body.substitute_products_id != 'null'?req.body.substitute_products_id:0),
                    posm_id: (req.body.posm_id != 'null'?req.body.posm_id:0),
                    reason_for_not_getting_space_id: (req.body.reason_for_not_getting_space_id != 'null'?req.body.reason_for_not_getting_space_id:0),
                    note: req.body.note || null,
                    competitor_area: (req.body.competitor_area != 'null'?req.body.competitor_area:0),
                    competitor_id: (req.body.competitor_id != 'null'?req.body.competitor_id:0),
                    daterange: req.body.daterange || null,
                    picture_week1: updatedpicture_week1 || null,  // อัปเดต picture ที่มีการรวมภาพใหม่เข้ากับภาพเดิม
                    picture_week2: updatedpicture_week2 || null,
                    picture_week3: updatedpicture_week3 || null,
                    picture_week4: updatedpicture_week4 || null,
                    datecreate_week1: datecreate_week1 || null,
                    datecreate_week2: datecreate_week2 || null,
                    datecreate_week3: datecreate_week3 || null,
                    datecreate_week4: datecreate_week4 || null,

                    dateupdate_week1: dateupdate_week1 || null,
                    dateupdate_week2: dateupdate_week2 || null,
                    dateupdate_week3: dateupdate_week3 || null,
                    dateupdate_week4: dateupdate_week4 || null,
                }, {
                    where: { id: req.body.id }
                });
            }
        }
        
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลได้ในตอนนี้!" });
    }
}
async function createOrUpdate_ComplianceList_bk2(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }
    try {
        const count = await db.Compliance.count({
            where: {
                datesave: req.body.datesave,
                store_id: req.body.store_id,
            }
        });
        if(count > 0){
            const complianceList = await db.ComplianceList.findOne({
                where: { id: req.body.id }
            });
            // ตรวจสอบว่ามีไฟล์ picture อยู่ในคำขอ
            const compliance_list_id = complianceList.id;
            const uploadedFiles = [];
            const uploadedFiles2 = [];
            const uploadedFiles3 = [];
            const uploadedFiles4 = [];
            const datecreate = [];
            const dateupdate = [];
            
            if (req.files && req.files.picture_week1 && req.files.picture_week1 !== 'undefined') {
                const picture_week1 = Array.isArray(req.files.picture_week1) ? req.files.picture_week1 : [req.files.picture_week1];
                
        
                for (let image_game of picture_week1) {
                    let ext = image_game.name.split('.').pop().toLowerCase();
                    if (['jpg', 'jpeg', 'png'].includes(ext)) {
                        var today = new Date();
                        var date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}-${today.getHours()}${today.getMinutes()}${today.getSeconds()}`;
                        var new_name = `picture_week1-${req.body.id}-${date}.${ext}`;
                        var savePath = `./images/banner/${new_name}`;
            
                        try {
                            await image_game.mv(savePath);
                            uploadedFiles.push(`images/banner/${new_name}`);
                        } catch (error) {
                            return res.status(500).send({ status: 'error', msg: 'File save failed', error });
                        }
                    } else {
                        return res.status(500).send({ status: 'error', msg: 'Invalid file type' });
                    }
                }
        
                
            } else {
                // //console.log("No valid picture files were uploaded or picture is undefined");
            }
            if (req.files && req.files.picture_week2 && req.files.picture_week2 !== 'undefined') {
                const picture_week2 = Array.isArray(req.files.picture_week2) ? req.files.picture_week2 : [req.files.picture_week2];
                
        
                for (let image_game of picture_week2) {
                    let ext = image_game.name.split('.').pop().toLowerCase();
                    if (['jpg', 'jpeg', 'png'].includes(ext)) {
                        var today = new Date();
                        var date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}-${today.getHours()}${today.getMinutes()}${today.getSeconds()}`;
                        var new_name = `picture_week2-${req.body.id}-${date}.${ext}`;
                        var savePath2 = `./images/banner/${new_name}`;
            
                        try {
                            await image_game.mv(savePath2);
                            uploadedFiles2.push(`images/banner/${new_name}`);
                        } catch (error) {
                            return res.status(500).send({ status: 'error', msg: 'File save failed', error });
                        }
                    } else {
                        return res.status(500).send({ status: 'error', msg: 'Invalid file type' });
                    }
                }
        
                
            } else {
                // //console.log("No valid picture files were uploaded or picture is undefined");
            }
            if (req.files && req.files.picture_week3 && req.files.picture_week3 !== 'undefined') {
                const picture_week3 = Array.isArray(req.files.picture_week3) ? req.files.picture_week3 : [req.files.picture_week3];
                
        
                for (let image_game of picture_week3) {
                    let ext = image_game.name.split('.').pop().toLowerCase();
                    if (['jpg', 'jpeg', 'png'].includes(ext)) {
                        var today = new Date();
                        var date = `picture_week3-${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}-${today.getHours()}${today.getMinutes()}${today.getSeconds()}`;
                        var new_name = `${req.body.id}-${date}.${ext}`;
                        var savePath3 = `./images/banner/${new_name}`;
            
                        try {
                            await image_game.mv(savePath3);
                            uploadedFiles3.push(`images/banner/${new_name}`);
                        } catch (error) {
                            return res.status(500).send({ status: 'error', msg: 'File save failed', error });
                        }
                    } else {
                        return res.status(500).send({ status: 'error', msg: 'Invalid file type' });
                    }
                }
        
                
            } else {
                // //console.log("No valid picture files were uploaded or picture is undefined");
            }
            if (req.files && req.files.picture_week4 && req.files.picture_week4 !== 'undefined') {
                const picture_week4 = Array.isArray(req.files.picture_week4) ? req.files.picture_week4 : [req.files.picture_week4];
                
        
                for (let image_game of picture_week4) {
                    let ext = image_game.name.split('.').pop().toLowerCase();
                    if (['jpg', 'jpeg', 'png'].includes(ext)) {
                        var today = new Date();
                        var date = `picture_week4-${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}-${today.getHours()}${today.getMinutes()}${today.getSeconds()}`;
                        var new_name = `${req.body.id}-${date}.${ext}`;
                        var savePat4 = `./images/banner/${new_name}`;
            
                        try {
                            await image_game.mv(savePat4);
                            uploadedFiles4.push(`images/banner/${new_name}`);
                        } catch (error) {
                            return res.status(500).send({ status: 'error', msg: 'File save failed', error });
                        }
                    } else {
                        return res.status(500).send({ status: 'error', msg: 'Invalid file type' });
                    }
                }
        
                
            } else {
                // //console.log("No valid picture files were uploaded or picture is undefined");
            }
            if (req.body.id > 0) {
                const existingRecord = await db.ComplianceList.findOne({ where: { id: req.body.id } });
                
                // ถ้ามีภาพใหม่ ให้ต่อเข้ากับภาพเดิม
                if(existingRecord){
                    var updatedpicture_week1 = existingRecord.picture_week1 || '';
                    if (uploadedFiles.length > 0) {
                        updatedpicture_week1 = updatedpicture_week1 ? `${updatedpicture_week1},${uploadedFiles.join(',')}` : uploadedFiles.join(',');
                    }
                    if (uploadedFiles2.length > 0) {
                        updatedpicture_week2 = updatedpicture_week2 ? `${updatedpicture_week2},${uploadedFiles2.join(',')}` : uploadedFiles2.join(',');
                    }
                    if (uploadedFiles3.length > 0) {
                        updatedpicture_week3 = updatedpicture_week3 ? `${updatedpicture_week3},${uploadedFiles3.join(',')}` : uploadedFiles3.join(',');
                    }
                    if (uploadedFiles4.length > 0) {
                        updatedpicture_week4 = updatedpicture_week4 ? `${updatedpicture_week4},${uploadedFiles4.join(',')}` : uploadedFiles4.join(',');
                    }
                    var datecreate_week1 = '';
                    if (Array.isArray(req.body.datecreate_week1) && req.body.datecreate_week1.length > 0) {
                        datecreate_week1 = datecreate_week1 ? `${datecreate_week1},${req.body.datecreate_week1.join(',')}` : req.body.datecreate_week1.join(',');
                    }else{
                        if (req.body.datecreate_week1 != "") {
                            datecreate_week1 = req.body.datecreate_week1;
                        }
                    }
                    var datecreate_week2 = '';
                    if (Array.isArray(req.body.datecreate_week2) && req.body.datecreate_week2.length > 0) {
                        datecreate_week2 = datecreate_week2 ? `${datecreate_week2},${req.body.datecreate_week2.join(',')}` : req.body.datecreate_week2.join(',');
                    }else{
                        if (req.body.datecreate_week2 != "") {
                            datecreate_week2 = req.body.datecreate_week2;
                        }
                    }
                    
                    var datecreate_week3 = '';
                    if (Array.isArray(req.body.datecreate_week3) && req.body.datecreate_week3.length > 0) {
                        datecreate_week3 = datecreate_week3 ? `${datecreate_week3},${req.body.datecreate_week3.join(',')}` : req.body.datecreate_week3.join(',');
                    }else{
                        if (req.body.datecreate_week3 != "") {
                            datecreate_week3 = req.body.datecreate_week3;
                        }
                    }
                    var datecreate_week4 = '';
                    if (Array.isArray(req.body.datecreate_week4) && req.body.datecreate_week4.length > 0) {
                        datecreate_week4 = datecreate_week4 ? `${datecreate_week4},${req.body.datecreate_week4.join(',')}` : req.body.datecreate_week4.join(',');
                    }else{
                        if (req.body.datecreate_week4 != "") {
                            datecreate_week4 = req.body.datecreate_week4;
                        }
                    }

                    var dateupdate_week1 = existingRecord.dateupdate_week1 || '';
                    if (Array.isArray(req.body.dateupdate_week1) && req.body.dateupdate_week1.length > 0) {
                        dateupdate_week1 = dateupdate_week1 ? `${dateupdate_week1},${req.body.dateupdate_week1.join(',')}` : req.body.dateupdate_week1.join(',');
                    }else{
                        if (req.body.dateupdate_week1 != "") {
                            dateupdate_week1 = req.body.dateupdate_week1;
                        }
                    }
                    var dateupdate_week2 = existingRecord.dateupdate_week2 || '';
                    if (Array.isArray(req.body.dateupdate_week2) && req.body.dateupdate_week2.length > 0) {
                        dateupdate_week2 = dateupdate_week2 ? `${dateupdate_week2},${req.body.dateupdate_week2.join(',')}` : req.body.dateupdate_week2.join(',');
                    }else{
                        if (req.body.dateupdate_week2 != "") {
                            dateupdate_week2 = req.body.dateupdate_week2;
                        }
                    }
                    var dateupdate_week3 = existingRecord.dateupdate_week3 || '';
                    if (Array.isArray(req.body.dateupdate_week3) && req.body.dateupdate_week3.length > 0) {
                        dateupdate_week3 = dateupdate_week3 ? `${dateupdate_week3},${req.body.dateupdate_week3.join(',')}` : req.body.dateupdate_week3.join(',');
                    }else{
                        if (req.body.dateupdate_week3 != "") {
                            dateupdate_week3 = req.body.dateupdate_week3;
                        }
                    }
                    var dateupdate_week4 = existingRecord.dateupdate_week4 || '';
                    if (Array.isArray(req.body.dateupdate_week4) && req.body.dateupdate_week4.length > 0) {
                        dateupdate_week4 = dateupdate_week4 ? `${dateupdate_week4},${req.body.dateupdate_week4.join(',')}` : req.body.dateupdate_week4.join(',');
                    }else{
                        if (req.body.dateupdate_week4 != "") {
                            dateupdate_week4 = req.body.dateupdate_week4;
                        }
                    }
                }else{
                    var updatedpicture_week1 = '';
                    if (uploadedFiles.length > 0) {
                        updatedpicture_week1 = updatedpicture_week1 ? `${updatedpicture_week1},${uploadedFiles.join(',')}` : uploadedFiles.join(',');
                    }
                    var updatedpicture_week2 = '';
                    if (uploadedFiles2.length > 0) {
                        updatedpicture_week2 = updatedpicture_week2 ? `${updatedpicture_week2},${uploadedFiles2.join(',')}` : uploadedFiles2.join(',');
                    }
                    var updatedpicture_week3 = '';
                    if (uploadedFiles3.length > 0) {
                        updatedpicture_week3 = updatedpicture_week3 ? `${updatedpicture_week3},${uploadedFiles3.join(',')}` : uploadedFiles3.join(',');
                    }
                    var updatedpicture_week4 = '';
                    if (uploadedFiles4.length > 0) {
                        updatedpicture_week4 = updatedpicture_week4 ? `${updatedpicture_week4},${uploadedFiles4.join(',')}` : uploadedFiles4.join(',');
                    }

                    var datecreate_week1 = '';
                    if (Array.isArray(req.body.datecreate_week1) && req.body.datecreate_week1.length > 0) {
                        datecreate_week1 = datecreate_week1 ? `${datecreate_week1},${req.body.datecreate_week1.join(',')}` : req.body.datecreate_week1.join(',');
                    }else{
                        if (req.body.datecreate_week1 != "") {
                            datecreate_week1 = req.body.datecreate_week1;
                        }
                    }
                    var datecreate_week2 = '';
                    if (Array.isArray(req.body.datecreate_week2) && req.body.datecreate_week2.length > 0) {
                        datecreate_week2 = datecreate_week2 ? `${datecreate_week2},${req.body.datecreate_week2.join(',')}` : req.body.datecreate_week2.join(',');
                    }else{
                        if (req.body.datecreate_week2 != "") {
                            datecreate_week2 = req.body.datecreate_week2;
                        }
                    }
                    var datecreate_week3 = '';
                    if (Array.isArray(req.body.datecreate_week3) && req.body.datecreate_week3.length > 0) {
                        datecreate_week3 = datecreate_week3 ? `${datecreate_week3},${req.body.datecreate_week3.join(',')}` : req.body.datecreate_week3.join(',');
                    }else{
                        if (req.body.datecreate_week3 != "") {
                            datecreate_week3 = req.body.datecreate_week3;
                        }
                    }
                    var datecreate_week4 = '';
                    if (Array.isArray(req.body.datecreate_week4) && req.body.datecreate_week4.length > 0) {
                        datecreate_week4 = datecreate_week4 ? `${datecreate_week4},${req.body.datecreate_week4.join(',')}` : req.body.datecreate_week4.join(',');
                    }else{
                        if (req.body.datecreate_week4 != "") {
                            datecreate_week4 = req.body.datecreate_week4;
                        }
                    }

                    var dateupdate_week1 = '';
                    if (Array.isArray(req.body.dateupdate_week1) && req.body.dateupdate_week1.length > 0) {
                        dateupdate_week1 = dateupdate_week1 ? `${dateupdate_week1},${req.body.dateupdate_week1.join(',')}` : req.body.dateupdate_week1.join(',');
                    }else{
                        if (req.body.dateupdate_week1 != "") {
                            dateupdate_week1 = req.body.dateupdate_week1;
                        }
                    }
                    var dateupdate_week2 = '';
                    if (Array.isArray(req.body.dateupdate_week2) && req.body.dateupdate_week2.length > 0) {
                        dateupdate_week2 = dateupdate_week2 ? `${dateupdate_week2},${req.body.dateupdate_week2.join(',')}` : req.body.dateupdate_week2.join(',');
                    }else{
                        if (req.body.dateupdate_week2 != "") {
                            dateupdate_week2 = req.body.dateupdate_week2;
                        }
                    }
                    var dateupdate_week3 = '';
                    if (Array.isArray(req.body.dateupdate_week3) && req.body.dateupdate_week3.length > 0) {
                        dateupdate_week3 = dateupdate_week3 ? `${dateupdate_week3},${req.body.dateupdate_week3.join(',')}` : req.body.dateupdate_week3.join(',');
                    }else{
                        if (req.body.dateupdate_week3 != "") {
                            dateupdate_week3 = req.body.dateupdate_week3;
                        }
                    }
                    var dateupdate_week4 = '';
                    if (Array.isArray(req.body.dateupdate_week4) && req.body.dateupdate_week4.length > 0) {
                        dateupdate_week4 = dateupdate_week4 ? `${dateupdate_week4},${req.body.dateupdate_week4.join(',')}` : req.body.dateupdate_week4.join(',');
                    }else{
                        if (req.body.dateupdate_week4 != "") {
                            dateupdate_week4 = req.body.dateupdate_week4;
                        }
                    }
                }
                
                await db.ComplianceList.update({
                    status_area: req.body.status_area,
                    placement_point_id: req.body.placement_point_id || 0,
                    rental_area_unit_name: req.body.rental_area_unit_name || 0,
                    qty: req.body.qty || 0,
                    rental_area_unit_id: req.body.rental_area_unit_id || 0,
                    substitute_products_id: (req.body.substitute_products_id != 'null'?req.body.substitute_products_id:0),
                    posm_id: (req.body.posm_id != 'null'?req.body.posm_id:0),
                    reason_for_not_getting_space_id: (req.body.reason_for_not_getting_space_id != 'null'?req.body.reason_for_not_getting_space_id:0),
                    note: req.body.note || null,
                    competitor_area: (req.body.competitor_area != 'null'?req.body.competitor_area:0),
                    competitor_id: (req.body.competitor_id != 'null'?req.body.competitor_id:0),
                    daterange: req.body.daterange || null,
                    picture_week1: updatedpicture_week1 || null,  // อัปเดต picture ที่มีการรวมภาพใหม่เข้ากับภาพเดิม
                    picture_week2: updatedpicture_week2 || null,
                    picture_week3: updatedpicture_week3 || null,
                    picture_week4: updatedpicture_week4 || null,
                    datecreate_week1: datecreate_week1 || null,
                    datecreate_week2: datecreate_week2 || null,
                    datecreate_week3: datecreate_week3 || null,
                    datecreate_week4: datecreate_week4 || null,

                    dateupdate_week1: dateupdate_week1 || null,
                    dateupdate_week2: dateupdate_week2 || null,
                    dateupdate_week3: dateupdate_week3 || null,
                    dateupdate_week4: dateupdate_week4 || null,
                }, {
                    where: { id: req.body.id }
                });
            }
        }
        
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลได้ในตอนนี้!" });
    }
}
async function updateOnlyComplianceList(req, res) {
    try {
        //console.log("Request Body:", req.body);

        // ตรวจสอบว่า req.body เป็น array หรือไม่
        if (!Array.isArray(req.body)) {
            return res.status(400).json({ status: "error", msg: "Invalid request, data should be an array" });
        }

        const updatePromises = req.body.map(async (item) => {
            if (!item.id) {
                console.error("Missing ID in complianceDetails:", item);
                return Promise.reject(`Missing ID for item: ${JSON.stringify(item)}`);
            }

            const complianceList = await db.ComplianceList.findOne({ where: { id: item.id } });

            if (!complianceList) {
                console.error(`Compliance List not found for ID: ${item.id}`);
                return Promise.reject(`Compliance List not found for ID: ${item.id}`);
            }

            await db.ComplianceList.update({
                status_area: item.status_area,
                placement_point_id: item.placement_point_id || 0,
                rental_area_unit_name: item.rental_area_unit_name || "",
                qty: item.qty || 0,
                rental_area_unit_id: item.rental_area_unit_id || 0,
                substitute_products_id: (Array.isArray(item.substitute_products_id) && item.substitute_products_id.length > 0) 
                ? item.substitute_products_id.join(",") // ✅ แปลง Array เป็น String
                : (item.substitute_products_id ? String(item.substitute_products_id) : null),
                posm_id: item.posm_id && item.posm_id !== 'null' ? item.posm_id : 0,
                reason_for_not_getting_space_id: item.reason_for_not_getting_space_id && item.reason_for_not_getting_space_id !== 'null'? item.reason_for_not_getting_space_id : 0,
                note: item.note || "",
                competitor_area: item.competitor_area && item.competitor_area !== 'null' ? item.competitor_area : 0,
                competitor_id: item.competitor_id && item.competitor_id !== 'null' ? item.competitor_id : 0,
                daterange: item.daterange || null
            }, { where: { id: item.id } });
        });

        // ใช้ Promise.all เพื่อรอให้อัปเดตทั้งหมดเสร็จสิ้น
        await Promise.all(updatePromises);

        res.json({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });

    } catch (err) {
        console.error("Error:", err);
        res.status(500).json({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลได้ในตอนนี้!" });
    }
}
//get all ComplianceList
async function get_all_ComplianceList(req, res) {
    try {
        let data = await db.ComplianceList.findAll({
            include: [
                {
                    model: db.Compliance,
                    as: 'Compliance', // ชื่อ alias ที่ตั้งไว้ใน model
                    required: false, // เลือกเฉพาะฟิลด์ที่ต้องการ (เช่น name)
                },
                {
                    model: db.Product,
                    as: 'product', // ชื่อ alias ที่ตั้งไว้ใน model
                    required: false, // เลือกเฉพาะฟิลด์ที่ต้องการ (เช่น name)
                },
            ],
        });
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

async function get_all_ComplianceList_filter(req, res) {
    try {
        // ตรวจสอบว่าค่าต่าง ๆ มีใน req.body หรือไม่
        const whereConditions = {};
        if (req.body.account_id) whereConditions.account_id = req.body.account_id;
        if (req.body.account_type_id) whereConditions.account_type_id = req.body.account_type_id;
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        //console.log(whereConditions);
        let data = await db.ComplianceList.findAll({
            include: [
                {
                    model: db.Compliance,
                    as: 'Compliance', // ชื่อ alias ที่ตั้งไว้ใน model
                    required: Object.keys(whereConditions).length > 0, // ถ้ามีเงื่อนไขจะทำให้การ join เป็น inner join
                    where: whereConditions,
                },
                {
                    model: db.Product,
                    as: 'product', // ชื่อ alias ที่ตั้งไว้ใน model
                    required: false,
                },
            ],
        });
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//get ComplianceList by id
async function get_ComplianceList_by_id(req, res) {
    try {
        let data = await db.ComplianceList.findByPk(req.params.id);

        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//update ComplianceList
async function update_ComplianceList(req, res) {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.ComplianceList.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.ComplianceList.update(req.body, { where: { id: req.params.id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

}

//update ComplianceList isActive
async function update_ComplianceList_isActive(req, res) {
    const id = req.params.id;
    const error = validation(req, ['isActive']);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.ComplianceList.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.ComplianceList.update(req.body, { where: { id: id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }
}
async function complianceDetailsdeleteImage(req, res) {
    // res.send({ status: "success", message: req.body });
    try {
        const { id, week, filename } = req.body;

        // ตรวจสอบว่ามี record ใน ComplianceListImages หรือไม่
        const record = await db.ComplianceListImages.findOne({
            where: { compliance_list_id: id, week, filename }
        });

        if (!record) {
            return res.status(404).send({ status: "error", message: "ไม่พบรายการนี้" });
        }

        // กำหนด path ของไฟล์ที่ต้องการลบ
        const savePath = path.join(__dirname, `../images/banner/${filename}`);

        // ลบ record ออกจาก ComplianceListImages
        await db.ComplianceListImages.destroy({
            where: { id: record.id }
        });

        // ตรวจสอบว่าไฟล์มีอยู่จริงก่อนทำการลบ
        if (fs.existsSync(savePath)) {
            fs.unlinkSync(savePath); // ลบไฟล์
        }

        res.send({ status: "success", message: "ลบรูปภาพเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "เกิดข้อผิดพลาดในการลบรูปภาพ" });
    }
}
async function complianceDetailsdeleteImageExtra(req, res) {
    // res.send({ status: "success", message: req.body });
    try {
        const { id, week, filename } = req.body;

        // ตรวจสอบว่ามี record ใน ComplianceListImagesextra หรือไม่
        const record = await db.ComplianceListImagesextra.findOne({
            where: { id: id, week, filename }
        });

        if (!record) {
            return res.status(404).send({ status: "error", message: "ไม่พบรายการนี้" });
        }

        // กำหนด path ของไฟล์ที่ต้องการลบ
        const savePath = path.join(__dirname, `../images/banner/${filename}`);

        // ลบ record ออกจาก ComplianceListImages
        await db.ComplianceListImagesextra.destroy({
            where: { id: record.id }
        });

        // ตรวจสอบว่าไฟล์มีอยู่จริงก่อนทำการลบ
        if (fs.existsSync(savePath)) {
            fs.unlinkSync(savePath); // ลบไฟล์
        }

        res.send({ status: "success", message: "ลบรูปภาพเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "เกิดข้อผิดพลาดในการลบรูปภาพ" });
    }
}
module.exports = {

    //exprot function
    create_ComplianceList,
    createOrUpdate_ComplianceList,
    createOrUpdate_ComplianceListExtra,
    createOrUpdate_ComplianceListExtraImage,
    createOrUpdate_Compliance,
    updateOnlyComplianceList,
    get_all_ComplianceList,
    get_all_ComplianceList_filter,
    get_ComplianceList_by_id,
    update_ComplianceList,
    update_ComplianceList_isActive,
    complianceDetailsdeleteImage,
    complianceDetailsdeleteImageExtra,
    saveAllComplianceListExtra,

    findAll: async (req, res) => {
        const username = req.query.username;
        var condition = username ? { username: { [Op.like]: `%${username}%` } } : null;
        const { page, perPage, sort } = req.body;
        const { limit, offset } = getPagination(page, perPage);
        const order = [[sort.field ? sort.field : 'id', sort.desc ? 'DESC' : 'ASC']];

        try {
            let data = await db.User.findAndCountAll({
                where: condition, order, limit, offset
            });
            res.send(getPagingData(data, page, limit));
        } catch (err) {
            res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
        }
    },

    findOne: async (req, res) => {
        const id = req.params.id;
        const error = validation(req);
        if (error) {
            return res.status(422).json(error);
        }

        try {
            let row = await db.User.findByPk(req.params.id);
            res.send({ status: "success", row: row });
        } catch (err) {
            res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลที่เลือกได้!" });
        }
    },

    update: async (req, res) => {
        const id = req.params.id;
        const error = validation(req);
        if (error) {
            return res.status(422).json(error);
        }

        try {
            let row = await db.User.findByPk(req.params.id);
            if (!row) {
                throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
            }
            delete req.body.username;
            if (req.body.password) {
                req.body.password = await Bcrypt.hashSync(req.body.password, 10);
            } else {
                delete req.body.password;
            }
            await db.User.update(req.body, { where: { id: req.params.id } });
            res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
        } catch (err) {
            res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
        }

    },

    delete: async (req, res) => {
        const id = req.params.id;
        const error = validation(req);
        if (error) {
            return res.status(422).json(error);
        }

        try {
            let row = await db.User.findByPk(req.params.id);
            if (!row) {
                throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการลบ');
            }
            await db.User.destroy({ where: { id: req.params.id } });
            res.send({ status: "success", message: "ลบข้อมูลเรียบร้อย" });
        } catch (err) {
            res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
        }

    },

    status: async (req, res) => {
        const id = req.params.id;
        const error = validation(req, ['isActive']);
        if (error) {
            return res.status(422).json(error);
        }

        try {
            let row = await db.User.findByPk(req.params.id);
            if (!row) {
                throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
            }
            await db.User.update(req.body, { where: { id: id } });
            res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
        } catch (err) {
            res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
        }
    },

}
