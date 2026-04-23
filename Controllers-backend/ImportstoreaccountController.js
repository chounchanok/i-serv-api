const db = require("../models")

const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const { json } = require("sequelize");
const Op = db.Sequelize.Op


async function import_storeaccount(req, res) {
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
        let insert_data = await insert_storeaccount(data);
        return res.send({ status: "success", data: data });

    } catch (error) {
        console.error("Error in import_storeaccount: ", error);
        return res.status(500).send({ status: "error", message: "Error processing file" });
    }
}
async function insert_storeaccount(data) {
    try {
      // กำหนด Array สำหรับเก็บข้อมูลของ Store ที่จะ bulk insert
      const storesToInsert = [];
  
      for (let i = 0; i < data.length; i++) {
        // ค้นหาหรือสร้าง group_customer_id
        const [groupCustomer] = await db.GroupCustomer.findOrCreate({
          where: { name: data[i].group_customer_id },
          defaults: { name: data[i].group_customer_id, isActive: 'Y' }
        });
        const group_customer_id_new = groupCustomer.id;
        
        
        // ค้นหาหรือสร้าง account_id
        const [account] = await db.Account.findOrCreate({
          where: { name: data[i].account_id,group_customer_id: group_customer_id_new },
          defaults: { name: data[i].account_id, isActive: 'Y',group_customer_id: group_customer_id_new }
        });
        const account_id_new = account.id;
  
        // ค้นหาหรือสร้าง account_type_id
        const [accountType] = await db.AccountType.findOrCreate({
          where: { name: data[i].account_type_id,account_id: account_id_new,group_customer_id: group_customer_id_new },
          defaults: { account_id: account_id_new, name: data[i].account_type_id, isActive: 'Y',group_customer_id: group_customer_id_new }
        });
        const account_type_id_new = accountType.id;
  
        // ตรวจสอบว่ามี Store นี้อยู่แล้วหรือไม่
        const existingStore = await db.StoreToAccount.findOne({
          where: {
            ...(data[i].account_id && { account_id: account_id_new }),
            ...(data[i].group_customer_id && { group_customer_id: group_customer_id_new }),
            ...(data[i].account_type_id && { account_type_id: account_type_id_new }),
          }
        });
  
        // ถ้าไม่มี Store ให้สร้างข้อมูลใหม่
        if (!existingStore) {
          storesToInsert.push({
            group_customer_id: group_customer_id_new,
            account_id: account_id_new,
            account_type_id: account_type_id_new,
            isActive: 'Y',
          });
        }
      }
      
      // Insert ข้อมูลทั้งหมดของ Store ในครั้งเดียว
      if (storesToInsert.length > 0) {
        await db.StoreToAccount.bulkCreate(storesToInsert);
      }
  
      //console.log('Store inserted successfully');
    } catch (error) {
      console.error("Error inserting data: ", error.message);
      throw new Error("Error inserting data"); // Throw an error to be handled in import_storeaccount
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
        throw new Error("Error reading Excel file"); // Throw an error to be handled in import_storeaccount
    }
}
module.exports = {
    import_storeaccount
}
