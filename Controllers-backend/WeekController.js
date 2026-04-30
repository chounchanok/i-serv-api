const db = require("../models")

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op
const path = require('path');
const fs = require('fs');

// 🌟 ดึง Model Task และ TaskAssignment มาใช้งานในไฟล์นี้ด้วย
const Task = db.Task || db.tasks; 
const TaskAssignment = db.TaskAssignment || db.task_assignments;

async function create_Week(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }
    try {
        const whereConditions = {};
        if (req.body.account_id) whereConditions.account_id = req.body.account_id;
        if (req.body.account_type_id) whereConditions.account_type_id = req.body.account_type_id;
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        const count = await db.Week.count({
            where: {
                account_id: req.body.account_id,
                account_type_id: req.body.account_type_id,
                group_customer_id: req.body.group_customer_id
            }
        });
        //console.log(count);
        if(count == 0){
            var data = await db.Week.create(req.body)
            //console.log(data);
        }else{
            const whereConditions = {};
            if (req.body.account_id) whereConditions.account_id = req.body.account_id;
            if (req.body.account_type_id) whereConditions.account_type_id = req.body.account_type_id;
            if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
            //console.log(whereConditions);
            var data = await db.Week.findOne({ where: whereConditions });
        }
        
        res.send({ status: "success", message: "เพิ่มข้อมูลเรียบร้อย", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
    }
}
async function create_Week2(req, res) {
    try {
        const whereConditions = {};
        if (req.body.group_id) whereConditions.group_id = req.body.group_id;
        if (req.body.user_id) whereConditions.user_id = req.body.user_id;
        if (req.body.store_id) whereConditions.store_id = req.body.store_id;
        if (req.body.datesave) whereConditions.datesave = req.body.datesave;

        const whereConditions2 = {};
        if (req.body.group_id) whereConditions2.group_id = req.body.group_id;
        if (req.body.user_id) whereConditions2.user_id = req.body.user_id;
        if (req.body.store_id) whereConditions2.store_id = req.body.store_id;
        if (req.body.datesave) whereConditions2.datesave = req.body.datesave;
        
        const count = await db.Week.count({
            where: {
                group_id: req.body.group_id,
                user_id: req.body.user_id,
                store_id: req.body.store_id,
                datesave: req.body.datesave,
            }
        });
        
        let data;
        if (count !== 0) {

            const existingWeek = await db.Week.findOne({
                where: {
                    group_id: req.body.group_id,
                    user_id: req.body.user_id,
                    store_id: req.body.store_id,
                    datesave: req.body.datesave
                }
            });

            if (existingWeek) {

                await db.WeekList.destroy({
                    where: {
                        week_id: existingWeek.id
                    }
                });
                
                for (const product of req.body.testform2) {
                    await db.WeekList.create({
                        week_id: existingWeek.id,
                        map_product_store_list_id: product.map_product_store_list_id || 0,
                        t_rank: product.t_rank || 0,
                        week1: product.week1 || 0,
                        week2: product.week2 || 0,
                        week3: product.week3 || 0,
                        week4: product.week4 || 0,
                        week5: product.week5 || 0,
                        week6: product.week6 || 0,
                        week7: product.week7 || 0,
                        week8: product.week8 || 0,
                        week9: product.week9 || 0,
                        week10: product.week10 || 0,
                        week11: product.week11 || 0,
                        week12: product.week12 || 0,
                        note: product.note || '',
                    });
                }
            }
        }

        data = await db.Week.findOne({
            where: whereConditions2,
            order: [['id', 'DESC']],
            include: [{
                model: db.WeekList,
                as: 'weekDetails',
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
        // หา specificDisabledDates สำหรับ 7 วันที่ผ่านมา
        const specificDisabledDates = [];
        const targetDate = new Date(req.body.datenow);

        for (let i = 1; i <= 7; i++) {
            const dateToCheck = new Date(targetDate);
            dateToCheck.setDate(targetDate.getDate() - i);
            const formattedDate = dateToCheck.toISOString().split('T')[0];
            const dateExists = await db.Week.count({
                where: {
                    group_id: req.body.group_id,
                    datenow: formattedDate
                }
            });

            if (dateExists === 0) {
                specificDisabledDates.push(formattedDate);
            }
        }
        if(data){
            res.send({
                status: "success",
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
                            report_type: '12 Weeks' // 🌟 เปลี่ยนชื่อให้ตรงกับเมนู (เช่น 'Offtake', 'Stock')
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

        }else{
            res.send({ status: "error", message: "ไม่สามารถพบข้อมูล!",where: whereConditions,count: count });
        }
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_Week(req, res) {
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
        if (req.body.datenow) {
            whereConditions.datesave = req.body.datenow;
        }
        if (req.body.user_id) {
            whereConditions.user_id = req.body.user_id;
        }
        if(req.body.store_id){
            whereConditions.store_id = req.body.store_id;
        }
        const count = await db.Week.count({
            where: {
                group_id: req.body.group_id,
                // datenow: req.body.datenow,
                datesave: req.body.datenow,
                user_id: req.body.user_id,
                store_id: req.body.store_id
            }
        });
        
        const projectRoot = path.join(__dirname, '../');
        let data;

        if (count === 0 && req.body.datenow == req.body.datesave) {
            const datax = await db.Week.create(
                { 
                    group_id: req.body.group_id,
                    datenow: req.body.datenow,
                    datesave: req.body.datesave,
                    startweek: req.body.startweek,
                    user_id: req.body.user_id,
                    store_id : req.body.store_id 
                }
            );
            const countdataWeek = await db.Week.count({where: {
                group_id: req.body.group_id,
                datesave: req.body.datenow,
                user_id: req.body.user_id,
            }});
            
            if(countdataWeek > 0){
                const dataWeek = await db.Week.findOne({
                    where: { 
                        group_id: req.body.group_id,
                        datesave: req.body.datenow ,
                        user_id: req.body.user_id,
                    }
                });
                
                const productList = await db.WeekList.findAll({
                    where: { week_id: dataWeek.id }
                });
                //console.log(productList);
                if(productList.length > 0){
                    for (const product of productList) {
                        await db.WeekList.create({
                            week_id: datax.id,
                            map_product_store_list_id: product.map_product_store_list_id,
                            // t_rank: product.t_rank || 0,
                            // week1: product.week1 || 0,
                            // week2: product.week2 || 0,
                            // week3: product.week3 || 0,
                            // week4: product.week4 || 0,
                            // week5: product.week5 || 0,
                            // week6: product.week6 || 0,
                            // week7: product.week7 || 0,
                            // week8: product.week8 || 0,
                            // week9: product.week9 || 0,
                            // week10: product.week10 || 0,
                            // week11: product.week11 || 0,
                            // week12: product.week12 || 0,
                            // note: product.note || '',
                            isActive: 'Y',
                        });
                    }
                }else{
                    const productList = await db.MapProductStoreList.findAll({
                        where: { 
                            map_product_id: req.body.group_id,
                            isActive:'Y',
                            week : 'Y'
                        }
                    });
                    //console.log(productList);
                    for (const product of productList) {
                        await db.WeekList.create({
                            week_id: datax.id,
                            map_product_store_list_id: product.id,
                            isActive: 'Y',
                        });
                    }
                }
                
            }else{
                const productList = await db.MapProductStoreList.findAll({
                    where: { 
                        map_product_id: req.body.group_id,
                        isActive:'Y',
                        week : 'Y'
                    }
                });
                //console.log(productList);
                for (const product of productList) {
                    await db.WeekList.create({
                        week_id: datax.id,
                        map_product_store_list_id: product.id,
                        // t_rank: req.body.t_rank || 0,
                        // week1: req.body.week1 || 0,
                        // week2: req.body.week2 || 0,
                        // week3: req.body.week3 || 0,
                        // week4: req.body.week4 || 0,
                        // week5: req.body.week5 || 0,
                        // week6: req.body.week6 || 0,
                        // week7: req.body.week7 || 0,
                        // week8: req.body.week8 || 0,
                        // week9: req.body.week9 || 0,
                        // week10: req.body.week10 || 0,
                        // week11: req.body.week11 || 0,
                        // week12: req.body.week12 || 0,
                        // note: req.body.note || '',
                        isActive: 'Y'
                    });
                }
            }
            

            

            data = await db.Week.findOne({
                where: whereConditions,
                order: [['id', 'DESC']],
                include: [{
                    model: db.WeekList,
                    as: 'weekDetails',
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
                                { model: db.Competitor, as: 'competitor', required: false },
                                { model: db.ProductPromotion, as: 'productPromotion', required: false },
                            ],
                        }]
                    }]
                }]
            });
            // await Promise.all(
            //     data.weekDetails.map(async (weekDetail) => {
            //         const product = weekDetail.mapProductStoreList.product;
            //         if (product && product.picture) {
            //             const picPaths = product.picture.split(',');
            //             const base64Images = await Promise.all(
            //                 picPaths.map(async (picPath) => {
            //                     const imagePath = path.resolve(projectRoot, picPath.trim());
            //                     const fileName = path.basename(picPath.trim());

            //                     try {
            //                         const imageData = await fs.promises.readFile(imagePath);
            //                         return {
            //                             url: `data:image/jpeg;base64,${imageData.toString('base64')}`,
            //                             name: fileName,
            //                             id: product.id
            //                         };
            //                     } catch (err) {
            //                         console.error(`Error reading image (${fileName}):`, err.message);
            //                         return null;
            //                     }
            //                 })
            //             );
            //             product.dataValues.picture_cut = base64Images.filter(img => img !== null);
            //         } else {
            //             product.dataValues.picture_cut = [];
            //         }
            //     })
            // );
        } else {
            data = await db.Week.findOne({
                where: whereConditions,
                order: [['id', 'DESC']],
                include: [{
                    model: db.WeekList,
                    as: 'weekDetails',
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
                                { model: db.Competitor, as: 'competitor', required: false },
                                { model: db.ProductPromotion, as: 'productPromotion', required: false },
                            ],
                        }]
                    }]
                }]
            });
            // await Promise.all(
                
            //     data.weekDetails.map(async (weekDetail) => {
            //         const product = weekDetail.mapProductStoreList.product;
            //         if (product && product.picture) {
            //             //console.log(product.picture);
            //             const picPaths = product.picture.split(',');
            //             const base64Images = await Promise.all(
            //                 picPaths.map(async (picPath) => {
            //                     const imagePath = path.resolve(projectRoot, picPath.trim());
            //                     const fileName = path.basename(picPath.trim());

            //                     try {
            //                         const imageData = await fs.promises.readFile(imagePath);
            //                         return {
            //                             url: `data:image/jpeg;base64,${imageData.toString('base64')}`,
            //                             name: fileName,
            //                             id: product.id
            //                         };
            //                     } catch (err) {
            //                         console.error(`Error reading image (${fileName}):`, err.message);
            //                         return null;
            //                     }
            //                 })
            //             );
            //             product.dataValues.picture_cut = base64Images.filter(img => img !== null);
            //         } else {
            //             product.dataValues.picture_cut = [];
            //         }
            //     })
            // );
        }

        const groupedData = {};
        const groupedData2 = {};
        
        if (data && data.weekDetails) {
            data.weekDetails = data.weekDetails.filter(weekDetail => {
                const mapProductStoreList = weekDetail.mapProductStoreList;
                return !(mapProductStoreList && mapProductStoreList.week === 'N');
            });
        // จัดกลุ่มสินค้าใน weekDetails ตาม Brand และ SubBrand
        
            data.weekDetails.forEach(weekDetail => {
                const product = weekDetail.mapProductStoreList.product;
                if (!product) return;

                const brandName = product.brand ? product.brand.name : ' Unknown Brand';
                const subBrandName = product.subBrand ? product.subBrand.name : 'Unknown SubBrand';
                const competitorName = product.competitor ? product.competitor.name : 'Unknown competitor_id';
                const productPromotionName = product.productPromotion ? product.productPromotion.name : 'Unknown promotion_id';
                if(product.competitor && productPromotionName){
                    if(product.competitor.name == 'สินค้าบริษัท' && productPromotionName != 'Unknown promotion_id'){
                        if (!groupedData2[productPromotionName]) {
                            groupedData2[productPromotionName] = {};
                        }
                        // สร้างกลุ่มสำหรับ Brand
                        if (!groupedData2[productPromotionName][brandName]) {
                            groupedData2[productPromotionName][brandName] = {};
                        }
        
                        // สร้างกลุ่มสำหรับ SubBrand
                        if (!groupedData2[productPromotionName][brandName][subBrandName]) {
                            groupedData2[productPromotionName][brandName][subBrandName] = [];
                        }
        
                        // เพิ่มสินค้าไปยังกลุ่ม SubBrand
                        groupedData2[productPromotionName][brandName][subBrandName].push(weekDetail);
                    }else{
                        if (!groupedData[competitorName]) {
                            groupedData[competitorName] = {};
                        }
                        // สร้างกลุ่มสำหรับ Brand
                        if (!groupedData[competitorName][brandName]) {
                            groupedData[competitorName][brandName] = {};
                        }
        
                        // สร้างกลุ่มสำหรับ SubBrand
                        if (!groupedData[competitorName][brandName][subBrandName]) {
                            groupedData[competitorName][brandName][subBrandName] = [];
                        }
        
                        // เพิ่มสินค้าไปยังกลุ่ม SubBrand
                        groupedData[competitorName][brandName][subBrandName].push(weekDetail);
                    }
                }else{
                    if (!groupedData[competitorName]) {
                        groupedData[competitorName] = {};
                    }
                    // สร้างกลุ่มสำหรับ Brand
                    if (!groupedData[competitorName][brandName]) {
                        groupedData[competitorName][brandName] = {};
                    }

                    // สร้างกลุ่มสำหรับ SubBrand
                    if (!groupedData[competitorName][brandName][subBrandName]) {
                        groupedData[competitorName][brandName][subBrandName] = [];
                    }

                    // เพิ่มสินค้าไปยังกลุ่ม SubBrand
                    groupedData[competitorName][brandName][subBrandName].push(weekDetail);
                }
                
            });
        }
        
        // หา specificDisabledDates สำหรับ 7 วันที่ผ่านมา
        const specificDisabledDates = [];
        const targetDate = new Date(req.body.datesave);

        for (let i = 1; i <= 7; i++) {
            const dateToCheck = new Date(targetDate);
            dateToCheck.setDate(targetDate.getDate() - i);
            const formattedDate = dateToCheck.toISOString().split('T')[0];

            const dateExists = await db.Week.count({
                where: {
                    group_id: req.body.group_id,
                    datesave: formattedDate,
                    user_id: req.body.user_id,
                    store_id: req.body.store_id
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
            groupedData2,
            specificDisabledDates,
        });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_week_first(req, res) {
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
        const count = await db.Week.count({
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
async function get_all_week_date(req, res) {
    try {
       
        // หา specificDisabledDates สำหรับ 7 วันที่ผ่านมา
        const specificDisabledDates = [];
        const targetDate = new Date(req.body.datenow);

        for (let i = 1; i <= 90; i++) {
            const dateToCheck = new Date(targetDate);
            dateToCheck.setDate(targetDate.getDate() - i);
            const formattedDate = dateToCheck.toISOString().split('T')[0];

            const dateExists = await db.Week.count({
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
async function get_Week_by_id(req, res) {
    try {
        let data = await db.Week.findByPk(req.params.id);

        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

async function update_Week(req, res) {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.Week.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.Week.update(req.body, { where: { id: req.params.id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

}

async function update_Week_isActive(req, res) {
    const id = req.params.id;
    const error = validation(req, ['isActive']);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.Week.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.Week.update(req.body, { where: { id: id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }
}
async function delete_Week(req, res) {
    const id = req.params.id;
    try {
        // ค้นหาแถวใน Week
        let row = await db.Week.findByPk(id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการลบ');
        }

        // ลบรายการที่เกี่ยวข้องใน WeekList ก่อน
        await db.WeekList.destroy({
            where: { map_product_id: id } // หรือใช้ฟิลด์ที่เชื่อมต่อกับ Week (เช่น WeekId)
        });

        // ลบรายการใน Week
        await db.Week.destroy({
            where: { id: id }
        });

        res.send({ status: "success", message: "ลบข้อมูลเรียบร้อยแล้ว" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถลบข้อมูลได้!" });
    }
}
module.exports = {

    //exprot function
    create_Week,
    create_Week2,
    get_all_Week,
    get_all_week_first,
    get_Week_by_id,
    update_Week,
    update_Week_isActive,
    delete_Week,
    get_all_week_date,

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
