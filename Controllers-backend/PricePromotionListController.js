const db = require("../models")

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op

const express = require('express');
const fileUpload = require('express-fileupload');
const app = express();

app.use(fileUpload());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// function create PricePromotionList
async function create_PricePromotionList(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }
    try {
        await db.PricePromotionList.create(req.body)
        res.send({ status: "success", message: "เพิ่มข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
    }
}
async function createOrUpdate_PricePromotion(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    const PricePromotionList = req.body.group_id; // สมมุติว่า array ถูกส่งเข้ามาใน req.body

    try {
        for (const item of PricePromotionList) {
            if (item.id === null) {
                // ถ้า id เป็น null ให้สร้างรายการใหม่
                await db.PricePromotionList.create({
                    map_product_id: item.map_product_id,
                    product_id: item.product_id,
                });
            } else {
                // ถ้า id มีค่า ให้ทำการ update โดยใช้ id ที่มี
                await db.PricePromotionList.update({
                    map_product_id: item.map_product_id,
                    product_id: item.product_id,
                }, {
                    where: { id: item.id }
                });
            }
        }

        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลได้ในตอนนี้!" });
    }
}
async function createOrUpdate_PricePromotionList(req, res) {
    try {
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
      
        await db.PricePromotionList.update(
          {
            price: item.price,
            not_sell: item.not_sell,
            promotion_id: item.promotion_id,
            special_price: item.special_price,
            daterange: item.daterange,
            qty_start: item.qty_start,
            qty_in: item.qty_in,
            qty_out: item.qty_out,
            stock: item.stock,
            qty_start2: item.qty_start2,
            qty_in2: item.qty_in2,
            qty_out2: item.qty_out2,
            stock2: item.stock2,
            qty_start3: item.qty_start3,
            qty_in3: item.qty_in3,
            qty_out3: item.qty_out3,
            stock3: item.stock3,
            qty_start4: item.qty_start4,
            qty_in4: item.qty_in4,
            qty_out4: item.qty_out4,
            stock4: item.stock4,
            note: item.note,
            picture: picturePaths || null,
          },
          {
            where: { id: item.id },
          }
        );
      }
  
      res.send({ status: 'success', message: 'บันทึกข้อมูลทั้งหมดเรียบร้อย' });
    } catch (err) {
      res.status(500).send({ status: 'error', message: err.message });
    }
  }
