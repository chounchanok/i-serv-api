const db = require("../models")

const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const { json } = require("sequelize");
const Op = db.Sequelize.Op


async function import_promotion(req, res) {
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
        await file.mv('./uploads/excel/' + new_name);
        let data = await read_excel('./uploads/excel/' + new_name);
        fs.unlink('./uploads/excel/' + new_name, (unlinkErr) => {
            if (unlinkErr) {
                console.error("Error deleting file: ", unlinkErr);
            }
        }
        );
        let insert_data = await insert_promotion(data);
        return res.send({ status: "success", data: data });

    } catch (error) {
        console.error("Error in import_promotion: ", error);
        return res.status(500).send({ status: "error", message: "Error processing file" });
    }
}
async function insert_promotion(data) {
    try {
      // กำหนด Array สำหรับเก็บข้อมูลของ promotion ที่จะ bulk insert
      const promotionsToInsert = [];
  
      for (let i = 0; i < data.length; i++) {
        // ค้นหาหรือสร้าง group_customer_id
        //console.log(data[i].group_customer_id);
        if(data[i].name != "" && data[i].name != "undefined" && data[i].name != undefined){
            const [groupCustomer] = await db.GroupCustomer.findOrCreate({
                where: { name: data[i].group_customer_id },
                defaults: { name: data[i].group_customer_id, isActive: 'Y' }
            });
            const group_customer_id_new = groupCustomer.id;
    
            // ตรวจสอบว่ามี promotion นี้อยู่แล้วหรือไม่
            const existingpromotion = await db.Promotion.findOne({
            where: {
                code: data[i].code ?? null,
                ...(data[i].name && { name: data[i].name }),
                ...(data[i].group_customer_id && { group_customer_id: group_customer_id_new }),
            }
            });
    
            // ถ้าไม่มี promotion ให้สร้างข้อมูลใหม่
            if (!existingpromotion) {
                promotionsToInsert.push({
                    group_customer_id: group_customer_id_new,
                    code: data[i].code ?? null,
                    name: data[i].name ?? null,
                    isActive: 'Y',
                });
            }
        }
        
      }
      
      // Insert ข้อมูลทั้งหมดของ promotion ในครั้งเดียว
      if (promotionsToInsert.length > 0) {
        await db.Promotion.bulkCreate(promotionsToInsert);
      }
  
      //console.log('promotion inserted successfully');
    } catch (error) {
      console.error("Error inserting data: ", error.message);
      throw new Error("Error inserting data"); // Throw an error to be handled in import_promotion
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
        throw new Error("Error reading Excel file"); // Throw an error to be handled in import_promotion
    }
}
module.exports = {
    import_promotion,
}
