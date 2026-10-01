const db = require("../models")

const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const { json } = require("sequelize");
const Op = db.Sequelize.Op

// ฟังก์ชันนี้ปรับปรุงการจัดการ Error ให้ละเอียดขึ้น
async function import_MapUserArea(req, res) {
    try {
        let file = req.files.file_excel;
        if (!file) {
            return res.status(400).send({ status: "error", message: "No file uploaded" });
        }

        // --- ส่วนจัดการไฟล์ (เหมือนเดิม) ---
        var ext = file.name.split(".").pop();
        var today = new Date();
        var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + '-' +
            today.getHours() + "" + today.getMinutes() + "" + today.getSeconds();
        var new_name = date + '.' + ext;
        
        const filePath = './uploads/excel/' + new_name;
        await file.mv(filePath);

        // --- อ่านข้อมูลและประมวลผล ---
        let data = await read_excel(filePath); // read_excel ควรจัดการลบไฟล์เอง
        let result = await insert_userarea(data);

        return res.send({ status: "success", message: "Data imported successfully.", data: result });

    } catch (error) {
        console.error("Error in import_MapUserArea: ", error);

        // **ส่วนจัดการ Error ที่ปรับปรุงใหม่**
        // เช็คว่า Error นี้เป็น Error จากการตรวจสอบข้อมูลที่เราสร้างขึ้นเองหรือไม่
        if (error.isValidationError) {
            return res.send({
                status: "error",
                // message: "Data validation failed. Please correct the following items in your file.",
                message: error.details // ส่งรายการ Error ทั้งหมดกลับไป
            });
        }

        // ถ้าเป็น Error อื่นๆ
        return res.status(500).send({ status: "error", message: error.message || "Error processing file" });
    }
}


// ฟังก์ชันนี้ถูกเขียนขึ้นใหม่ทั้งหมดเพื่อให้ตรงตามเงื่อนไข
async function insert_userarea(data) {
    const dataToUpsert = []; 
    const validationErrors = []; 

    // 🌟 Step 1: แปลงชื่อ Header ของ Excel ทุกคอลัมน์ให้เป็น "ตัวเล็ก" และ "ตัดช่องว่าง"
    // ป้องกันปัญหาคนทำไฟล์ Excel พิมพ์เว้นวรรคเกิน หรือพิมพ์ตัวพิมพ์ใหญ่มา
    const normalizedData = data.map(row => {
        const cleanRow = {};
        for (let key in row) {
            if (row.hasOwnProperty(key)) {
                cleanRow[key.trim().toLowerCase()] = row[key];
            }
        }
        return cleanRow;
    });

    // --- Step 2: วน Loop เพื่อตรวจสอบข้อมูล ---
    for (let i = 0; i < normalizedData.length; i++) {
        const rowData = normalizedData[i];
        const currentRow = i + 2; // +2 เพื่อให้ตรงกับเลขแถวใน Excel

        let group_customer_id_new = null;
        let area_supervisor_id_new = null;
        let area_manager_id_new = null;

        // --- ตรวจสอบ GroupCustomer ---
        // เช็คเผื่อกรณีชื่อคอลัมน์ใน Excel คือ group_customer_id
        if (rowData.group_customer_id) {
            const groupCustomer = await db.GroupCustomer.findOne({
                where: { name: String(rowData.group_customer_id).trim() }
            });
            if (!groupCustomer) {
                validationErrors.push(`Row ${currentRow}: ไม่พบข้อมูล GroupCustomer '${rowData.group_customer_id}' ในฐานข้อมูล`);
                continue; 
            }
            group_customer_id_new = groupCustomer.id;
        }

        // --- ตรวจสอบ AreaSupervisor (บังคับ) ---
        if (!rowData.area_supervisor_id) {
             // ❗️ เปลี่ยนข้อความให้ชัดเจนว่า ปัญหาอยู่ที่ไฟล์ Excel
             validationErrors.push(`Row ${currentRow}: คอลัมน์ 'area_supervisor_id' ในไฟล์ Excel ว่างเปล่า หรือสะกดชื่อคอลัมน์ผิด`);
             continue;
        }
        const areaSupervisor = await db.AreaSupervisor.findOne({
            where: { name: String(rowData.area_supervisor_id).trim() }
        });
        if (!areaSupervisor) {
             // ❗️ เปลี่ยนข้อความให้ชัดเจนว่า ปัญหาอยู่ที่ Database
            validationErrors.push(`Row ${currentRow}: ไม่พบรหัส AreaSupervisor '${rowData.area_supervisor_id}' ในฐานข้อมูลระบบ`);
            continue;
        }
        area_supervisor_id_new = areaSupervisor.id;


        // --- ตรวจสอบ AreaManager (บังคับ) ---
        if (!rowData.area_manager_id) {
             validationErrors.push(`Row ${currentRow}: คอลัมน์ 'area_manager_id' ในไฟล์ Excel ว่างเปล่า หรือสะกดชื่อคอลัมน์ผิด`);
             continue;
        }
        const areaManager = await db.AreaManager.findOne({
            where: { name: String(rowData.area_manager_id).trim() }
        });
        if (!areaManager) {
            validationErrors.push(`Row ${currentRow}: ไม่พบรหัส AreaManager '${rowData.area_manager_id}' ในฐานข้อมูลระบบ`);
            continue;
        }
        area_manager_id_new = areaManager.id;


        // ถ้ารอดทุกการตรวจสอบ ให้เตรียมข้อมูลสำหรับบันทึก
        dataToUpsert.push({
            group_customer_id: group_customer_id_new,
            area_supervisor_id: area_supervisor_id_new,
            area_manager_id: area_manager_id_new,
            isActive: 'Y',
        });
    }

    // --- Step 3: ตรวจสอบว่ามี Error หรือไม่ ---
    if (validationErrors.length > 0) {
        const error = new Error("Validation failed");
        error.isValidationError = true; 
        error.details = validationErrors;
        throw error;
    }

    // --- Step 4: ทำการบันทึกข้อมูล ---
    if (dataToUpsert.length > 0) {
        await db.MapUserArea.bulkCreate(dataToUpsert, {
            updateOnDuplicate: ["isActive"], 
        });
        console.log('Data upserted successfully');
        return dataToUpsert;
    }

    return []; 
}

// ฟังก์ชัน read_excel แนะนำให้ลบไฟล์หลังจากอ่านเสร็จทันที
async function read_excel(filePath) {
    try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json(worksheet);
        
        // ลบไฟล์หลังจากอ่านข้อมูลเสร็จ
        fs.unlinkSync(filePath);

        return jsonData;
    } catch (error) {
        // หากเกิด Error ในการอ่าน ก็ควรลบไฟล์ทิ้งเช่นกัน
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        console.error("Error reading file: ", error);
        throw new Error("Error reading Excel file");
    }
}


module.exports = {
    import_MapUserArea
}