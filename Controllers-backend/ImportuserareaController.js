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
    const dataToUpsert = []; // Array สำหรับเก็บข้อมูลที่ผ่านการตรวจสอบแล้ว เพื่อ Insert/Update
    const validationErrors = []; // Array สำหรับเก็บข้อผิดพลาด

    // --- Step 1: วน Loop เพื่อตรวจสอบข้อมูล (Validation) ทั้งไฟล์ก่อน ---
    for (let i = 0; i < data.length; i++) {
        const rowData = data[i];
        const currentRow = i + 2; // +2 เพื่อให้ตรงกับเลขแถวใน Excel

        let group_customer_id_new = null;
        let area_supervisor_id_new = null;
        let area_manager_id_new = null;

        // --- ตรวจสอบ GroupCustomer (ถ้ามีในไฟล์) ---
        if (rowData.group_customer_id) {
            const groupCustomer = await db.GroupCustomer.findOne({
                where: { name: String(rowData.group_customer_id).trim() }
            });
            if (!groupCustomer) {
                validationErrors.push(`Row ${currentRow}: GroupCustomer '${rowData.group_customer_id}' not found in the system.`);
                continue; // ไปตรวจสอบแถวถัดไปทันที
            }
            group_customer_id_new = groupCustomer.id;
        }

        // --- ตรวจสอบ AreaSupervisor (บังคับ) ---
        if (!rowData.area_supervisor_id) {
             validationErrors.push(`Row ${currentRow}: 'area_supervisor_id' หาไม่พบในระบบ.`);
             continue;
        }
        const areaSupervisor = await db.AreaSupervisor.findOne({
            where: { name: String(rowData.area_supervisor_id).trim() }
        });
        if (!areaSupervisor) {
            validationErrors.push(`Row ${currentRow}: AreaSupervisor '${rowData.area_supervisor_id}' not found in the system.`);
            continue;
        }
        area_supervisor_id_new = areaSupervisor.id;


        // --- ตรวจสอบ AreaManager (บังคับ) ---
        if (!rowData.area_manager_id) {
             validationErrors.push(`Row ${currentRow}: 'area_manager_id' หาไม่พบในระบบ.`);
             continue;
        }
        const areaManager = await db.AreaManager.findOne({
            where: { name: String(rowData.area_manager_id).trim() }
        });
        if (!areaManager) {
            validationErrors.push(`Row ${currentRow}: AreaManager '${rowData.area_manager_id}' not found in the system.`);
            continue;
        }
        area_manager_id_new = areaManager.id;


        // ถ้ารอดทุกการตรวจสอบ ให้เตรียมข้อมูลสำหรับบันทึก
        dataToUpsert.push({
            group_customer_id: group_customer_id_new,
            area_supervisor_id: area_supervisor_id_new,
            area_manager_id: area_manager_id_new,
            isActive: 'Y',
            // สามารถเพิ่ม field อื่นๆ ที่ต้องการ Insert/Update ที่นี่
        });
    }

    // --- Step 2: ตรวจสอบว่ามี Error หรือไม่ ---
    if (validationErrors.length > 0) {
        // ถ้ามี Error แม้แต่รายการเดียว ให้โยน Error ออกไปพร้อมรายละเอียดทั้งหมด
        const error = new Error("Validation failed");
        error.isValidationError = true; // สร้าง property เพื่อให้ catch ด้านนอกรู้ว่าเป็น Error ประเภทนี้
        error.details = validationErrors;
        throw error;
    }

    // --- Step 3: ถ้าไม่มี Error เลย ให้ทำการบันทึกข้อมูล ---
    if (dataToUpsert.length > 0) {
        // ใช้ bulkCreate กับ option `updateOnDuplicate` เพื่อทำ "Upsert"
        // คำสั่งนี้จะ Insert ข้อมูลใหม่ และถ้าเจอข้อมูลซ้ำ (เช็คจาก Unique Key) ก็จะ Update แทน
        await db.MapUserArea.bulkCreate(dataToUpsert, {
            updateOnDuplicate: ["isActive"], // <-- **สำคัญมาก** ระบุ Field ที่ต้องการให้อัปเดตถ้าข้อมูลซ้ำ
        });
        console.log('Data upserted successfully');
        return dataToUpsert;
    }

    return []; // กรณีไฟล์ว่าง
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