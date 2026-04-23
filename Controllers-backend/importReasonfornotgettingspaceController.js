const db = require("../models")

const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const { json } = require("sequelize");
const Op = db.Sequelize.Op


async function import_reasonfornotgettingspace(req, res) {
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
        let insert_data = await insert_reasonfornotgettingspace(data);
        return res.send({ status: "success", data: data });

    } catch (error) {
        console.error("Error in import_reasonfornotgettingspace: ", error);
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
        throw new Error("Error reading Excel file"); // Throw an error to be handled in import_reasonfornotgettingspace
    }
}


//insert reasonfornotgettingspace
async function insert_reasonfornotgettingspace(data) {
    try {
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
            
            
            const whereClause = {
                group_customer_id: group_customer_id_new,
                name: data[i].name
            };
            const reasonfornotgettingspace = await db.ReasonForNotGettingSpace.findOne({
                where: whereClause
            });
            if (!reasonfornotgettingspace) {
            //     // Create reasonfornotgettingspace entry
                await db.ReasonForNotGettingSpace.create({
                    group_customer_id: group_customer_id_new,
                    name: data[i].name != undefined ? data[i].name : null,
                    isActive: 'Y'
                });
                
            }
            
        }
        //console.log('reasonfornotgettingspace inserted successfully');
    } catch (error) {
        console.error("Error inserting data: ", error.message);
        throw new Error("Error inserting data"); // Throw an error to be handled in import_reasonfornotgettingspace
    }
}
module.exports = {
    import_reasonfornotgettingspace,
}
