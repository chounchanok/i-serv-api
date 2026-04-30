const db = require("../models")

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op
const path = require('path');
const fs = require('fs');

// 🌟 ดึง Model Task และ TaskAssignment มาใช้งานในไฟล์นี้ด้วย
const Task = db.Task || db.tasks; 
const TaskAssignment = db.TaskAssignment || db.task_assignments;

async function create_Offtake(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }
    try {
        const whereConditions = {};
        if (req.body.account_id) whereConditions.account_id = req.body.account_id;
        if (req.body.account_type_id) whereConditions.account_type_id = req.body.account_type_id;
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        const count = await db.Offtake.count({
            where: {
                account_id: req.body.account_id,
                account_type_id: req.body.account_type_id,
                group_customer_id: req.body.group_customer_id
            }
        });
        //console.log(count);
        if(count == 0){
            var data = await db.Offtake.create(req.body)
            //console.log(data);
        }else{
            const whereConditions = {};
            if (req.body.account_id) whereConditions.account_id = req.body.account_id;
            if (req.body.account_type_id) whereConditions.account_type_id = req.body.account_type_id;
            if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
            //console.log(whereConditions);
            var data = await db.Offtake.findOne({ where: whereConditions });
        }
        
        res.send({ status: "success", message: "เพิ่มข้อมูลเรียบร้อย", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
    }
}
async function create_Offtake2(req, res) {
    try {
        const { group_id, datesave_end, datesave } = req.body;
        const whereConditions = {};
        if (group_id) whereConditions.group_id = group_id;
        if (datesave_end) whereConditions.datenow = datesave_end;

        const whereConditions2 = {};
        if (group_id) whereConditions2.group_id = group_id;
        if (datesave_end) whereConditions2.datenow = datesave_end;

        const count = await db.Offtake.count({
            where: {
                group_id: group_id,
                user_id: req.body.user_id,
                store_id: req.body.store_id,
                datenow: req.body.datesave_end
            }
        });

        var status = '';

        let data;
        if (count == 0) {
            let dataz = await db.Offtake.create({
                group_id: group_id,
                datenow: req.body.datesave_end,
                datesave_start: req.body.datesave_start,
                datesave_end: req.body.datesave_end,
                user_id: req.body.user_id,
                store_id: req.body.store_id,
                isActive: 'Y',
            });

            for (const product of req.body.testform2) {
                await db.OfftakeList.create({
                    offtake_id: dataz.id,
                    map_product_store_list_id: product.map_product_store_id,
                    amount: product.amount || 0,
                    offtake_status : product.offtake_status || 'N',
                    not_sell: product.not_sell || 'N',
                    note: product.note || '',
                    isActive: 'Y'
                });
            }
            var status = 'Create';
        } else {
            // กรณีมีอยู่แล้ว ให้ update OfftakeList
            const existingOfftake = await db.Offtake.findOne({
                where: {
                    group_id: group_id,
                    user_id: req.body.user_id,
                    store_id: req.body.store_id,
                    datenow: req.body.datesave_end
                }
            });

            if (existingOfftake) {
                await db.OfftakeList.destroy({
                    where: {
                        offtake_id: existingOfftake.id
                    }
                });

                for (const product of req.body.testform2) {
                    await db.OfftakeList.create({
                        offtake_id: existingOfftake.id,
                        map_product_store_list_id: product.map_product_store_id,
                        amount: product.amount || 0,
                        offtake_status : product.offtake_status || 'N',
                        not_sell: product.not_sell || 'N',
                        note: product.note || '',
                        isActive: 'Y'
                    });
                    var status = 'Create Again';
                }
            }
        }

        data = await db.Offtake.findOne({
            where: whereConditions2,
            order: [['id', 'DESC']],
            include: [{
                model: db.OfftakeList,
                as: 'offtakeDetails',
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

        // ตัวอย่าง logic สำหรับ specificDisabledDates (ถ้าต้องการ)
        const specificDisabledDates = [];
        const targetDate = new Date(req.body.datesave_end);

        for (let i = 1; i <= 7; i++) {
            const dateToCheck = new Date(targetDate);
            dateToCheck.setDate(targetDate.getDate() - i);
            const formattedDate = dateToCheck.toISOString().split('T')[0];

            const dateExists = await db.Offtake.count({
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
                status_check: status,
                data: data,
                specificDisabledDates: specificDisabledDates
            });

            // =================================================================
            // 🌟 ส่วนที่เพิ่มใหม่: อัปเดต TaskAssignment อัตโนมัติ (ถ้ามี) 🌟
            // =================================================================
            try {
                // หาวันที่ปัจจุบันเพื่อเช็คว่าเป็นงานของวันนี้
                const getTodayStr = () => {
                    const d = new Date();
                    const tzOffset = d.getTimezoneOffset() * 60000;
                    return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
                };
                const todayStr = getTodayStr();

                // 1. ค้นหาว่าพนักงานคนนี้ มีงาน OOS ของวันนี้ที่ยังไม่ได้ส่งหรือไม่
                const pendingAssignment = await TaskAssignment.findOne({
                    where: {
                        user_id: req.body.user_id,
                        task_date: todayStr,
                        status: 'pending'
                    },
                    include: [{
                        model: Task,
                        as: 'task_detail',
                        where: {
                            report_type: 'Offtake' // 🌟 เปลี่ยนชื่อให้ตรงกับเมนู (เช่น 'Offtake', 'Stock')
                        }
                    }]
                });

                // 2. ถ้าเจอ ให้ทำการ Stamp เวลาและเปลี่ยนสถานะ
                if (pendingAssignment) {
                    await pendingAssignment.update({
                        status: 'submitted',
                        submitted_at: new Date()
                    });
                    console.log(`Auto-submitted TaskAssignment ID: ${pendingAssignment.id} for user: ${req.body.user_id}`);
                }
            } catch (taskErr) {
                // ดัก Error ไว้ เพื่อไม่ให้การบันทึกรายงานพัง หากระบบ Task มีปัญหา
                console.error("Error auto-submitting task assignment:", taskErr);
            }
            // =================================================================

        } else {
            res.send({ status: "error", message: "ไม่สามารถพบข้อมูล!", where: whereConditions, count: count });
        }
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!", stack: err.stack });
    }
}
async function get_all_Offtake(req, res) {
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
            whereConditions.datenow = req.body.datenow;
        }
        if (req.body.user_id) {
            whereConditions.user_id = req.body.user_id;
        }
        const count = await db.Offtake.count({
            where: {
                group_id: req.body.group_id,
                store_id: req.body.store_id,
                datenow: req.body.datenow,
                user_id: req.body.user_id,
            }
        });

        const projectRoot = path.join(__dirname, '../');
        let data;
        const groupedData = {};

        if (count === 0 && req.body.datenow == req.body.datesave_end) {
            const datax = await db.Offtake.create(
                { 
                    group_id: req.body.group_id,
                    store_id: req.body.store_id,
                    datenow: req.body.datenow,
                    datesave_start: req.body.datesave_start,
                    datesave_end: req.body.datesave_end,
                    user_id: req.body.user_id,
                }
            );

            const countdataOfftake = await db.Offtake.count({where: {
                group_id: req.body.group_id,
                store_id: req.body.store_id,
                datesave_start: req.body.datenow,
                user_id: req.body.user_id,
            }});
            if(countdataOfftake > 0){
                const dataOfftake = await db.Offtake.findOne({
                    where: { 
                        group_id: req.body.group_id,
                        store_id: req.body.store_id,
                        datesave_start: req.body.datenow,
                        user_id: req.body.user_id, 
                    }
                });
                const productList = await db.OfftakeList.findAll({
                    where: { offtake_id: dataOfftake.id }
                });
                if(productList.length > 0){
                    for (const product of productList) {
                        await db.OfftakeList.create({
                            offtake_id: datax.id,
                            map_product_store_list_id: product.map_product_store_list_id,
                            amount: product.amount || 0,
                            offtake: product.offtake || 'N',
                            not_sell: product.not_sell || 'N',
                            note: product.note || '',
                            isActive: 'Y'
                        });
                    }
                }else{
                    const productList = await db.MapProductStoreList.findAll({
                        where: { map_product_id: req.body.group_id,isActive:'Y' }
                    });
                    for (const product of productList) {
                        if(product.offtake == 'Y'){
                            await db.OfftakeList.create({
                                offtake_id: datax.id,
                                map_product_store_list_id: product.id,
                                amount: req.body.amount || 0,
                                offtake: req.body.offtake || 'N',
                                not_sell: req.body.not_sell || 'N',
                                note: req.body.note || '',
                                isActive: 'Y'
                            });
                        }
                    }
                }
                
            }else{
                const productList = await db.MapProductStoreList.findAll({
                    where: { map_product_id: req.body.group_id,isActive:'Y' }
                });
                for (const product of productList) {
                    if(product.offtake == 'Y'){
                        await db.OfftakeList.create({
                            offtake_id: datax.id,
                            map_product_store_list_id: product.id,
                            amount: req.body.amount || 0,
                            offtake: req.body.offtake || 'N',
                            not_sell: req.body.not_sell || 'N',
                            note: req.body.note || '',
                            isActive: 'Y'
                        });
                    }
                }
            }
            
            data = await db.Offtake.findOne({
                where: whereConditions,
                order: [['id', 'DESC']],
                include: [{
                    model: db.OfftakeList,
                    as: 'offtakeDetails',
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
            data = await db.Offtake.findOne({
                where: whereConditions,
                order: [['id', 'DESC']],
                include: [{
                    model: db.OfftakeList,
                    as: 'offtakeDetails',
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
        if (data && data.offtakeDetails) {
            data.offtakeDetails = data.offtakeDetails.filter(offtakeDetail => {
                const mapProductStoreList = offtakeDetail.mapProductStoreList;
                return !(mapProductStoreList && mapProductStoreList.offtake === 'N');
            });
            // จัดกลุ่มสินค้าใน offtakeDetails ตาม Brand และ SubBrand

            data.offtakeDetails.filter(x => x.mapProductStoreList.isActive == 'Y').forEach(offtakeDetail => {
                const product = offtakeDetail.mapProductStoreList.product;
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
                groupedData[brandName][subBrandName].push(offtakeDetail);
            });
        }

        // หา specificDisabledDates สำหรับ 7 วันที่ผ่านมา
        const specificDisabledDates = [];
        const targetDate = new Date(req.body.datesave_start);

        for (let i = 1; i <= 7; i++) {
            const dateToCheck = new Date(targetDate);
            dateToCheck.setDate(targetDate.getDate() - i);
            const formattedDate = dateToCheck.toISOString().split('T')[0];

            const dateExists = await db.Offtake.count({
                where: {
                    group_id: req.body.group_id,
                    store_id: req.body.store_id,
                    datenow: formattedDate,
                    user_id: req.body.user_id,
                }
            });

            if (dateExists === 0) {
                specificDisabledDates.push(formattedDate);
            }
        }

        res.send({
            status: "success",
            data: data,
            groupedData, // ส่งข้อมูลสินค้าเป็นกลุ่มตาม Brand และ SubBrand
            specificDisabledDates,
            count: count, 
            whereConditions: whereConditions
        });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.stack || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!", count: count, whereConditions: whereConditions });
    }
}
async function get_all_Offtake_first(req, res) {
    try {
        const whereConditions = {};
        if (req.body.group_id) {
            whereConditions.group_id = req.body.group_id;
        }
        if (req.body.datesave_start) {
            whereConditions.datesave_start = req.body.datesave_start;
        }
        if (req.body.datesave_end) {
            whereConditions.datesave_end = req.body.datesave_end;
        }
        if (req.body.user_id) {
            whereConditions.user_id = req.body.user_id;
        }
        const count = await db.Offtake.count({
            where: {
                group_id: req.body.group_id,
                datenow: req.body.datenow,
                datesave_start: req.body.datesave_start,
                datesave_end: req.body.datesave_end,
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
async function get_all_Offtake_date(req, res) {
    try {
       
        // หา specificDisabledDates สำหรับ 7 วันที่ผ่านมา
        const specificDisabledDates = [];
        const targetDate = new Date(req.body.datenow);

        for (let i = 1; i <= 90; i++) {
            const dateToCheck = new Date(targetDate);
            dateToCheck.setDate(targetDate.getDate() - i);
            const formattedDate = dateToCheck.toISOString().split('T')[0];

            const dateExists = await db.Offtake.count({
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

async function get_Offtake_by_id(req, res) {
    try {
        let data = await db.Offtake.findByPk(req.params.id);

        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

async function update_Offtake(req, res) {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.Offtake.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.Offtake.update(req.body, { where: { id: req.params.id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

}

async function update_Offtake_isActive(req, res) {
    const id = req.params.id;
    const error = validation(req, ['isActive']);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.Offtake.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.Offtake.update(req.body, { where: { id: id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }
}
async function delete_Offtake(req, res) {
    const id = req.params.id;
    try {
        let row = await db.Offtake.findByPk(id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการลบ');
        }

        await db.OfftakeList.destroy({
            where: { map_product_id: id } 
        });
        await db.Offtake.destroy({
            where: { id: id }
        });

        res.send({ status: "success", message: "ลบข้อมูลเรียบร้อยแล้ว" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถลบข้อมูลได้!" });
    }
}
module.exports = {

    //exprot function
    create_Offtake,
    create_Offtake2,
    get_all_Offtake,
    get_all_Offtake_first,
    get_Offtake_by_id,
    update_Offtake,
    update_Offtake_isActive,
    delete_Offtake,
    get_all_Offtake_date,

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