async function createOrUpdate_PricePromotionListbk2(req, res) {
    try {
      const data = req.body.data ? JSON.parse(req.body.data) : [];
  
      const uploadedPictures = {};
  
      // จัดการไฟล์ภาพ
      if (req.files && typeof req.files === 'object') {
        Object.keys(req.files).forEach((fieldKey) => {
          const match = fieldKey.match(/^data\[(\d+)]\[picture]\[(\d+)]$/);
          if (match) {
            const index = match[1];
            const file = req.files[fieldKey];
            if (!uploadedPictures[index]) uploadedPictures[index] = [];
  
            const imageArr = Array.isArray(file) ? file : [file];
            imageArr.forEach(fileItem => {
              const ext = fileItem.name.split('.').pop().toLowerCase();
              const newName = `${Date.now()}-${fileItem.name}`;
              const savePath = `./images/banner/${newName}`;
              fileItem.mv(savePath);
              uploadedPictures[index].push(`images/banner/${newName}`);
            });
          }
        });
      }
  
      const saveResults = [];
  
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const picturePaths = uploadedPictures[i] ? uploadedPictures[i].join(',') : '';
  
        await db.PricePromotionList.update({
          price: item.price,
          not_sell: item.not_sell,
          promotion_id: item.promotion_id,
          special_price: item.special_price,
          daterange: item.daterange,
  
          qty_start: item.qty_start,
          qty_in: item.qty_in,
          qty_out: item.qty_out,
          stock: item.stock,
  
          qty_start2: item.qty_start2,
          qty_in2: item.qty_in2,
          qty_out2: item.qty_out2,
          stock2: item.stock2,
  
          qty_start3: item.qty_start3,
          qty_in3: item.qty_in3,
          qty_out3: item.qty_out3,
          stock3: item.stock3,
  
          qty_start4: item.qty_start4,
          qty_in4: item.qty_in4,
          qty_out4: item.qty_out4,
          stock4: item.stock4,
  
          note: item.note,
          picture: picturePaths || null,
        }, {
          where: { id: item.id }
        });
  
        saveResults.push(item.id);
      }
  
      res.send({ status: 'success', message: 'บันทึกข้อมูลทั้งหมดเรียบร้อย', updated: saveResults });
    } catch (err) {
      res.status(500).send({ status: "error", message: err.message });
    }
}
async function createOrUpdate_PricePromotionListbk(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }
    try {
        const count = await db.PricePromotion.count({
            where: {
                datesave: req.body.datesave,
                group_id: req.body.group_id,
            }
        });
        var pricepromotion_idzzz = 0;
        if(count > 0){
            // ตรวจสอบว่ามีไฟล์ picture อยู่ในคำขอ
            const uploadedFiles = [];
            if (req.files && req.files.picture && req.files.picture !== 'undefined') {
                const licenseCopies = Array.isArray(req.files.picture) ? req.files.picture : [req.files.picture];
                
        
                for (let image_game of licenseCopies) {
                    let ext = image_game.name.split('.').pop().toLowerCase();
                    if (['jpg', 'jpeg', 'png'].includes(ext)) {
                        var today = new Date();
                        var date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}-${today.getHours()}${today.getMinutes()}${today.getSeconds()}`;
                        var new_name = `${date}-${image_game.name}`;
                        var savePath = `./images/banner/${new_name}`;
            
                        try {
                            await image_game.mv(savePath);
                            uploadedFiles.push(`images/banner/${new_name}`);
                        } catch (error) {
                            return res.status(500).send({ status: 'error', msg: 'File save failed', error });
                        }
                    } else {
                        return res.status(500).send({ status: 'error', msg: 'Invalid file type' });
                    }
                }
        
                
            } else {
                //console.log("No valid picture files were uploaded or picture is undefined");
            }

            if (req.body.id > 0) {
                const existingRecord = await db.PricePromotionList.findOne({ where: { id: req.body.id } });
                
                // ถ้ามีภาพใหม่ ให้ต่อเข้ากับภาพเดิม
                if(existingRecord){
                    var updatedPictures = existingRecord.picture || '';
                    if (uploadedFiles.length > 0) {
                        updatedPictures = updatedPictures ? `${updatedPictures},${uploadedFiles.join(',')}` : uploadedFiles.join(',');
                    }
                }else{
                    var updatedPictures = '';
                    if (uploadedFiles.length > 0) {
                        updatedPictures = updatedPictures ? `${updatedPictures},${uploadedFiles.join(',')}` : uploadedFiles.join(',');
                    }
                }
                
                
                await db.PricePromotionList.update({
                    price: req.body.price,
                    not_sell: (req.body.not_sell=='Y'?'Y':'N'),

                    promotion_id: (req.body.promotion_id>0?req.body.promotion_id:0),
                    special_price: req.body.special_price,
                    daterange: (req.body.daterange!="null"?req.body.daterange:null),

                    qty_start: req.body.qty_start,
                    qty_in: req.body.qty_in,
                    qty_out: req.body.qty_out,
                    stock: req.body.stock,

                    qty_start2: req.body.qty_start2,
                    qty_in2: req.body.qty_in2,
                    qty_out2: req.body.qty_out2,
                    stock2: req.body.stock2,

                    qty_start3: req.body.qty_start3,
                    qty_in3: req.body.qty_in3,
                    qty_out3: req.body.qty_out3,
                    stock3: req.body.stock3,

                    qty_start4: req.body.qty_start4,
                    qty_in4: req.body.qty_in4,
                    qty_out4: req.body.qty_out4,
                    stock4: req.body.stock4,

                    note: (req.body.note!="null"?req.body.note:null),
                    picture: updatedPictures  // อัปเดต picture ที่มีการรวมภาพใหม่เข้ากับภาพเดิม
                }, {
                    where: { id: req.body.id }
                });
                const PricePromotionList = await db.PricePromotionList.findOne({
                    where: { 
                        id: req.body.id
                    }
                });
                pricepromotion_idzzz = PricePromotionList.pricepromotion_id
                // await db.PricePromotion.update({
                //     datesave: req.body.datesave,
                // }, {
                //     where: { id: existingRecord.pricepromotion_id }
                // });
            }
        }
        
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลได้ในตอนนี้!" });
    }
}
async function createOrUpdate_PricePromotionList_dup(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }
    try {
        
        // const PricePromotionList = await db.PricePromotionList.findOne({
        //     where: { 
        //         id: req.body.id
        //     }
        // });
        // if (PricePromotionList.pricepromotion_id > 0) {
        //     const pricepromotion = await db.PricePromotion.findOne({
        //         where: { 
        //             id: PricePromotionList.pricepromotion_id
        //         },
        //         include: [
        //             {
        //                 model: db.MapProductStore,
        //                 as: 'mapProductStore', // ชื่อ alias ที่ตั้งไว้ใน model
        //                 required: false, // เลือกเฉพาะฟิลด์ที่ต้องการ (เช่น name)
        //             },
        //         ]
        //     });
        //     const MapProductStore = await db.MapProductStore.findAll({
        //         where: { 
        //             account_id: pricepromotion.mapProductStore.account_id,
        //             account_type_id: pricepromotion.mapProductStore.account_type_id,
        //             group_customer_id: pricepromotion.mapProductStore.group_customer_id,
        //             id: { [Op.ne]: pricepromotion.group_id }
        //         }
        //     });
        //     if(MapProductStore.length>0){
        //         for (const product of MapProductStore) {
        //             const count = await db.PricePromotion.count({
        //                 where: {
        //                     group_id: product.id,
        //                     datenow: pricepromotion.datenow,
        //                     datesave: pricepromotion.datesave,
        //                     user_id: pricepromotion.user_id,
        //                 }
        //             });
        //             if (count === 0) {
        //                 const datax = await db.PricePromotion.create(
        //                     { 
        //                         group_id: product.id,
        //                         datenow: pricepromotion.datenow,
        //                         datesave: pricepromotion.datesave,
        //                         user_id: pricepromotion.user_id,
        //                     }
        //                 );
        //                 if(datax.id > 0){
        //                     const productList = await db.PricePromotionList.findAll({
        //                         where: { pricepromotion_id: pricepromotion.id }
        //                     });
        //                     if(productList){
        //                         for (const product of productList) {
        //                             await db.PricePromotionList.create({
        //                                 pricepromotion_id: datax.id,
        //                                 map_product_store_list_id: product.map_product_store_list_id,
        //                                 price: product.price,
        //                                 not_sell: (product.not_sell=='Y'?'Y':'N'),

        //                                 promotion_id: (product.promotion_id>0?product.promotion_id:0),
        //                                 special_price: product.special_price,
        //                                 daterange: (product.daterange!="null"?product.daterange:null),

        //                                 qty_start: product.qty_start,
        //                                 qty_in: product.qty_in,
        //                                 qty_out: product.qty_out,
        //                                 stock: product.stock,

        //                                 qty_start2: product.qty_start2,
        //                                 qty_in2: product.qty_in2,
        //                                 qty_out2: product.qty_out2,
        //                                 stock2: product.stock2,

        //                                 qty_start3: product.qty_start3,
        //                                 qty_in3: product.qty_in3,
        //                                 qty_out3: product.qty_out3,
        //                                 stock3: product.stock3,

        //                                 qty_start4: product.qty_start4,
        //                                 qty_in4: product.qty_in4,
        //                                 qty_out4: product.qty_out4,
        //                                 stock4: product.stock4,

        //                                 note: (product.note!="null"?product.note:null),
        //                                 isActive: 'Y'
        //                             });
        //                         }
        //                     }
        //                 }
        //             }
        //         }
                
        //     }
        // }
        const PricePromotionList = await db.PricePromotionList.findOne({
            where: { 
                id: req.body.id
            }
        });
        if (PricePromotionList.pricepromotion_id > 0) {
            const PricePromotion = await db.PricePromotion.findOne({
                where: { 
                    id: PricePromotionList.pricepromotion_id
                },
                include: [
                    {
                        model: db.MapProductStore,
                        as: 'mapProductStore', // ชื่อ alias ที่ตั้งไว้ใน model
                        required: false, // เลือกเฉพาะฟิลด์ที่ต้องการ (เช่น name)
                    },
                    {
                        model: db.Store,
                        as: 'store', // ชื่อ alias ที่ตั้งไว้ใน model
                        required: false, // เลือกเฉพาะฟิลด์ที่ต้องการ (เช่น name)
                    },
                ]
            });
            const query = `
            SELECT 
                tb_map_user_store_list.store_id
                FROM tb_map_user_store_list
                LEFT JOIN tb_store AS store ON tb_map_user_store_list.store_id = store.id
                WHERE tb_map_user_store_list.user_id = '${PricePromotion.user_id}' 
                AND tb_map_user_store_list.store_id != '${PricePromotion.store_id}'
                AND store.group_customer_id = '${PricePromotion.store.group_customer_id}'
                AND store.account_id = '${PricePromotion.store.account_id}'
                AND store.account_type_id = '${PricePromotion.store.account_type_id}'
                GROUP BY tb_map_user_store_list.store_id
                ORDER BY tb_map_user_store_list.store_id ASC;
            `;
    
            // // ✅ Execute Query
            const rawData = await db.sequelize.query(query, { type: db.Sequelize.QueryTypes.SELECT });
            if(rawData.length>0){
                for (const product of rawData) {
                    const count = await db.PricePromotion.count({
                        where: {
                            group_id: PricePromotion.group_id,
                            store_id: product.store_id,
                            datenow: PricePromotion.datenow,
                            datesave: PricePromotion.datesave,
                            user_id: PricePromotion.user_id,
                        }
                    });
                    if (count === 0) {
                        const datax = await db.PricePromotion.create(
                            { 
                                group_id: PricePromotion.group_id,
                                store_id: product.store_id,
                                datenow: PricePromotion.datenow,
                                datesave: PricePromotion.datesave,
                                user_id: PricePromotion.user_id,
                            }
                        );
                        if(datax.id > 0){
                            const productList = await db.PricePromotionList.findAll({
                                where: { pricepromotion_id: PricePromotion.id }
                            });
                            if(productList){
                                for (const product of productList) {
                                    await db.PricePromotionList.create({
                                        pricepromotion_id: datax.id,
                                        map_product_store_list_id: product.map_product_store_list_id,
                                        isActive: 'Y'
                                    });
                                }
                            }
                        }
                    }
                }
                
            }
        }
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลได้ในตอนนี้!" });
    }
}
async function delete_image_price(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }
    try {
        const existingRecord = await db.PricePromotionList.findOne({ where: { id: req.body.id } });
        
        // ถ้ามีภาพใหม่ ให้ต่อเข้ากับภาพเดิม
        if(existingRecord){
            let updatedPictures = existingRecord.picture ? existingRecord.picture.split(',') : [];

            // ลบชื่อไฟล์ที่ส่งมาจาก req.body.name ออกจากรายการ
            if (req.body.name) {
                const filesToRemove = Array.isArray(req.body.name) ? req.body.name : [req.body.name]; // รองรับทั้งแบบ array และ string
                updatedPictures = updatedPictures.filter(pic => !filesToRemove.includes(pic));
            }

            // แปลง array กลับเป็น string คั่นด้วย comma
            const updatedPicturesString = updatedPictures.join(',');
            await db.PricePromotionList.update({
                picture: updatedPicturesString  // อัปเดต picture ที่มีการรวมภาพใหม่เข้ากับภาพเดิม
            }, {
                where: { id: req.body.id }
            });
        }
        res.send({ status: "success", message: "ลบเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลได้ในตอนนี้!" });
    }
}
// async function createOrUpdate_PricePromotionList(req, res) {
//     const error = validation(req);
//     if (error) {
//         return res.status(422).json(error);
//     }
//     try {
//         const whereConditions = {};
//         if (req.body.group_id) whereConditions.group_id = req.body.group_id;
//         if (req.body.datenow) whereConditions.datesave = req.body.datenow;

//         const whereConditions2 = {};
//         if (req.body.group_id) whereConditions2.group_id = req.body.group_id;
//         if (req.body.datesave) whereConditions2.datesave = req.body.datesave;

//         const count = await db.PricePromotion.count({
//             where: {
//                 group_id: req.body.group_id,
//                 datesave: req.body.datesave
//             }
//         });
//         let data;
//         if (count == 0) {
//             const datex = new Date(req.body.datesave);
//             const formattedDate = datex.getFullYear() + "-" +
//                       String(datex.getMonth() + 1).padStart(2, '0') + "-" +
//                       String(datex.getDate()).padStart(2, '0');
//             let dataz = await db.PricePromotion.create({
//                 group_id: req.body.group_id,
//                 datenow: req.body.datenow,
//                 datesave: formattedDate,
//             });
            
//             const productList = await db.MapProductStoreList.findAll({
//                 where: { map_product_id: req.body.group_id }
//             });
        
//             for (const product of productList) {
//                 await db.PricePromotionList.create({
//                     pricepromotion_id: dataz.id,
//                     map_product_store_list_id: product.id,
//                     stock: req.body.stock || 0,
//                     note: req.body.note || '',
//                 });
//             }
        
//             data = await db.PricePromotion.findOne({
//                 where: whereConditions2,
//                 order: [['id', 'DESC']],
//                 include: [{
//                     model: db.PricePromotionList,
//                     as: 'pricePromotionDetails',
//                     include: [{
//                         model: db.MapProductStoreList,
//                         as: 'mapProductStoreList',
//                         include: [{
//                             model: db.Product,
//                             as: 'product',
//                             attributes: ['name']
//                         }]
//                     }]
//                 }]
//             });
//         } else {
//             // ส่งข้อความแจ้งว่าข้อมูลมีอยู่แล้ว
//             return res.send({ status: "error", message: "ข้อมูลนี้มีอยู่แล้ว", body: req.body });
//         }
//         // ตรวจสอบว่ามีไฟล์ picture อยู่ในคำขอ
//         const uploadedFiles = [];
//         // if (req.files && req.files.picture && req.files.picture !== 'undefined') {
//         //     const licenseCopies = Array.isArray(req.files.picture) ? req.files.picture : [req.files.picture];
            
    
//         //     for (let image_game of licenseCopies) {
//         //         let ext = image_game.name.split('.').pop().toLowerCase();
//         //         if (['jpg', 'jpeg', 'png'].includes(ext)) {
//         //             var today = new Date();
//         //             var date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}-${today.getHours()}${today.getMinutes()}${today.getSeconds()}`;
//         //             var new_name = `${date}-${image_game.name}`;
//         //             var savePath = `./images/banner/${new_name}`;
        
//         //             try {
//         //                 await image_game.mv(savePath);
//         //                 uploadedFiles.push(`images/banner/${new_name}`);
//         //             } catch (error) {
//         //                 return res.status(500).send({ status: 'error', msg: 'File save failed', error });
//         //             }
//         //         } else {
//         //             return res.status(500).send({ status: 'error', msg: 'Invalid file type' });
//         //         }
//         //     }
    
            
//         // } else {
//         //     //console.log("No valid picture files were uploaded or picture is undefined");
//         // }

//         // if (req.body.id > 0) {
//         //     const existingRecord = await db.PricePromotionList.findOne({ where: { id: req.body.id } });
            
//         //     // ถ้ามีภาพใหม่ ให้ต่อเข้ากับภาพเดิม
//         //     let updatedPictures = existingRecord.picture || '';
//         //     if (uploadedFiles.length > 0) {
//         //         updatedPictures = updatedPictures ? `${updatedPictures},${uploadedFiles.join(',')}` : uploadedFiles.join(',');
//         //     }
//         //     await db.PricePromotionList.update({
//         //         price: req.body.price,
//         //         // promotion_id: req.body.promotion_id,
//         //         special_price: req.body.special_price,
//         //         daterange: req.body.daterange,
//         //         qty_in: req.body.qty_in,
//         //         qty_out: req.body.qty_out,
//         //         stock: req.body.stock,
//         //         note: req.body.note,
//         //         picture: updatedPictures  // อัปเดต picture ที่มีการรวมภาพใหม่เข้ากับภาพเดิม
//         //     }, {
//         //         where: { id: req.body.id }
//         //     });
            
//         //     await db.PricePromotion.update({
//         //         datesave: req.body.datesave,
//         //     }, {
//         //         where: { id: existingRecord.pricepromotion_id }
//         //     });
//         // }
//         res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย", body: req.body, count: count, data: data });
//     } catch (err) {
//         res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลได้ในตอนนี้!" });
//     }
// }
//get all PricePromotionList
async function get_all_PricePromotionList(req, res) {
    try {
        let data = await db.PricePromotionList.findAll({
            include: [
                {
                    model: db.PricePromotion,
                    as: 'pricePromotion', // ชื่อ alias ที่ตั้งไว้ใน model
                    required: false, // เลือกเฉพาะฟิลด์ที่ต้องการ (เช่น name)
                },
                {
                    model: db.Product,
                    as: 'product', // ชื่อ alias ที่ตั้งไว้ใน model
                    required: false, // เลือกเฉพาะฟิลด์ที่ต้องการ (เช่น name)
                },
            ],
        });
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

async function get_all_PricePromotionList_filter(req, res) {
    try {
        // ตรวจสอบว่าค่าต่าง ๆ มีใน req.body หรือไม่
        const whereConditions = {};
        if (req.body.account_id) whereConditions.account_id = req.body.account_id;
        if (req.body.account_type_id) whereConditions.account_type_id = req.body.account_type_id;
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        //console.log(whereConditions);
        let data = await db.PricePromotionList.findAll({
            include: [
                {
                    model: db.PricePromotion,
                    as: 'pricePromotion', // ชื่อ alias ที่ตั้งไว้ใน model
                    required: Object.keys(whereConditions).length > 0, // ถ้ามีเงื่อนไขจะทำให้การ join เป็น inner join
                    where: whereConditions,
                },
                {
                    model: db.Product,
                    as: 'product', // ชื่อ alias ที่ตั้งไว้ใน model
                    required: false,
                },
            ],
        });
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//get PricePromotionList by id
async function get_PricePromotionList_by_id(req, res) {
    try {
        let data = await db.PricePromotionList.findByPk(req.params.id);

        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//update PricePromotionList
async function update_PricePromotionList(req, res) {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.PricePromotionList.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.PricePromotionList.update(req.body, { where: { id: req.params.id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

}

//update PricePromotionList isActive
async function update_PricePromotionList_isActive(req, res) {
    const id = req.params.id;
    const error = validation(req, ['isActive']);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.PricePromotionList.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.PricePromotionList.update(req.body, { where: { id: id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }
}

module.exports = {

    //exprot function
    create_PricePromotionList,
    createOrUpdate_PricePromotionList,
    createOrUpdate_PricePromotionList_dup,
    createOrUpdate_PricePromotion,
    get_all_PricePromotionList,
    get_all_PricePromotionList_filter,
    get_PricePromotionList_by_id,
    update_PricePromotionList,
    update_PricePromotionList_isActive,
    delete_image_price,


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
