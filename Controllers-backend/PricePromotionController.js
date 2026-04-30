const db = require("../models")

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op
const fs = require('fs');
const path = require('path');

// 🌟 ดึง Model Task และ TaskAssignment มาใช้งานในไฟล์นี้ด้วย
const Task = db.Task || db.tasks; 
const TaskAssignment = db.TaskAssignment || db.task_assignments;

// function create PricePromotion
async function create_PricePromotion(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }
    try {
        const whereConditions = {};
        if (req.body.account_id) whereConditions.account_id = req.body.account_id;
        if (req.body.account_type_id) whereConditions.account_type_id = req.body.account_type_id;
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        const count = await db.PricePromotion.count({
            where: {
                account_id: req.body.account_id,
                account_type_id: req.body.account_type_id,
                group_customer_id: req.body.group_customer_id
            }
        });
        //console.log(count);
        if(count == 0){
            var data = await db.PricePromotion.create(req.body)
            //console.log(data);
        }else{
            const whereConditions = {};
            if (req.body.account_id) whereConditions.account_id = req.body.account_id;
            if (req.body.account_type_id) whereConditions.account_type_id = req.body.account_type_id;
            if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
            //console.log(whereConditions);
            var data = await db.PricePromotion.findOne({ where: whereConditions });
        }
        
        res.send({ status: "success", message: "เพิ่มข้อมูลเรียบร้อย", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
    }
}
async function create_PricePromotion2(req, res) {
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
        
        const count = await db.PricePromotion.count({
            where: {
                group_id: req.body.group_id,
                user_id: req.body.user_id,
                store_id: req.body.store_id,
                datesave: req.body.datesave,
            }
        });
        
        let data;
        if (count !== 0) {

            const existingPrice = await db.PricePromotion.findOne({
                where: {
                    group_id: req.body.group_id,
                    user_id: req.body.user_id,
                    store_id: req.body.store_id,
                    datesave: req.body.datesave
                }
            });

            if (existingPrice) {

                await db.PricePromotionList.destroy({
                    where: {
                        pricepromotion_id: existingPrice.id
                    }
                });
                
                const data = req.body.data ? JSON.parse(req.body.data) : [];
                
                const uploadedPictures = {};
            
                // Map pictures ตาม field name ที่กำหนด เช่น picture_0_1
                if (req.files) {
                Object.keys(req.files).forEach((key) => {
                    const match = key.match(/^picture_(\d+)_(\d+)$/);
                    if (match) {
                    const index = match[1];
                    const file = req.files[key];
                    if (!uploadedPictures[index]) uploadedPictures[index] = [];
            
                    const files = Array.isArray(file) ? file : [file];
                    files.forEach(fileItem => {
                        const ext = fileItem.name.split('.').pop().toLowerCase();
                        const newName = `${Date.now()}-${fileItem.name}`;
                        const savePath = `./images/banner/${newName}`;
                        fileItem.mv(savePath);
                        uploadedPictures[index].push(`images/banner/${newName}`);
                    });
                    }
                });
                }
            
                for (let i = 0; i < data.length; i++) {
                    const item = data[i];
                    
                    const existingRecord = await db.PricePromotionList.findOne({
                        where: { id: item.id },
                    });
                    
                    const oldPictures = existingRecord?.picture || '';
                    const newPictures = uploadedPictures[i] ? uploadedPictures[i].join(',') : '';
                    
                    const picturePaths = newPictures
                        ? oldPictures
                        ? `${oldPictures},${newPictures}`
                        : newPictures
                        : oldPictures;
                    
                    await db.PricePromotionList.create(
                        {
                        pricepromotion_id: existingPrice.id,
                        map_product_store_list_id: item.map_product_store_list_id,
                        isActive: item.isActive || 'Y',
                        price: item.price || 0,
                        not_sell: item.not_sell || 'N',
                        promotion_id: item.promotion_id || 0,
                        special_price: item.special_price || 0,
                        daterange: item.daterange || null,
                        qty_start: item.qty_start || 0,
                        qty_in: item.qty_in || 0,
                        qty_out: item.qty_out || 0,
                        stock: item.stock || 0,
                        qty_start2: item.qty_start2 || 0,
                        qty_in2: item.qty_in2 || 0,
                        qty_out2: item.qty_out2 || 0,
                        stock2: item.stock2 || 0,
                        qty_start3: item.qty_start3 || 0,
                        qty_in3: item.qty_in3 || 0,
                        qty_out3: item.qty_out3 || 0,
                        stock3: item.stock3 || 0,
                        qty_start4: item.qty_start4 || 0,
                        qty_in4: item.qty_in4 || 0,
                        qty_out4: item.qty_out4 || 0,
                        stock4: item.stock4 || 0,
                        note: item.note || '',
                        picture: picturePaths || null,
                        }
                    );
                }
            }
        }

        data = await db.PricePromotion.findOne({
            where: whereConditions2,
            order: [['id', 'DESC']],
            include: [{
                model: db.PricePromotionList,
                as: 'pricePromotionDetails',
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
            const dateExists = await db.PricePromotion.count({
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
            // 🌟 ส่วนที่เพิ่มใหม่: อัปเดต TaskAssignment อัตโนมัติ (สำหรับ Price & Promotion)
            // =================================================================
            try {
                if (req.body.reportTypesToSubmit) {
                    const typesToSubmit = JSON.parse(req.body.reportTypesToSubmit);
                    
                    // ค้นหาวันที่เพื่อเปรียบเทียบ Task ของวันนี้
                    const getTodayStr = () => {
                        const d = new Date();
                        const tzOffset = d.getTimezoneOffset() * 60000;
                        return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
                    };
                    const todayStr = getTodayStr();

                    // ต้องดึง Model ของ Task มาด้วย (อย่าลืม require ด้านบนไฟล์ Controller)
                    // const Task = db.Task; const TaskAssignment = db.TaskAssignment;
                    
                    for (const reportType of typesToSubmit) {
                        const pendingAssignment = await TaskAssignment.findOne({
                            where: {
                                // รับ userId จาก Body 
                                user_id: req.body.user_id ? JSON.parse(req.body.user_id) : req.body.user_id,
                                task_date: todayStr,
                                status: 'pending'
                            },
                            include: [{
                                model: Task,
                                as: 'task_detail',
                                where: { report_type: reportType } // ค้นหาตามชื่อ Report (เช่น Price, Promotion)
                            }]
                        });

                        // ถ้าเจอ ให้ทำการ Stamp เวลา
                        if (pendingAssignment) {
                            await pendingAssignment.update({
                                status: 'submitted',
                                submitted_at: new Date()
                            });
                            console.log(`Auto-submitted TaskAssignment for: ${reportType}`);
                        }
                    }
                }
            } catch (taskErr) {
                console.error("Error auto-submitting TaskAssignment:", taskErr);
            }
            // =================================================================

        }else{
            res.send({ status: "error", message: "ไม่สามารถพบข้อมูล!",where: whereConditions,count: count });
        }
    } catch (err) {
        res.status(500).send({ status: "error", message: err.stack || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
//get all PricePromotion
async function get_all_PricePromotion_bk(req, res) {
    try {
        const whereConditions = {};
        if (req.body.group_id) whereConditions.group_id = req.body.group_id;
        if (req.body.datenow) whereConditions.datesave = req.body.datenow;

        const whereConditions2 = {};
        if (req.body.group_id) whereConditions2.group_id = req.body.group_id;
        if (req.body.datesave) whereConditions2.datesave = req.body.datesave;

        const count = await db.PricePromotion.count({
            where: {
                group_id: req.body.group_id,
            }
        });
        
        let data;
        if (count === 0) {
            res.send({ status: "error", message: "ไม่สามารถพบข้อมูล!",where: whereConditions,count: count });
        }else{
            data = await db.PricePromotion.findOne({
                where: whereConditions,
                order: [['id', 'DESC']],
                include: [{
                    model: db.PricePromotionList,
                    as: 'pricePromotionDetails',
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

                // ตรวจสอบว่าในแต่ละวันที่ไม่มีข้อมูลใน db.PricePromotion
                const dateExists = await db.PricePromotion.count({
                    where: {
                        group_id: req.body.group_id,
                        datenow: formattedDate
                    }
                });

                if (dateExists === 0) {
                    specificDisabledDates.push(formattedDate);
                }
            }

            // แปลงรูปภาพแต่ละรูปเป็น Base64 และเพิ่มไปยัง picture_cut
            const projectRoot = path.join(__dirname, '../'); // แก้ไขตามโครงสร้างโฟลเดอร์ของคุณ
            if(data){
                if(data.pricePromotionDetails){
                    await Promise.all(
                        data.pricePromotionDetails.map(async (element) => {
                            if (element.picture) {
                                const picPaths = element.picture.split(',');
                                const base64Images = await Promise.all(
                                    picPaths.map(async (picPath) => {
                                        const imagePath = path.resolve(projectRoot, picPath.trim());
                                        const fileName = path.basename(picPath.trim()); // ดึงชื่อไฟล์ออกจาก path
                                        try {
                                            const imageData = await fs.promises.readFile(imagePath);
                                            return {
                                                url: `data:image/jpeg;base64,${imageData.toString('base64')}`,
                                                name: fileName,
                                                id: element.id
                                            };
                                        } catch (err) {
                                            console.error('Error reading image:', err.message);
                                            return null;
                                        }
                                    })
                                );
                                // กรองเฉพาะภาพที่อ่านได้สำเร็จและเก็บไว้ใน picture_cut
                                element.dataValues.picture_cut = base64Images.filter(img => img !== null);
                            } else {
                                element.dataValues.picture_cut = [];
                            }
                        })
                    );
                }
                res.send({
                    status: "success",
                    data: data,
                    specificDisabledDates: specificDisabledDates
                });
            }else{
                res.send({ status: "error", message: "ไม่สามารถพบข้อมูล!",where: whereConditions,count: count });
            }
        }
        
            
        // }

        // หา specificDisabledDates สำหรับ 7 วันที่ผ่านมา
        // const specificDisabledDates = [];
        // const targetDate = new Date(req.body.datenow);

        // for (let i = 1; i <= 7; i++) {
        //     const dateToCheck = new Date(targetDate);
        //     dateToCheck.setDate(targetDate.getDate() - i);
        //     const formattedDate = dateToCheck.toISOString().split('T')[0];

        //     // ตรวจสอบว่าในแต่ละวันที่ไม่มีข้อมูลใน db.PricePromotion
        //     const dateExists = await db.PricePromotion.count({
        //         where: {
        //             group_id: req.body.group_id,
        //             datenow: formattedDate
        //         }
        //     });

        //     if (dateExists === 0) {
        //         specificDisabledDates.push(formattedDate);
        //     }
        // }

        // แปลงรูปภาพแต่ละรูปเป็น Base64 และเพิ่มไปยัง picture_cut
        // const projectRoot = path.join(__dirname, '../'); // แก้ไขตามโครงสร้างโฟลเดอร์ของคุณ

        // if(data){
        //     if(data.pricePromotionDetails){
        //         await Promise.all(
        //             data.pricePromotionDetails.map(async (element) => {
        //                 if (element.picture) {
        //                     const picPaths = element.picture.split(',');
        //                     const base64Images = await Promise.all(
        //                         picPaths.map(async (picPath) => {
        //                             const imagePath = path.resolve(projectRoot, picPath.trim());
        //                             const fileName = path.basename(picPath.trim()); // ดึงชื่อไฟล์ออกจาก path
        //                             try {
        //                                 const imageData = await fs.promises.readFile(imagePath);
        //                                 return {
        //                                     url: `data:image/jpeg;base64,${imageData.toString('base64')}`,
        //                                     name: fileName,
        //                                     id: element.id
        //                                 };
        //                             } catch (err) {
        //                                 console.error('Error reading image:', err.message);
        //                                 return null;
        //                             }
        //                         })
        //                     );
        //                     // กรองเฉพาะภาพที่อ่านได้สำเร็จและเก็บไว้ใน picture_cut
        //                     element.dataValues.picture_cut = base64Images.filter(img => img !== null);
        //                 } else {
        //                     element.dataValues.picture_cut = [];
        //                 }
        //             })
        //         );
        //     }
        //     res.send({
        //         status: "success",
        //         data: data,
        //         specificDisabledDates: specificDisabledDates
        //     });
        // }else{
        //     res.send({ status: "error", message: "ไม่สามารถพบข้อมูล!",where: whereConditions });
        // }
        
        

        
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_PricePromotion(req, res) {
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
        const count = await db.PricePromotion.count({
            where: {
                group_id: req.body.group_id,
                datesave: req.body.datenow,
                // datesave: req.body.datesave,
                user_id: req.body.user_id,
                store_id: req.body.store_id,
            }
        });

        const projectRoot = path.join(__dirname, '../');
        let data;

        if (count === 0 && req.body.datenow == req.body.datesave) {
            const datax = await db.PricePromotion.create(
                { 
                    group_id: req.body.group_id,
                    datenow: req.body.datenow,
                    datesave: req.body.datesave,
                    user_id: req.body.user_id,
                    store_id: req.body.store_id,
                }
            );
            const countdataPricePromotion = await db.PricePromotion.count({where: {
                group_id: req.body.group_id,
                datesave: req.body.datenow,
                user_id: req.body.user_id,
                store_id: req.body.store_id,
            }});
            
            if(countdataPricePromotion > 0){
                const dataPricePromotion = await db.PricePromotion.findOne({
                    where: { 
                        group_id: req.body.group_id,
                        datesave: req.body.datenow ,
                        user_id: req.body.user_id,
                        store_id: req.body.store_id,
                    }
                });
                
                const productList = await db.PricePromotionList.findAll({
                    where: { pricepromotion_id: dataPricePromotion.id }
                });
                //console.log(productList);
                if(productList.length > 0){
                    for (const product of productList) {
                        await db.PricePromotionList.create({
                            pricepromotion_id: datax.id,
                            map_product_store_list_id: product.map_product_store_list_id,
                            price: product.price || 0,
                            promotion_id: product.promotion_id || 0,
                            special_price: product.special_price || 0,
                            daterange: product.daterange || null,
                            picture: product.picture || null,
                            qty_start: product.qty_start || 0,
                            qty_in: product.qty_in || 0,
                            qty_out: product.qty_out || 0,
                            stock: product.stock || 0,

                            qty_start2: product.qty_start2 || 0,
                            qty_in2: product.qty_in2 || 0,
                            qty_out2: product.qty_out2 || 0,
                            stock2: product.stock2 || 0,

                            qty_start3: product.qty_start3 || 0,
                            qty_in3: product.qty_in3 || 0,
                            qty_out3: product.qty_out3 || 0,
                            stock3: product.stock3 || 0,

                            qty_start4: product.qty_start4 || 0,
                            qty_in4: product.qty_in4 || 0,
                            qty_out4: product.qty_out4 || 0,
                            stock4: product.stock4 || 0,
                            note: product.note || '',
                            isActive: 'Y',
                        });
                    }
                }else{
                    const productList = await db.MapProductStoreList.findAll({
                        where: { 
                            map_product_id: req.body.group_id,
                            isActive:'Y',
                            price : 'Y'
                        }
                    });
                    //console.log(productList);
                    for (const product of productList) {

                        await db.PricePromotionList.create({
                            pricepromotion_id: datax.id,
                            map_product_store_list_id: product.id,
                            isActive: 'Y'
                        });
                                
                    }
                }
                
            }else{
                const productList = await db.MapProductStoreList.findAll({
                    where: { map_product_id: req.body.group_id ,
                        price : 'Y',
                        isActive:'Y'
                    }
                });
                //console.log(productList);
                for (const product of productList) {
                    await db.PricePromotionList.create({
                        pricepromotion_id: datax.id,
                        map_product_store_list_id: product.id,
                        isActive: 'Y',
                        
                    });
                }
            }

            data = await db.PricePromotion.findOne({
                where: whereConditions,
                order: [['id', 'DESC']],
                include: [{
                    model: db.PricePromotionList,
                    as: 'pricePromotionDetails',
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
            
        } else {
            data = await db.PricePromotion.findOne({
                where: whereConditions,
                order: [['id', 'DESC']],
                include: [{
                    model: db.PricePromotionList,
                    as: 'pricePromotionDetails',
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
            
        }

        const groupedData = {};
        const groupedData2 = {};

        if (data && data.pricePromotionDetails) {
            data.pricePromotionDetails = data.pricePromotionDetails.filter(pricePromotionDetail => {
                const mapProductStoreList = pricePromotionDetail.mapProductStoreList;
                return !(mapProductStoreList && mapProductStoreList.price === 'N');
            });

            // จัดกลุ่มสินค้าใน pricePromotionDetails ตาม Brand และ SubBrand
        
            data.pricePromotionDetails.forEach(pricePromotionDetail => {
                const product = pricePromotionDetail.mapProductStoreList.product;
                if (!product) return;

                const brandName = product.brand ? product.brand.name : ' Unknown Brand';
                const subBrandName = product.subBrand ? product.subBrand.name : 'Unknown SubBrand';
                const competitorName = product.competitor ? product.competitor.name : 'Unknown competitor_id';
                const productPromotionName = product.productPromotion ? product.productPromotion.name : 'Unknown promotion_id';
                if(product.competitor && productPromotionName){
                    if(!product.competitor && productPromotionName != 'Unknown promotion_id'){
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
                        groupedData2[productPromotionName][brandName][subBrandName].push(pricePromotionDetail);
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
                        groupedData[competitorName][brandName][subBrandName].push(pricePromotionDetail);
                    }
                }else{
                    if(!product.competitor && productPromotionName != 'Unknown promotion_id'){
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
                        groupedData2[productPromotionName][brandName][subBrandName].push(pricePromotionDetail);
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
                        groupedData[competitorName][brandName][subBrandName].push(pricePromotionDetail);
                    }
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

            const dateExists = await db.PricePromotion.count({
                where: {
                    group_id: req.body.group_id,
                    datesave: formattedDate,
                    user_id: req.body.user_id,
                    store_id: req.body.store_id,
                }
            });

            if (dateExists === 0) {
                specificDisabledDates.push(formattedDate);
            }
        }

        res.send({
            status: "success",
            data: data,
            count: count,
            groupedData, // ส่งข้อมูลสินค้าเป็นกลุ่มตาม Brand และ SubBrand
            groupedData2,
            specificDisabledDates,
        });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.stack || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_PricePromotion_first(req, res) {
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
        const count = await db.PricePromotion.count({
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
async function get_all_PricePromotion_date(req, res) {
    try {
       
        // หา specificDisabledDates สำหรับ 90 วันที่ผ่านมา
        const specificDisabledDates = [];
        const targetDate = new Date(req.body.datenow);

        for (let i = 1; i <= 90; i++) {
            const dateToCheck = new Date(targetDate);
            dateToCheck.setDate(targetDate.getDate() - i);
            const formattedDate = dateToCheck.toISOString().split('T')[0];

            const dateExists = await db.PricePromotion.count({
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
async function get_all_areadata(req, res) {
    try {
        
        let data;

        data = await db.PricePromotion.findOne({
            where: whereConditions,
            order: [['id', 'DESC']],
            include: [{
                model: db.PricePromotionList,
                as: 'pricePromotionDetails',
                include: [{
                    model: db.MapProductStoreList,
                    as: 'mapProductStoreList',
                    include: [{
                        model: db.Product,
                        as: 'product',
                        required: false,
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

        // จัดกลุ่มสินค้าใน pricePromotionDetails ตาม Brand และ SubBrand
        const groupedData = {};
        data.pricePromotionDetails.forEach(pricePromotionDetail => {
            const product = pricePromotionDetail.mapProductStoreList.product;
            if (!product) return;

            const brandName = product.brand ? product.brand.name : ' Unknown Brand';
            if (!groupedData) {
                groupedData = {};
            }
            // สร้างกลุ่มสำหรับ Brand
            if (!groupedData[brandName]) {
                groupedData[brandName] = {};
            }

            // สร้างกลุ่มสำหรับ SubBrand
            if (!groupedData[brandName]) {
                groupedData[brandName] = [];
            }

            // เพิ่มสินค้าไปยังกลุ่ม SubBrand
            groupedData[brandName].push(pricePromotionDetail);
        });


        res.send({
            status: "success",
            groupedData,
        });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_price_check_day(req, res) {
    try {
        // หา specificDisabledDates สำหรับ 7 วันที่ผ่านมา
        const specificDisabledDates = [];
        const targetDate = new Date(req.body.datesave);

        for (let i = 1; i <= 7; i++) {
            const dateToCheck = new Date(targetDate);
            dateToCheck.setDate(targetDate.getDate() - i);
            const formattedDate = dateToCheck.toISOString().split('T')[0];

            // ตรวจสอบว่าในแต่ละวันที่ไม่มีข้อมูลใน db.PricePromotion
            const dateExists = await db.PricePromotion.count({
                where: {
                    group_id: req.body.group_id,
                    datesave: formattedDate
                }
            });

            if (dateExists === 0) {
                specificDisabledDates.push(formattedDate);
            }
        }
        res.send({
            status: "success",
            specificDisabledDates: specificDisabledDates
        });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function create_new_PricePromotion(req, res) {
    try {
        const whereConditions = {};
        if (req.body.group_id) whereConditions.group_id = req.body.group_id;
        if (req.body.datenow) whereConditions.datesave = req.body.datenow;

        const whereConditions2 = {};
        if (req.body.group_id) whereConditions2.group_id = req.body.group_id;
        if (req.body.datesave) whereConditions2.datesave = req.body.datesave;
        
        const count = await db.PricePromotion.count({
            where: {
                group_id: req.body.group_id,
            }
        });
        
        let data;
        if (count === 0) {
            const datex = new Date(req.body.datesave);
            const formattedDate = datex.getFullYear() + "-" +
                      String(datex.getMonth() + 1).padStart(2, '0') + "-" +
                      String(datex.getDate()).padStart(2, '0');
            let dataz = await db.PricePromotion.create({
                group_id: req.body.group_id,
                datenow: req.body.datenow,
                datesave: formattedDate,
            });
            const productList = await db.MapProductStoreList.findAll({
                where: { map_product_id: req.body.group_id }
            });
            // วนลูปสร้างรายการใน PricePromotionList สำหรับสินค้าแต่ละตัวที่เจอ
            for (const product of productList) {
                await db.PricePromotionList.create({
                    pricepromotion_id: dataz.id,
                    map_product_store_list_id: product.id,
                    stock: req.body.stock || 0,
                    note: req.body.note || '',
                });
            }
        }

        data = await db.PricePromotion.findOne({
            where: whereConditions,
            order: [['id', 'DESC']],
            include: [{
                model: db.PricePromotionList,
                as: 'pricePromotionDetails',
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

            // ตรวจสอบว่าในแต่ละวันที่ไม่มีข้อมูลใน db.PricePromotion
            const dateExists = await db.PricePromotion.count({
                where: {
                    group_id: req.body.group_id,
                    datenow: formattedDate
                }
            });

            if (dateExists === 0) {
                specificDisabledDates.push(formattedDate);
            }
        }

        // แปลงรูปภาพแต่ละรูปเป็น Base64 และเพิ่มไปยัง picture_cut
        const projectRoot = path.join(__dirname, '../'); // แก้ไขตามโครงสร้างโฟลเดอร์ของคุณ
        if(data){
            if(data.pricePromotionDetails){
                await Promise.all(
                    data.pricePromotionDetails.map(async (element) => {
                        if (element.picture) {
                            const picPaths = element.picture.split(',');
                            const base64Images = await Promise.all(
                                picPaths.map(async (picPath) => {
                                    const imagePath = path.resolve(projectRoot, picPath.trim());
                                    const fileName = path.basename(picPath.trim()); // ดึงชื่อไฟล์ออกจาก path
                                    try {
                                        const imageData = await fs.promises.readFile(imagePath);
                                        return {
                                            url: `data:image/jpeg;base64,${imageData.toString('base64')}`,
                                            name: fileName,
                                            id: element.id
                                        };
                                    } catch (err) {
                                        console.error('Error reading image:', err.message);
                                        return null;
                                    }
                                })
                            );
                            // กรองเฉพาะภาพที่อ่านได้สำเร็จและเก็บไว้ใน picture_cut
                            element.dataValues.picture_cut = base64Images.filter(img => img !== null);
                        } else {
                            element.dataValues.picture_cut = [];
                        }
                    })
                );
            }
            res.send({
                status: "success",
                data: data,
                specificDisabledDates: specificDisabledDates
            });
        }else{
            res.send({ status: "error", message: "ไม่สามารถพบข้อมูล!",where: whereConditions,count: count });
        }
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function create_new_PricePromotion2(req, res) {
    try {
        const whereConditions = {};
        if (req.body.group_id) whereConditions.group_id = req.body.group_id;
        if (req.body.datenow) whereConditions.datesave = req.body.datenow;

        const whereConditions2 = {};
        if (req.body.group_id) whereConditions2.group_id = req.body.group_id;
        if (req.body.datesave) whereConditions2.datesave = req.body.datesave;
        
        const count = await db.PricePromotion.count({
            where: {
                group_id: req.body.group_id,
                datesave: req.body.datesave,
            }
        });
        
        let data;
        if (count === 0) {
            let dataz = await db.PricePromotion.create({
                group_id: req.body.group_id,
                datenow: req.body.datenow,
                datesave: req.body.datesave,
            });
            const productList = await db.MapProductStoreList.findAll({
                where: { map_product_id: req.body.group_id }
            });
            // วนลูปสร้างรายการใน PricePromotionList สำหรับสินค้าแต่ละตัวที่เจอ
            for (const product of productList) {
                await db.PricePromotionList.create({
                    pricepromotion_id: dataz.id,
                    map_product_store_list_id: product.id,
                    stock: req.body.stock || 0,
                    note: req.body.note || '',
                });
            }
        }

        data = await db.PricePromotion.findOne({
            where: whereConditions2,
            order: [['id', 'DESC']],
            include: [{
                model: db.PricePromotionList,
                as: 'pricePromotionDetails',
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

            // ตรวจสอบว่าในแต่ละวันที่ไม่มีข้อมูลใน db.PricePromotion
            const dateExists = await db.PricePromotion.count({
                where: {
                    group_id: req.body.group_id,
                    datenow: formattedDate
                }
            });

            if (dateExists === 0) {
                specificDisabledDates.push(formattedDate);
            }
        }

        // แปลงรูปภาพแต่ละรูปเป็น Base64 และเพิ่มไปยัง picture_cut
        const projectRoot = path.join(__dirname, '../'); // แก้ไขตามโครงสร้างโฟลเดอร์ของคุณ
        if(data){
            if(data.pricePromotionDetails){
                await Promise.all(
                    data.pricePromotionDetails.map(async (element) => {
                        if (element.picture) {
                            const picPaths = element.picture.split(',');
                            const base64Images = await Promise.all(
                                picPaths.map(async (picPath) => {
                                    const imagePath = path.resolve(projectRoot, picPath.trim());
                                    const fileName = path.basename(picPath.trim()); // ดึงชื่อไฟล์ออกจาก path
                                    try {
                                        const imageData = await fs.promises.readFile(imagePath);
                                        return {
                                            url: `data:image/jpeg;base64,${imageData.toString('base64')}`,
                                            name: fileName,
                                            id: element.id
                                        };
                                    } catch (err) {
                                        console.error('Error reading image:', err.message);
                                        return null;
                                    }
                                })
                            );
                            // กรองเฉพาะภาพที่อ่านได้สำเร็จและเก็บไว้ใน picture_cut
                            element.dataValues.picture_cut = base64Images.filter(img => img !== null);
                        } else {
                            element.dataValues.picture_cut = [];
                        }
                    })
                );
            }
            res.send({
                status: "success",
                data: data,
                specificDisabledDates: specificDisabledDates
            });
        }else{
            res.send({ status: "error", message: "ไม่สามารถพบข้อมูล!",where: whereConditions,count: count });
        }
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
//get PricePromotion by id
async function get_PricePromotion_by_id(req, res) {
    try {
        let data = await db.PricePromotion.findByPk(req.params.id);

        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//update PricePromotion
async function update_PricePromotion(req, res) {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.PricePromotion.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.PricePromotion.update(req.body, { where: { id: req.params.id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

}

//update PricePromotion isActive
async function update_PricePromotion_isActive(req, res) {
    const id = req.params.id;
    const error = validation(req, ['isActive']);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.PricePromotion.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.PricePromotion.update(req.body, { where: { id: id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }
}
async function delete_PricePromotion(req, res) {
    const id = req.params.id;
    try {
        // ค้นหาแถวใน PricePromotion
        let row = await db.PricePromotion.findByPk(id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการลบ');
        }

        // ลบรายการที่เกี่ยวข้องใน PricePromotionList ก่อน
        await db.PricePromotionList.destroy({
            where: { map_product_id: id } // หรือใช้ฟิลด์ที่เชื่อมต่อกับ PricePromotion (เช่น PricePromotionId)
        });

        // ลบรายการใน PricePromotion
        await db.PricePromotion.destroy({
            where: { id: id }
        });

        res.send({ status: "success", message: "ลบข้อมูลเรียบร้อยแล้ว" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถลบข้อมูลได้!" });
    }
}
module.exports = {

    //exprot function
    create_PricePromotion,
    get_all_PricePromotion,
    get_all_PricePromotion_first,
    get_price_check_day,
    get_PricePromotion_by_id,
    update_PricePromotion,
    update_PricePromotion_isActive,
    delete_PricePromotion,
    create_new_PricePromotion,
    create_new_PricePromotion2,
    get_all_PricePromotion_date,
    get_all_areadata,
    create_PricePromotion2,
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
