const db = require("../models")

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op
const path = require('path');
const fs = require('fs');

// function create Oos
async function create_Oos(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }
    try {
        const whereConditions = {};
        if (req.body.account_id) whereConditions.account_id = req.body.account_id;
        if (req.body.account_type_id) whereConditions.account_type_id = req.body.account_type_id;
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        const count = await db.Oos.count({
            where: {
                account_id: req.body.account_id,
                account_type_id: req.body.account_type_id,
                group_customer_id: req.body.group_customer_id,
                user_id: req.body.user_id
            }
        });
        //console.log(count);
        if(count == 0){
            var data = await db.Oos.create(req.body)
            //console.log(data);
        }else{
            const whereConditions = {};
            if (req.body.account_id) whereConditions.account_id = req.body.account_id;
            if (req.body.account_type_id) whereConditions.account_type_id = req.body.account_type_id;
            if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
            //console.log(whereConditions);
            var data = await db.Oos.findOne({ where: whereConditions });
        }
        
        res.send({ status: "success", message: "เพิ่มข้อมูลเรียบร้อย", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
    }
}
async function create_oos2(req, res) {
    try {
        const { group_id, datenow, datesave } = req.body;
        const whereConditions = {};
        if (group_id) whereConditions.group_id = group_id;
        if (datenow) whereConditions.datesave = datenow;

        const whereConditions2 = {};
        if (group_id) whereConditions2.group_id = group_id;
        if (datesave) whereConditions2.datesave = datesave;

        const count = await db.Oos.count({
            where: {
                group_id: group_id,
                user_id: req.body.user_id,
                store_id: req.body.store_id,
                datesave: datesave
            }
        });

        var status = '';

        let data;
        if (count == 0) {
            let dataz = await db.Oos.create({
                group_id: group_id,
                datenow: datesave,
                datesave: datesave,
                user_id: req.body.user_id,
                store_id: req.body.store_id,
                isActive: 'Y',
            });

            for (const product of req.body.testform2) {
                await db.OosList.create({
                    oos_id: dataz.id,
                    map_product_store_list_id: product.map_product_store_list_id,
                    oos_status: product.oos_status || 'N',
                    not_sell: product.not_sell || 'N',
                    oos_status2: product.oos_status2 || 'N',
                    qty: product.qty || 0,
                    note: product.note || '',
                });
            }
            var status = 'Create';
        } else {
            // กรณีมีอยู่แล้ว ให้ update OosList
            const existingOos = await db.Oos.findOne({
                where: {
                    group_id: group_id,
                    user_id: req.body.user_id,
                    store_id: req.body.store_id,
                    datesave: datesave
                }
            });

            if (existingOos) {

                await db.OosList.destroy({
                    where: {
                        oos_id: existingOos.id
                    }
                });
                
                for (const product of req.body.testform2) {         
                    await db.OosList.create({
                        oos_id: existingOos.id,
                        map_product_store_list_id: product.map_product_store_list_id,
                        oos_status: product.oos_status || 'N',
                        not_sell: product.not_sell || 'N',
                        oos_status2: product.oos_status2 || 'N',
                        qty: product.qty || 0,
                        note: product.note || '',
                    });
                    var status = 'Create Again';
                }
            }
        }

        data = await db.Oos.findOne({
            where: whereConditions2,
            order: [['id', 'DESC']],
            include: [{
                model: db.OosList,
                as: 'oosDetails',
                include: [{
                    model: db.MapProductStoreList,
                    as: 'mapProductStoreList',
                    include: [{
                        model: db.Product,
                        as: 'product',
                        attributes: ['name']
                    }]
                }]
            }]
        });

        const specificDisabledDates = [];
        const targetDate = new Date(datenow);

        for (let i = 1; i <= 7; i++) {
            const dateToCheck = new Date(targetDate);
            dateToCheck.setDate(targetDate.getDate() - i);
            const formattedDate = dateToCheck.toISOString().split('T')[0];

            const dateExists = await db.Oos.count({
                where: {
                    group_id: group_id,
                    datenow: formattedDate
                }
            });

            if (dateExists === 0) {
                specificDisabledDates.push(formattedDate);
            }
        }

        if (data) {
            res.send({
                status: "success",
                status_check : status,
                data: data,
                specificDisabledDates: specificDisabledDates
            });
        } else {
            res.send({ status: "error", message: "ไม่สามารถพบข้อมูล!", where: whereConditions, count: count });
        }
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!", stack: err.stack });
    }
}

//get all Oos
async function get_all_Oos(req, res) {
    try {
        const dataStore = await db.MapUserStorelist.findOne({
            where: { 
                store_id: req.body.store_id
            }
        });
        //console.log(dataStore);
        if(req.body.position_name == "พนักงาน"){
            req.body.user_id = req.body.user_id
        }else{
            if(dataStore){
                req.body.user_id = dataStore.user_id
            }else{
                req.body.user_id = req.body.user_id
            }
        }
        const whereConditions = {};
        if (req.body.group_id) {
            whereConditions.group_id = req.body.group_id;
        }
        if (req.body.store_id) {
            whereConditions.store_id = req.body.store_id;
        }
        if (req.body.datenow) {
            whereConditions.datesave = req.body.datenow;
        }else if (req.body.datesave) {
            whereConditions.datesave = req.body.datesave;
        }
        
        if (req.body.user_id) {
            whereConditions.user_id = req.body.user_id;
        }
        const count = await db.Oos.findAll({
            where: {
                group_id: req.body.group_id,
                store_id: req.body.store_id,
                datesave: req.body.datesave,
                user_id: req.body.user_id,
            }
        });

        const projectRoot = path.join(__dirname, '../');
        let data;

        if (count.length === 0 && req.body.datenow == req.body.datesave) {
            var datax = await db.Oos.create(
                { 
                    group_id: req.body.group_id,
                    store_id: req.body.store_id,
                    datenow: req.body.datenow,
                    datesave: req.body.datesave,
                    user_id: req.body.user_id,
                }
            );
            
            const countdataOos = await db.Oos.count({where: {
                group_id: req.body.group_id,
                store_id: req.body.store_id,
                datesave: req.body.datenow,
                user_id: req.body.user_id,
            }});
            if(countdataOos > 0){
                const dataOos = await db.Oos.findOne({
                    where: { 
                        group_id: req.body.group_id,
                        store_id: req.body.store_id,
                        datesave: req.body.datenow ,
                        user_id: req.body.user_id,
                    }
                });
                const productList = await db.OosList.findAll({
                    where: { oos_id: dataOos.id }
                });
                if(productList.length > 0){
                    for (const product of productList) {
                        await db.OosList.create({
                            oos_id: datax.id,
                            map_product_store_list_id: product.map_product_store_list_id,
                            qty: product.qty || 0,
                            note: product.note || '',

                            oos_status: req.body.oos_status || 'N',
                            not_sell: req.body.not_sell || 'N',
                            oos_status2: req.body.oos_status2 || 'N',
                            
                            isActive: 'Y'
                        });
                    }
                }else{
                    const productList = await db.MapProductStoreList.findAll({
                        where: { 
                            map_product_id: req.body.group_id,
                            isActive:'Y'
                        }
                    });
                    for (const product of productList) {
                        if(product.oos == 'Y' || product.stock == 'Y'){
                            await db.OosList.create({
                                oos_id: datax.id,
                                map_product_store_list_id: product.id,
                                qty: req.body.qty || 0,
    
                                oos_status: req.body.oos_status || 'N',
                                not_sell: req.body.not_sell || 'N',
                                oos_status2: req.body.oos_status2 || 'N',
                                
                                note: req.body.note || '',
                                isActive: 'Y'
                            });
                        }
                    }
                }
                
            }else{
                const productList = await db.MapProductStoreList.findAll({
                    where: { 
                        map_product_id: req.body.group_id,
                        isActive:'Y'
                    }
                });
                for (const product of productList) {
                    if(product.oos == 'Y' || product.stock == 'Y'){
                        await db.OosList.create({
                            oos_id: datax.id,
                            map_product_store_list_id: product.id,
                            qty: req.body.qty || 0,

                            oos_status: req.body.oos_status || 'N',
                            not_sell: req.body.not_sell || 'N',
                            oos_status2: req.body.oos_status2 || 'N',
                            
                            note: req.body.note || '',
                            isActive: 'Y'
                        });
                    }
                }
            }

            data = await db.Oos.findOne({
                where: whereConditions,
                order: [['id', 'DESC']],
                include: [{
                    model: db.OosList,
                    as: 'oosDetails',
                    include: [{
                        model: db.MapProductStoreList,
                        as: 'mapProductStoreList',
                        where: {isActive: 'Y'},
                        include: [{
                            model: db.Product,
                            as: 'product',
                            required: false,
                            where: {isActive: 'Y'},
                            include: [
                                { model: db.Brand, as: 'brand', required: false },
                                { model: db.SubBrand, as: 'subBrand', required: false },
                            ],
                        }]
                    }]
                }]
            });
            
        } else {
            
            data = await db.Oos.findOne({
                where: whereConditions,
                order: [['id', 'DESC']],
                include: [{
                    model: db.OosList,
                    as: 'oosDetails',
                    include: [{
                        model: db.MapProductStoreList,
                        as: 'mapProductStoreList',
                        where: {isActive: 'Y'},
                        include: [{
                            model: db.Product,
                            as: 'product',
                            required: false,
                            where: {isActive: 'Y'},
                            include: [
                                { model: db.Brand, as: 'brand', required: false },
                                { model: db.SubBrand, as: 'subBrand', required: false },
                            ],
                        }]
                    }]
                }]
            });
        }

        const groupedData = {};
        const specificDisabledDates = [];
        if (data && data.oosDetails) {
            data.oosDetails = data.oosDetails.filter(oosDetail => {
                const mapProductStoreList = oosDetail.mapProductStoreList;
                return !(mapProductStoreList && mapProductStoreList.oos === 'N' && mapProductStoreList.stock === 'N');
            });
            // จัดกลุ่มสินค้าใน oosDetails ตาม Brand และ SubBrand

            data.oosDetails.forEach(oosDetail => {
                const product = oosDetail.mapProductStoreList.product;
                if (!product) return;

                const brandName = product.brand ? product.brand.name : ' Unknown Brand';
                const subBrandName = product.subBrand ? product.subBrand.name : 'Unknown SubBrand';

                // สร้างกลุ่มสำหรับ Brand
                if (!groupedData[brandName]) {
                    groupedData[brandName] = {};
                }

                // สร้างกลุ่มสำหรับ SubBrand
                if (!groupedData[brandName][subBrandName]) {
                    groupedData[brandName][subBrandName] = [];
                }

                // เพิ่มสินค้าไปยังกลุ่ม SubBrand
                groupedData[brandName][subBrandName].push(oosDetail);
            });

            // หา specificDisabledDates สำหรับ 7 วันที่ผ่านมา
            const targetDate = new Date(req.body.datesave);

            for (let i = 1; i <= 7; i++) {
                const dateToCheck = new Date(targetDate);
                dateToCheck.setDate(targetDate.getDate() - i);
                const formattedDate = dateToCheck.toISOString().split('T')[0];

                const dateExists = await db.Oos.count({
                    where: {
                        group_id: req.body.group_id,
                        store_id: req.body.store_id,
                        datesave: formattedDate,
                        user_id: req.body.user_id,
                    }
                });

                if (dateExists === 0) {
                    specificDisabledDates.push(formattedDate);
                }
            }
        }

        res.send({
            status: "success",
            data: data,
            count: count,
            groupedData, // ส่งข้อมูลสินค้าเป็นกลุ่มตาม Brand และ SubBrand
            specificDisabledDates,
        });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_Oos_first(req, res) {
    try {
        const whereConditions = {};
        if (req.body.group_id) {
            whereConditions.group_id = req.body.group_id;
        }
        if (req.body.datesave) {
            whereConditions.datesave = req.body.datesave;
        }
        if (req.body.user_id) {
            whereConditions.user_id = req.body.user_id;
        }
        const count = await db.Oos.count({
            where: {
                group_id: req.body.group_id,
                datenow: req.body.datenow,
                datesave: req.body.datesave,
                user_id: req.body.user_id,
            }
        });

        const projectRoot = path.join(__dirname, '../');
        let data;

        if (count === 0) {
            
            res.send({
                status: "success",
            });
        }else{
            res.send({
                status: "error",
            });
        }

        

        
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_Oos_date(req, res) {
    try {
       
        // หา specificDisabledDates สำหรับ 7 วันที่ผ่านมา
        const specificDisabledDates = [];
        const targetDate = new Date(req.body.datenow);

        for (let i = 1; i <= 90; i++) {
            const dateToCheck = new Date(targetDate);
            dateToCheck.setDate(targetDate.getDate() - i);
            const formattedDate = dateToCheck.toISOString().split('T')[0];

            const dateExists = await db.Oos.count({
                where: {
                    group_id: req.body.group_id,
                    store_id: req.body.store_id,
                    datenow: formattedDate
                }
            });

            if (dateExists === 0) {
                specificDisabledDates.push(formattedDate);
            }
        }

        res.send({
            status: "success",
            specificDisabledDates,
        });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
//get Oos by id
async function get_Oos_by_id(req, res) {
    try {
        let data = await db.Oos.findByPk(req.params.id);

        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//update Oos
async function update_Oos(req, res) {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.Oos.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.Oos.update(req.body, { where: { id: req.params.id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

}

//update Oos isActive
async function update_Oos_isActive(req, res) {
    const id = req.params.id;
    const error = validation(req, ['isActive']);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.Oos.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.Oos.update(req.body, { where: { id: id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }
}
async function delete_Oos(req, res) {
    const id = req.params.id;
    try {
        // ค้นหาแถวใน Oos
        let row = await db.Oos.findByPk(id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการลบ');
        }

        // ลบรายการที่เกี่ยวข้องใน OosList ก่อน
        await db.OosList.destroy({
            where: { map_product_id: id } // หรือใช้ฟิลด์ที่เชื่อมต่อกับ Oos (เช่น OosId)
        });

        // ลบรายการใน Oos
        await db.Oos.destroy({
            where: { id: id }
        });

        res.send({ status: "success", message: "ลบข้อมูลเรียบร้อยแล้ว" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถลบข้อมูลได้!" });
    }
}
module.exports = {

    //exprot function
    create_Oos,
    create_oos2,
    get_all_Oos,
    get_all_Oos_first,
    get_Oos_by_id,
    update_Oos,
    update_Oos_isActive,
    delete_Oos,
    get_all_Oos_date,

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
