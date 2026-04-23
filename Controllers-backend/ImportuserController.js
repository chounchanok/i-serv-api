const db = require("../models")

const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const { json } = require("sequelize");
const Op = db.Sequelize.Op


async function import_user(req, res) {
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
                // console.error("Error deleting file: ", unlinkErr);
            }
        }
        );
        let insert_data = await insert_user(data);
        return res.send({ status: "success", data: data });

    } catch (error) {
        // console.error("Error in import_user: ", error);
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
                // console.error("Error deleting file: ", unlinkErr);
            }
        });
        return jsonData;
    } catch (error) {
        // console.error("Error reading file: ", error);
        throw new Error("Error reading Excel file"); // Throw an error to be handled in import_user
    }
}


//insert User
async function insert_user(data) {
    const transaction = await db.sequelize.transaction();
    try {
        // ✅ ประกาศตัวแปร Map ให้อยู่ในขอบเขตที่ทุกฟังก์ชันสามารถเข้าถึง
        let groupCustomerMap = new Map();
        let jobPositionMap = new Map();
        let positionMap = new Map();
        let areaSupervisorMap = new Map();
        let areaManagerMap = new Map();

        // ✅ ดึงข้อมูลทั้งหมดล่วงหน้าเพื่อลดการ Query ซ้ำซ้อน
        const [groupCustomers, jobPositions, positions, areaSupervisors, areaManagers] = await Promise.all([
            db.GroupCustomer.findAll({ attributes: ['id', 'name'] }),
            db.JobPosition.findAll({ attributes: ['id', 'name'] }),
            db.Position.findAll({ attributes: ['id', 'name'] }),
            db.AreaSupervisor.findAll({ attributes: ['id', 'name'] }),
            db.AreaManager.findAll({ attributes: ['id', 'name'] })
        ]);

        // ✅ เติมค่า Map ด้วยข้อมูลจากฐานข้อมูล
        groupCustomers.forEach(item => groupCustomerMap.set(item.name, item.id));
        jobPositions.forEach(item => jobPositionMap.set(item.name, item.id));
        positions.forEach(item => positionMap.set(item.name, item.id));
        areaSupervisors.forEach(item => areaSupervisorMap.set(item.name, item.id));
        areaManagers.forEach(item => areaManagerMap.set(item.name, item.id));

        const usersToInsert = [];
        const usersToUpdate = [];

        for (const item of data) {
            // let group_customer_id_new = groupCustomerMap.get(item.group_customer_id) || await createAndCacheGroupCustomer(item.group_customer_id);
            const group_customer_id_newxxx = await db.GroupCustomer.findOne({
                where: { name: item.group_customer_id },
            });
            if(group_customer_id_newxxx){
                var group_customer_id_new = group_customer_id_newxxx.id;
            }else{
                const newGroupCustomer = await db.GroupCustomer.create({ name: item.group_customer_id });
                var group_customer_id_new = newGroupCustomer.id;
            }
            
            // let job_position_id_new = jobPositionMap.get(item.job_position_id) || await createAndCacheJobPosition(item.job_position_id);
            const job_position_id_newxxx = await db.JobPosition.findOne({
                where: { name: item.job_position_id,group_customer_id:group_customer_id_new },
            });
            if(job_position_id_newxxx){
                var job_position_id_new = job_position_id_newxxx.id;
            }else{
                const newJobPosition = await db.JobPosition.create({ name: item.job_position_id,group_customer_id:group_customer_id_new });
                var job_position_id_new = newJobPosition.id;
            }
            
            // let position_id_new = positionMap.get(item.position_id) || await createAndCachePosition(item.position_id, group_customer_id_new);
            const position_id_newxxx = await db.Position.findOne({
                where: { name: item.position_id,group_customer_id: group_customer_id_new },
            });
            if(position_id_newxxx){
                var position_id_new = position_id_newxxx.id;
            }else{
                const newPosition = await db.Position.create({ name: item.position_id,group_customer_id: group_customer_id_new });
                var position_id_new = newPosition.id;
            }
            
            // let area_supervisor_new = areaSupervisorMap.get(item.area_supervisor) || await createAndCacheAreaSupervisor(item.area_supervisor);
            const area_supervisor_newxxx = await db.AreaSupervisor.findOne({
                where: { name: item.area_supervisor,group_customer_id:group_customer_id_new },
            });
            if(area_supervisor_newxxx){
                var area_supervisor_new = area_supervisor_newxxx.id;
            }else{
                const newAreaSupervisor = await db.AreaSupervisor.create({ name: item.area_supervisor,group_customer_id:group_customer_id_new });
                var area_supervisor_new = newAreaSupervisor.id;
            }
            
            // let area_manager_new = areaManagerMap.get(item.area_manager) || await createAndCacheAreaManager(item.area_manager);
            const area_manager_newxxx = await db.AreaManager.findOne({
                where: { name: item.area_manager,group_customer_id:group_customer_id_new },
            });
            if(area_manager_newxxx){
                var area_manager_new = area_manager_newxxx.id;
            }else{
                const newAreaManager = await db.AreaManager.create({ name: item.area_manager,group_customer_id:group_customer_id_new });
                var area_manager_new = newAreaManager.id;
            }
            
            const existingUser = await db.User.findOne({
                where: { name: item.name, last_name: item.last_name,group_customer_id:group_customer_id_new },
                transaction
            });

            if (!existingUser) {
                usersToInsert.push({
                    group_customer_id: group_customer_id_new,
                    code: item.code || null,
                    email: item.email || null,
                    password: await Bcrypt.hashSync(item.code || item.group_customer_id + (data.indexOf(item).toString().padStart(4, '0')), 10),
                    prefix: item.prefix || null,
                    name: item.name || null,
                    last_name: item.last_name || null,
                    job_position_id: job_position_id_new,
                    position_id: position_id_new,
                    area_supervisor: area_supervisor_new,
                    area_manager: area_manager_new,
                    isActive: 'Y',
                    groupId: 0
                });
            } else {
                usersToUpdate.push({
                    data: {
                        group_customer_id: group_customer_id_new,
                        code: item.code || null,
                        email: item.email || null,
                        prefix: item.prefix || null,
                        name: item.name || null,
                        last_name: item.last_name || null,
                        job_position_id: job_position_id_new,
                        position_id: position_id_new,
                        area_supervisor: area_supervisor_new,
                        area_manager: area_manager_new,
                    },
                    where: { id: existingUser.id }
                });
            }
        }

        if (usersToInsert.length > 0) {
            await db.User.bulkCreate(usersToInsert, { transaction });
        }

        if (usersToUpdate.length > 0) {
            for (const user of usersToUpdate) {
                await db.User.update(user.data, { where: user.where, transaction });
            }
        }

        await transaction.commit();
        //console.log('User inserted successfully');
    } catch (error) {
        await transaction.rollback();
        console.error("Error inserting data: ", error.message);
        throw new Error("Error inserting data");
    }

    // ✅ Helper functions ที่สามารถเข้าถึงตัวแปร Maps ได้
    async function createAndCacheGroupCustomer(name) {
        if (!name) return null;
        const newGroupCustomer = await db.GroupCustomer.create({ name, isActive: 'Y' }, { transaction });
        groupCustomerMap.set(name, newGroupCustomer.id);
        return newGroupCustomer.id;
    }

    async function createAndCacheJobPosition(name) {
        if (!name) return null;
        const newJobPosition = await db.JobPosition.create({ name, isActive: 'Y' }, { transaction });
        jobPositionMap.set(name, newJobPosition.id);
        return newJobPosition.id;
    }

    async function createAndCachePosition(name, group_customer_id) {
        if (!name) return null;
        const newPosition = await db.Position.create({ name, group_customer_id, isActive: 'Y' }, { transaction });
        positionMap.set(name, newPosition.id);
        return newPosition.id;
    }

    async function createAndCacheAreaSupervisor(name) {
        if (!name) return null;
        const newAreaSupervisor = await db.AreaSupervisor.create({ name, isActive: 'Y' }, { transaction });
        areaSupervisorMap.set(name, newAreaSupervisor.id);
        return newAreaSupervisor.id;
    }

    async function createAndCacheAreaManager(name) {
        if (!name) return null;
        const newAreaManager = await db.AreaManager.create({ name, isActive: 'Y' }, { transaction });
        areaManagerMap.set(name, newAreaManager.id);
        return newAreaManager.id;
    }
}
module.exports = {
    import_user,
}
