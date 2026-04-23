const db = require("../models")

const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const { json } = require("sequelize");
const { stack } = require("sequelize/lib/utils");
const Op = db.Sequelize.Op


async function import_store(req, res) {
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
        let insert_data = await insert_store(data);
        return res.send({ status: "success", data: data });

    } catch (error) {
        console.error("Error in import_store: ", error);
        return res.status(500).send({ status: "error", message: "Error processing file"});
    }
}
async function insert_store(data) {
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
        // //console.log('group_customer_id_new = '+group_customer_id_new);
        // ค้นหาหรือสร้าง channel_id
        const [channel] = await db.Channel.findOrCreate({
          where: { name: data[i].channel_id,group_customer_id: group_customer_id_new },
          defaults: { name: data[i].channel_id, isActive: 'Y',group_customer_id: group_customer_id_new }
        });
        const channel_id_new = channel.id;
        // //console.log(channel_id_new); 
        // ค้นหาหรือสร้าง account_id
        const [account] = await db.Account.findOrCreate({
          where: { name: data[i].account_id,group_customer_id: group_customer_id_new },
          defaults: { name: data[i].account_id, isActive: 'Y',group_customer_id: group_customer_id_new }
        });
        const account_id_new = account.id;
        // //console.log(account_id_new);        // ค้นหาหรือสร้าง account_type_id
        let accountTypeName = data[i].account_type_id;
        if (!accountTypeName || accountTypeName == 0) {
        accountTypeName = 'Default';
        }

        const [accountType] = await db.AccountType.findOrCreate({
        where: { name: accountTypeName,group_customer_id: group_customer_id_new },
        defaults: { account_id: account_id_new, name: accountTypeName, isActive: 'Y',group_customer_id: group_customer_id_new }
        });
        const account_type_id_new = accountType.id;
        // //console.log(account_type_id_new); 
        // ค้นหาหรือสร้าง provinces_id
        const [province] = await db.Provinces.findOrCreate({
          where: { name_in_thai: data[i].provinces_id },
          defaults: { name_in_thai: data[i].provinces_id, isActive: 'Y' }
        });
        const provinces_id_new = province.id;
        const existingStore = '';

        // ตรวจสอบว่ามี Store นี้อยู่แล้วหรือไม่
        if(data[i].ID){
            existingStore = await db.Store.findOne({
            where: {
                id: data[i].ID,
            }
            });
        }
        
  
        // ถ้าไม่มี Store ให้สร้างข้อมูลใหม่
        if (existingStore) {
            // ถ้ามีอยู่แล้ว ให้ update
            await existingStore.update({
              group_customer_id: group_customer_id_new,
              channel_id: channel_id_new,
              store_code: data[i].store_code ?? 'Default',
              store_name: data[i].store_name ?? 'Default',
              store_name_report: data[i].store_name_report ?? null,
              account_id: account_id_new,
              account_type_id: account_type_id_new,
              provinces_id: provinces_id_new,
            });
        } else {
            // ถ้าไม่มี Store ให้สร้างใหม่
            storesToInsert.push({
              group_customer_id: group_customer_id_new,
              channel_id: channel_id_new,
              store_code: data[i].store_code ?? 'Default',
              store_name: data[i].store_name ?? 'Default',
              store_name_report: data[i].store_name_report ?? null,
              store_name_report_full: data[i].store_name_report_full ?? null,
              account_id: account_id_new,
              account_type_id: account_type_id_new,
              provinces_id: provinces_id_new,
              isActive: 'Y',
              groupId: 0
            });
        }
      }
      
      // Insert ข้อมูลทั้งหมดของ Store ในครั้งเดียว
      if (storesToInsert.length > 0) {
        await db.Store.bulkCreate(storesToInsert);
      }
  
      //console.log('Store inserted successfully');
    } catch (error) {
      console.error("Error inserting or updating data: ", error.stack );
      throw new Error(error.stack);
    }
}

async function import_user_store(req, res) {
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
        let insert_data = await insert_user_store(data);
        return res.send({ status: "success", data: data });

    } catch (error) {
        console.error("Error in import_store: ", error);
        return res.status(500).send({ status: "error", message: "Error processing file", stack: error.stack });
    }
}
async function insert_user_store(data) {
    try {
        // Loop through the data and insert into the database
        
        for (let i = 0; i < data.length; i++) {
            // Find or insert group_customer_id

            let group_customer_id = null;
            if (data[i].group_customer_id) {
                group_customer_id = await db.GroupCustomer.findOne({
                    where: { name: data[i].group_customer_id }
                });
            }
            let group_customer_id_new = null;
            if (!group_customer_id) {
                if(data[i].group_customer_id){
                    const newGroupCustomer = await db.GroupCustomer.create({
                        name: data[i].group_customer_id,
                        isActive: 'Y'
                    });
                    group_customer_id_new = newGroupCustomer.id; // get the new group_customer_id
                }
            } else {
                group_customer_id_new = group_customer_id.id;
            }
            
            let user_id = null;
            if (data[i].user_id) {
                user_id = await db.User.findOne({
                    where: { name: data[i].user_id }
                });
            }
            let user_id_new = null;
            if (!user_id) {
                if(data[i].user_id){
                    const newuser_id = await db.User.create({
                        name: data[i].user_id,
                        isActive: 'Y'
                    });
                    user_id_new = newuser_id.id; // get the new user_id
                }
            } else {
                user_id_new = user_id.id;
            }

            // // Sub Brand
            let store_id = null;
            if (data[i].store_id) {
                store_id = await db.Store.findOne({
                    where: { name: data[i].store_id }
                });
            }
            let store_id_new = null;
            if (!store_id) {
                if(data[i].store_id){
                    const newstore_id = await db.Store.create({
                        name: data[i].store_id,
                        isActive: 'Y'
                    });
                    store_id_new = newstore_id.id; // get the new store_id
                }
            } else {
                store_id_new = store_id.id;
            }
            
            const whereClause = {
                group_customer_id: group_customer_id_new,
                user_id: user_id_new,
                store_id: store_id_new,
                route_name: data[i].route_name
            };
            const Store = await db.Store.findOne({
                where: whereClause
            });
            if (!Store) {
            //     // Create Store entry
                await db.Store.create({
                    route_name: data[i].route_name != undefined ? data[i].route_name : null,
                    group_customer_id: group_customer_id_new,
                    user_id: user_id_new,
                    store_id: store_id_new,
                    isActive: 'Y',
                });
                
            }
            
        }
        //console.log('Store inserted successfully');
    } catch (error) {
        console.error("Error inserting data: ", error.message);
        throw new Error("Error inserting data", { cause: error.stack }); // Throw an error to be handled in import_store
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
    import_store,
    import_user_store
}
