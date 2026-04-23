const db = require("../models")

const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const { json } = require("sequelize");
const Op = db.Sequelize.Op


async function import_RentalAreaUnit(req, res) {
    // //console.log(req.files.file_excel);
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
        let insert_data = await insert_RentalAreaUnit(data);
        return res.send({ status: "success", data: data });

    } catch (error) {
        console.error("Error in import_RentalAreaUnit: ", error);
        return res.status(500).send({ status: "error", message: "Error processing file" });
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
        throw new Error("Error reading Excel file"); // Throw an error to be handled in import_RentalAreaUnit
    }
}


//insert RentalAreaUnit
async function insert_RentalAreaUnit(data) {
    try {
        // //console.log(data);
        for (let i = 0; i < data.length; i++) {
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
            
            let account_id = null;
            if (data[i].account_id) {
                account_id = await db.Account.findOne({
                    where: { name: data[i].account_id,group_customer_id: group_customer_id_new }
                });
            }
            let account_id_new = 0;
            if (!account_id) {
                if(data[i].account_id){
                    if(data[i].account_id == "ทั้งหมด"){
                        account_id_new = account_id.id;
                    }else{
                        const newAccount = await db.Account.create({
                            name: data[i].account_id,
                            isActive: 'Y',
                            group_customer_id: group_customer_id_new,
                        });
                        account_id_new = newAccount.id; // get the new account
                    }
                }
            } else {
                account_id_new = account_id.id;
            }
            
            const whereClause = {
                group_customer_id: group_customer_id_new,
                account_id: account_id_new,
                name: data[i].name,
                unit: data[i].unit,
                // Type: data[i].Type,
            };
            const RentalAreaUnit = await db.RentalAreaUnit.findOne({
                where: whereClause
            });
            if (!RentalAreaUnit) {
            //     // Create RentalAreaUnit entry
                await db.RentalAreaUnit.create({
                    group_customer_id: group_customer_id_new,
                    account_id: account_id_new,
                    name: data[i].name != undefined ? data[i].name : null,
                    unit: data[i].unit != undefined ? data[i].unit : null,
                    // type: data[i].Type != undefined ? data[i].Type : null,
                    isActive: 'Y',
                });
                
            }
            
        }
        // //console.log('RentalAreaUnit inserted successfully');
    } catch (error) {
        console.error("Error inserting data: ", error.message);
        throw new Error("Error inserting data"); // Throw an error to be handled in import_RentalAreaUnit
    }
}
module.exports = {
    import_RentalAreaUnit,
}
