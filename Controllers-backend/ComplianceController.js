const db = require("../models")

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op
const fs = require('fs');
const path = require('path');

// 🌟 ดึง Model Task และ TaskAssignment มาใช้งานในไฟล์นี้ด้วย
const Task = db.Task || db.tasks; 
const TaskAssignment = db.TaskAssignment || db.task_assignments;

// function create Compliance
async function create_Compliancebk(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }
    try {
        const { store_id, position_name} = req.body;
        const dataStore = await db.MapUserStorelist.findOne({ where: { store_id } });
        
        if (position_name !== "พนักงาน" && dataStore) {
            req.body.user_id = dataStore.user_id;
        }
        const whereConditions = {};
        if (req.body.account_id) whereConditions.account_id = req.body.account_id;
        if (req.body.account_type_id) whereConditions.account_type_id = req.body.account_type_id;
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        if (req.body.user_id) whereConditions.user_id = req.body.user_id;
        const count = await db.Compliance.count({
            where: {
                account_id: req.body.account_id,
                account_type_id: req.body.account_type_id,
                group_customer_id: req.body.group_customer_id,
                user_id: req.body.user_id
            }
        });
        //console.log(count);
        if(count == 0){
            var data = await db.Compliance.create(req.body)
            //console.log(data);
        }else{
            const whereConditions = {};
            if (req.body.account_id) whereConditions.account_id = req.body.account_id;
            if (req.body.account_type_id) whereConditions.account_type_id = req.body.account_type_id;
            if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
            //console.log(whereConditions);
            var data = await db.Compliance.findOne({ where: whereConditions });
        }
        
        res.send({ status: "success", message: "เพิ่มข้อมูลเรียบร้อย", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
    }
}
async function create_Compliance(req, res) {
    try {
        const { store_id, position_name} = req.body;
        const dataStore = await db.MapUserStorelist.findOne({ where: { store_id } });
        
        if (position_name !== "พนักงาน" && dataStore) {
            req.body.user_id = dataStore.user_id;
        }
        const whereConditions = {};
        if (req.body.store_id) whereConditions.store_id = req.body.store_id;
        if (req.body.datenow) whereConditions.datesave = req.body.datenow;
        if (req.body.user_id) whereConditions.user_id = req.body.user_id;

        const whereConditions2 = {};
        if (req.body.store_id) whereConditions2.store_id = req.body.store_id;
        if (req.body.datesave) whereConditions2.datesave = req.body.datesave;
        if (req.body.user_id) whereConditions2.user_id = req.body.user_id;

        const count = await db.Compliance.count({
            where: {
                store_id: req.body.store_id,
                datesave: req.body.datesave,
                user_id: req.body.user_id,

            }
        });
        
        let data;
        if (count === 0) {
            let dataz = await db.Compliance.create({
                store_id: req.body.store_id,
                datenow: req.body.datenow,
                datesave: req.body.datesave,
                user_id: req.body.user_id,

            });
        }

        data = await db.Compliance.findOne({
            where: whereConditions2,
            order: [['id', 'DESC']],
            include: [{
                model: db.ComplianceList,
                as: 'complianceDetails',
            }]
        });
        // หา specificDisabledDates สำหรับ 7 วันที่ผ่านมา
        const specificDisabledDates = [];
        const targetDate = new Date(req.body.datenow);

        for (let i = 1; i <= 7; i++) {
            const dateToCheck = new Date(targetDate);
            dateToCheck.setDate(targetDate.getDate() - i);
            const formattedDate = dateToCheck.toISOString().split('T')[0];
            const dateExists = await db.Compliance.count({
                where: {
                    store_id: req.body.store_id,
                    datenow: formattedDate,
                    user_id: req.body.user_id
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
                            report_type: 'Price' // 🌟 เปลี่ยนชื่อให้ตรงกับเมนู (เช่น 'Offtake', 'Stock')
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
async function create_Compliance2(req, res) {
    try {
        const { store_id, position_name} = req.body;
        const dataStore = await db.MapUserStorelist.findOne({ where: { store_id } });
        
        if (position_name !== "พนักงาน" && dataStore) {
            req.body.user_id = dataStore.user_id;
        }
        const whereConditions = {};
        if (req.body.store_id) whereConditions.store_id = req.body.store_id;
        if (req.body.datenow) whereConditions.datesave = req.body.datenow;
        if (req.body.user_id) whereConditions.user_id = req.body.user_id;

        const whereConditions2 = {};
        if (req.body.store_id) whereConditions2.store_id = req.body.store_id;
        if (req.body.datesave) whereConditions2.datesave = req.body.datesave;
        if (req.body.user_id) whereConditions2.user_id = req.body.user_id;

        const count = await db.Complianceextra.count({
            where: {
                store_id: req.body.store_id,
                datesave: req.body.datesave,
                user_id: req.body.user_id,

            }
        });
        
        let data;
        if (count === 0) {
            let dataz = await db.Complianceextra.create({
                store_id: req.body.store_id,
                datenow: req.body.datenow,
                datesave: req.body.datesave,
                user_id: req.body.user_id,

            });
        }

        data = await db.Complianceextra.findOne({
            where: whereConditions2,
            order: [['id', 'DESC']],
            include: [{
                model: db.ComplianceListextra,
                as: 'complianceextraDetails',
            }]
        });
        // หา specificDisabledDates สำหรับ 7 วันที่ผ่านมา
        const specificDisabledDates = [];
        const targetDate = new Date(req.body.datenow);

        for (let i = 1; i <= 7; i++) {
            const dateToCheck = new Date(targetDate);
            dateToCheck.setDate(targetDate.getDate() - i);
            const formattedDate = dateToCheck.toISOString().split('T')[0];
            const dateExists = await db.Complianceextra.count({
                where: {
                    store_id: req.body.store_id,
                    datenow: formattedDate,
                    user_id: req.body.user_id
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
                            report_type: 'Extra Compliance' // 🌟 เปลี่ยนชื่อให้ตรงกับเมนู (เช่น 'Offtake', 'Stock')
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
//get all Compliance

async function get_all_Compliance_bk(req, res) {
    try {
      const { store_id, user_id: input_user_id, position_name, datesave, datenow } = req.body;
  
      // ✅ ดึง user_id หากไม่ใช่ "พนักงาน"
      let user_id = input_user_id;
      if (position_name !== "พนักงาน") {
        const dataStore = await db.MapUserStorelist.findOne({ where: { store_id } });
        user_id = dataStore?.user_id || input_user_id;
      }
  
      // ✅ เงื่อนไขค้นหา
      const whereConditions = { store_id, datesave, user_id };
      const whereStore = { store_id };
  
      // ✅ ตรวจสอบว่ามี Compliance หรือยัง
      const count = await db.Compliance.count({ where: whereConditions });
  
      const projectRoot = path.join(__dirname, '../');
      let data;
  
      // ✅ ถ้ายังไม่มี ให้สร้างใหม่
      if (count === 0) {
        const newCompliance = await db.Compliance.create({ store_id, datenow, datesave, user_id });
  
        const previousCompliance = await db.Compliance.findOne({
          where: { store_id, datesave: datenow, user_id }
        });
  
        const productList = previousCompliance
          ? await db.ComplianceList.findAll({ where: { compliance_id: previousCompliance.id } })
          : await db.MapStoreComplianceList.findAll({
              where: {},
              include: [{ model: db.MapStoreCompliance, as: 'mapStoreCompliance', where: whereStore }]
            });
  
        for (const product of productList) {
          await db.ComplianceList.create({
            compliance_id: newCompliance.id,
            map_storecompliance_list_id: product.map_storecompliance_list_id || product.id,
            placement_point_id: product.placement_point_id || 0,
            rental_area_unit_name: product.rental_area_unit_name || 0,
            qty: product.qty || 0,
            rental_area_unit_id: product.rental_area_unit_id || 0,
            isActive: 'Y'
          });
        }
      }
  
      // ✅ ดึง Compliance พร้อมรายละเอียด
      data = await db.Compliance.findOne({
        where: whereConditions,
        order: [['id', 'DESC']],
        include: [
          {
            model: db.ComplianceList,
            as: 'complianceDetails',
            include: [
              {
                model: db.MapStoreComplianceList,
                as: 'mapStoreComplianceList',
                required: true,
                include: [
                  {
                    model: db.Product,
                    as: 'product',
                    required: false,
                    include: [
                      { model: db.Brand, as: 'brand', required: false },
                      { model: db.SubBrand, as: 'subBrand', required: false }
                    ]
                  },
                  {
                    model: db.MapStoreCompliance,
                    as: 'mapStoreCompliance',
                    required: false,
                    where: whereStore
                  }
                ]
              }
            ]
          },
          { model: db.Store, as: 'store', required: false }
        ]
      });
  
      // ✅ กรอง complianceDetails ตามวันที่ หลังจาก join เสร็จแล้ว
      // แปลง req.body.datesave เป็น Date
        const datesavex = new Date(req.body.datesave);

        // กรอง complianceDetails ที่วันที่ไม่อยู่ในช่วง
        if (data && Array.isArray(data.complianceDetails)) {
            const datesavex = new Date(req.body.datesave);
            data.complianceDetails = data.complianceDetails.filter(detail => {
              const start = detail.mapStoreComplianceList?.startdate;
              const end = detail.mapStoreComplianceList?.enddate;
          
              if (!start || !end) return false;
          
              const startDate = new Date(start);
              const endDate = new Date(end);
              return datesavex >= startDate && datesavex <= endDate;
            });
          
            // ถ้าไม่มี complianceDetails ที่ตรงช่วงวันที่เลย → ส่งข้อมูลว่างกลับ
            if (data.complianceDetails.length === 0) {
              return res.send({ status: "success", data: null, specificDisabledDates: [] });
            }
        }
        //   data.complianceDetails = data.complianceDetails.filter((detail) => {
        //     const { startdate, enddate } = detail.mapStoreComplianceList || {};
        //     return datesave >= startdate && datesave <= enddate;
        //   });
  
      // ✅ เติม user_list และภาพ
      await Promise.all(
        data.complianceDetails.map(async (detail) => {
          const rental_area_unit_id = detail.rental_area_unit_id;
  
          if (rental_area_unit_id) {
            const unit = await db.RentalAreaUnit.findOne({ where: { id: rental_area_unit_id } });
            const user_list = await db.RentalAreaUnit.findAll({
              where: { name: unit?.name || '', group_customer_id: unit?.group_customer_id || 0 }
            });
            detail.dataValues.user_list = user_list;
          } else {
            detail.dataValues.user_list = [];
          }
  
          // ✅ ภาพ
          const imageDetails = await db.ComplianceListImages.findAll({
            where: { compliance_list_id: detail.id },
            attributes: ['id', 'compliance_list_id', 'week', 'filename', 'datecreate', 'dateupdate'],
            order: [['id', 'ASC']]
          });
  
          const imagesByWeek = Array.from({ length: 4 }, (_, i) => ({ week: i + 1, files: [] }));
          for (const image of imageDetails) {
            const pathImage = path.resolve(projectRoot, image.filename.trim());
            try {
              const imageData = await fs.promises.readFile(pathImage);
              imagesByWeek[image.week - 1].files.push({
                ...image.dataValues,
                url: `data:image/jpeg;base64,${imageData.toString('base64')}`
              });
            } catch (err) {
              console.error(`อ่านรูปไม่ได้: ${image.filename}`, err.message);
            }
          }
  
          detail.dataValues.imageDetails = imagesByWeek;
  
          // ✅ รูปสินค้า
          const product = detail.mapStoreComplianceList?.product;
          if (product && product.picture) {
            const base64Images = await Promise.all(
              product.picture.split(',').map(async (pic) => {
                try {
                  const imagePath = path.resolve(projectRoot, pic.trim());
                  const imageData = await fs.promises.readFile(imagePath);
                  return {
                    url: `data:image/jpeg;base64,${imageData.toString('base64')}`,
                    name: path.basename(pic.trim()),
                    id: product.id
                  };
                } catch (err) {
                  return null;
                }
              })
            );
            product.dataValues.picture = base64Images.filter(Boolean);
          } else {
            product.dataValues.picture = [];
          }
        })
      );
  
      // ✅ วันที่ที่ไม่สามารถเลือกได้ (7 วันย้อนหลัง)
      const specificDisabledDates = [];
      const targetDate = new Date(datesave);
      for (let i = 1; i <= 7; i++) {
        const d = new Date(targetDate);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const exists = await db.Compliance.count({ where: { store_id, datesave: dateStr, user_id } });
        if (!exists) specificDisabledDates.push(dateStr);
      }
  
      res.send({ status: "success", data, specificDisabledDates });
    } catch (err) {
      res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
  
async function get_all_Compliance(req, res) {
    try {
        const { store_id, user_id, position_name, datesave, datenow } = req.body;
        const dataStore = await db.MapUserStorelist.findOne({ where: { store_id } });
        
        if (position_name !== "พนักงาน" && dataStore) {
            req.body.user_id = dataStore.user_id;
        }
        const validProducts = await db.MapStoreComplianceList.findAll({
            include: [
                {
                    model: db.MapStoreCompliance,
                    as: 'mapStoreCompliance',
                    where: { store_id }
                },
                {
                    model: db.Product,
                    as: 'product',
                    required: true // Ensures product exists
                }
            ]
        });
        const dateToCheck = new Date(datesave);
        const filteredValidProducts = validProducts.filter(item => {
            const start = item.startdate;
            const end = item.enddate;
            if (!start || !end) return false;
            return new Date(start) <= dateToCheck && dateToCheck <= new Date(end);
        });
        if (filteredValidProducts.length === 0) {
            return res.send({
                status: "no_valid_products",
                message: "ไม่มีสินค้าในช่วงวันที่ที่เลือก",
                data: null,
                specificDisabledDates: []
            });
        }

        const whereConditions = {};
        const whereConditions2 = {};
        if (req.body.store_id) {
            whereConditions2.store_id = req.body.store_id;
        }
        if (req.body.datesave) {
            whereConditions.datesave = req.body.datesave;
        }
        if (req.body.user_id) {
            whereConditions.user_id = req.body.user_id;
        }
        const datastore_id = await db.MapStoreCompliance.findOne({
            where: { 
                store_id: req.body.store_id
            }
        });
        // //console.log(datastore_id)
        // return false;

        const count = await db.Compliance.count({
            where: {
                store_id: req.body.store_id,
                // datenow: req.body.datenow,
                datesave: req.body.datesave,
                user_id: req.body.user_id,
            }
        });

        const projectRoot = path.join(__dirname, '../');
        let data;
        
        if (count === 0) {
            //console.log(1);
            const datax = await db.Compliance.create(
                { 
                    store_id: req.body.store_id,
                    datenow: req.body.datenow,
                    datesave: req.body.datesave,
                    user_id: req.body.user_id,
                }
            );
            const countdataCompliance = await db.Compliance.count({where: {
                store_id: req.body.store_id,
                datesave: req.body.datenow,
                user_id: req.body.user_id,
            }});
            if(countdataCompliance > 0){
                //console.log(2);
                const dataCompliance = await db.Compliance.findOne({
                    where: { 
                        store_id: req.body.store_id,
                        datesave: req.body.datesave,
                        user_id: req.body.user_id,
                    }
                });
                const productList = await db.ComplianceList.findAll({
                    where: { compliance_id: dataCompliance.id }
                });
                if(productList.length > 0){
                    //console.log(3);
                    for (const product of productList) {
                        const productStart = product.startdate;
                        const productEnd = product.enddate;
                        const currentDate = new Date(req.body.datesave);

                        if (
                            productStart && productEnd &&
                            new Date(productStart) <= currentDate &&
                            currentDate <= new Date(productEnd)
                        ) {
                            await db.ComplianceList.create({
                                compliance_id: datax.id,
                                map_storecompliance_list_id: product.map_product_store_list_id,
                                placement_point_id: product.placement_point_id || 0,
                                rental_area_unit_name: product.rental_area_unit_name || 0,
                                qty: product.qty || 0,
                                rental_area_unit_id: product.rental_area_unit_id || 0,
                                isActive: 'Y'
                            });
                        }
                    }
                }else{
                    //console.log(4);
                    const productList = await db.MapStoreComplianceList.findAll({
                        include: [
                            { 
                                model: db.MapStoreCompliance, 
                                as: 'mapStoreCompliance', 
                                where: { 
                                    store_id: req.body.store_id,
                                },
                            },
                        ],
                    });
                    for (const product of productList) {
                        const productStart = product.startdate;
                        const productEnd = product.enddate;
                        const currentDate = new Date(req.body.datesave);

                        if (
                            productStart && productEnd &&
                            new Date(productStart) <= currentDate &&
                            currentDate <= new Date(productEnd)
                        ) {
                            await db.ComplianceList.create({
                                compliance_id: dataCompliance.id,
                                map_storecompliance_list_id: product.id,
                                placement_point_id: product.placement_point_id || 0,
                                rental_area_unit_name: product.rental_area_unit_name || 0,
                                qty: product.qty || 0,
                                rental_area_unit_id: product.rental_area_unit_id || 0,
                                isActive: 'Y'
                            });
                        }
                    }
                }
                
            }else{
                
                const productList = await db.MapStoreComplianceList.findAll({
                    include: [
                        { 
                            model: db.MapStoreCompliance, 
                            as: 'mapStoreCompliance', 
                            where: { 
                                store_id: req.body.store_id,
                            },
                        },
                    ],
                });
                for (const product of productList) {
                    const productStart = product.startdate;
                    const productEnd = product.enddate;
                    const currentDate = new Date(req.body.datesave);

                    if (
                        productStart && productEnd &&
                        new Date(productStart) <= currentDate &&
                        currentDate <= new Date(productEnd)
                    ) {
                        await db.ComplianceList.create({
                            compliance_id: datax.id,
                            map_storecompliance_list_id: product.id,
                            placement_point_id: product.placement_point_id || 0,
                            rental_area_unit_name: product.rental_area_unit_name || 0,
                            qty: product.qty || 0,
                            rental_area_unit_id: product.rental_area_unit_id || 0,
                            isActive: 'Y'
                        });
                    }
                }
            }
            

            

            data = await db.Compliance.findOne({
                where: whereConditions,
                order: [['id', 'DESC']],
                include: [{
                    model: db.ComplianceList,
                    as: 'complianceDetails',
                    include: [{
                        model: db.MapStoreComplianceList,
                        as: 'mapStoreComplianceList',
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
                        },{
                            model: db.MapStoreCompliance,
                            as: 'mapStoreCompliance',
                            required: false,
                            where:whereConditions2
                        }]
                    }]
                }]
            });
            const datesavex = new Date(req.body.datesave);

            // กรอง complianceDetails ที่วันที่ไม่อยู่ในช่วง
            if (data && Array.isArray(data.complianceDetails)) {
                const datesavex = new Date(req.body.datesave);
                data.complianceDetails = data.complianceDetails.filter(detail => {
                const start = detail.mapStoreComplianceList?.startdate;
                const end = detail.mapStoreComplianceList?.enddate;
            
                if (!start || !end) return false;
            
                const startDate = new Date(start);
                const endDate = new Date(end);
                return datesavex >= startDate && datesavex <= endDate;
                });
            
                // ถ้าไม่มี complianceDetails ที่ตรงช่วงวันที่เลย → ส่งข้อมูลว่างกลับ
                if (data.complianceDetails.length === 0) {
                return res.send({ status: "success", data: null, specificDisabledDates: [] });
                }
            }
            await Promise.all(
                data.complianceDetails.map(async (ComplianceDetail) => {
                    const complianceListId = ComplianceDetail.id;
                    const product = ComplianceDetail.mapStoreComplianceList.product;
                    const rental_area_unit_id = ComplianceDetail.rental_area_unit_id;
            
                    // ตรวจสอบว่า rental_area_unit_id มีค่า
                    if (!rental_area_unit_id) {
                        ComplianceDetail.dataValues.user_list = [];
                        return;
                    }
            
                    // ค้นหา datastore_id จาก rental_area_unit_id
                    const datastore_id = await db.RentalAreaUnit.findOne({
                        where: { id: rental_area_unit_id }
                    });
            
                    // ตรวจสอบว่าพบ datastore_id หรือไม่
                    if (!datastore_id || !datastore_id.id) {
                        ComplianceDetail.dataValues.user_list = [];
                        return;
                    }
            
                    // ดึงข้อมูล RentalAreaUnit ที่มี datastore_id และ name ตรงกัน
                    const datastore_id2 = await db.RentalAreaUnit.findAll({
                        where: { 
                            id: datastore_id.id, 
                            name: datastore_id.name
                        }
                    });
            
                    ComplianceDetail.dataValues.user_list = datastore_id2 ? datastore_id2 : [];
            
                    // ดึงข้อมูลรูปภาพสำหรับแต่ละ week
                    const imageDetails = await db.ComplianceListImages.findAll({
                        where: { compliance_list_id: complianceListId },
                        attributes: ['id','compliance_list_id','week', 'filename', 'datecreate', 'dateupdate'],
                        order: [['id', 'ASC']],
                    });

                    // จัดรูปแบบข้อมูลรูปภาพให้เป็น array ของแต่ละ week
                    const imagesByWeek = Array.from({ length: 4 }, (_, i) => ({
                        week: i + 1,
                        files: []
                    }));

                    await Promise.all(
                        imageDetails.map(async (image) => {
                            const imagePath = path.resolve(projectRoot, image.filename.trim());
                            try {
                                const imageData = await fs.promises.readFile(imagePath);
                                const base64Data = `data:image/jpeg;base64,${imageData.toString('base64')}`;

                                imagesByWeek[image.week - 1].files.push({
                                    id: image.id,
                                    compliance_list_id: image.compliance_list_id,
                                    filename: image.filename,
                                    datecreate: image.datecreate,
                                    dateupdate: image.dateupdate,
                                    url: base64Data
                                });
                                // ✅ จัดเรียง `files` ตาม `id` ASC
                                imagesByWeek[image.week - 1].files.sort((a, b) => a.id - b.id);
                            } catch (err) {
                                console.error(`Error reading image (${image.filename}):`, err.message);
                            }
                        })
                    );

                    ComplianceDetail.dataValues.imageDetails = imagesByWeek;
                    
                    // แปลงรูปภาพเป็น Base64
                    if (product && product.picture) {
                        const picPaths = product.picture.split(',');
                        const base64Images = await Promise.all(
                            picPaths.map(async (picPath) => {
                                const imagePath = path.resolve(projectRoot, picPath.trim());
                                const fileName = path.basename(picPath.trim());
            
                                try {
                                    const imageData = await fs.promises.readFile(imagePath);
                                    return {
                                        // url: `data:image/jpeg;base64,${imageData.toString('base64')}`,
                                        name: fileName,
                                        id: product.id
                                    };
                                } catch (err) {
                                    console.error(`Error reading image (${fileName}):`, err.message);
                                    return null;
                                }
                            })
                        );
                        if(product.picture){
                            product.dataValues.picture = product.picture;
                        }else{
                            product.dataValues.picture = '';
                        }
                    }
                    
                })
            );
        } else {
            const Compliancedata = await db.Compliance.findOne({
                where: {
                    store_id: req.body.store_id,
                    datesave: req.body.datesave,
                    user_id: req.body.user_id,
                }
            });
            const countComplianceList = await db.ComplianceList.count({
                where: {
                    compliance_id: Compliancedata.id
                }
            });
            if(countComplianceList == 0){
                const productList = await db.MapStoreComplianceList.findAll({
                    include: [
                        { 
                            model: db.MapStoreCompliance, 
                            as: 'mapStoreCompliance', 
                            where: { 
                                store_id: req.body.store_id,
                            },
                        },
                    ],
                });
                for (const product of productList) {
                    const productStart = product.startdate;
                    const productEnd = product.enddate;
                    const currentDate = new Date(req.body.datesave);

                    if (
                        productStart && productEnd &&
                        new Date(productStart) <= currentDate &&
                        currentDate <= new Date(productEnd)
                    ) {
                        await db.ComplianceList.create({
                            compliance_id: Compliancedata.id,
                            map_storecompliance_list_id: product.id,
                            placement_point_id: product.placement_point_id || 0,
                            rental_area_unit_name: product.rental_area_unit_name || 0,
                            qty: product.qty || 0,
                            rental_area_unit_id: product.rental_area_unit_id || 0,
                            isActive: 'Y'
                        });
                    }
                }
            }
            data = await db.Compliance.findOne({
                where: whereConditions,
                order: [['id', 'DESC']],
                required: true,
                include: [{
                    model: db.ComplianceList,
                    as: 'complianceDetails',
                    include: [{
                        model: db.MapStoreComplianceList,
                        as: 'mapStoreComplianceList',
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
                        },{
                            model: db.MapStoreCompliance,
                            as: 'mapStoreCompliance',
                            required: false,
                            where:whereConditions2
                        }]
                    }]
                },{ model: db.Store, as: 'store', where: {id: req.body.store_id}, required: true },]
            });
            const datesavex = new Date(req.body.datesave);

            // กรอง complianceDetails ที่วันที่ไม่อยู่ในช่วง
            if (data && Array.isArray(data.complianceDetails)) {
                const datesavex = new Date(req.body.datesave);
                data.complianceDetails = data.complianceDetails.filter(detail => {
                const start = detail.mapStoreComplianceList?.startdate;
                const end = detail.mapStoreComplianceList?.enddate;
            
                if (!start || !end) return false;
            
                const startDate = new Date(start);
                const endDate = new Date(end);
                return datesavex >= startDate && datesavex <= endDate;
                });
            
                // ถ้าไม่มี complianceDetails ที่ตรงช่วงวันที่เลย → ส่งข้อมูลว่างกลับ
                if (data.complianceDetails.length === 0) {
                return res.send({ status: "success", data: null, specificDisabledDates: [] });
                }
            }
            await Promise.all(
                
                data.complianceDetails.map(async (ComplianceDetail) => {
                    const complianceListId = ComplianceDetail.id;
                    const product = ComplianceDetail.mapStoreComplianceList.product;
                    const rental_area_unit_id = ComplianceDetail.rental_area_unit_id;
                    const datastore_id = await db.RentalAreaUnit.findOne({
                        where: { 
                            id: rental_area_unit_id
                        }
                    });
                    const datastore_id2 = await db.RentalAreaUnit.findAll({
                        where: { 
                            group_customer_id: datastore_id.group_customer_id,
                            name: datastore_id.name,
                        }
                    });
                    if(datastore_id2){
                        ComplianceDetail.dataValues.user_list = datastore_id2;
                    }else{
                        ComplianceDetail.dataValues.user_list = [];
                    }

                    // ดึงข้อมูลรูปภาพสำหรับแต่ละ week
                    const imageDetails = await db.ComplianceListImages.findAll({
                        where: { compliance_list_id: complianceListId },
                        attributes: ['id','compliance_list_id','week', 'filename', 'datecreate', 'dateupdate'],
                        order: [['id', 'ASC']],
                    });

                    // จัดรูปแบบข้อมูลรูปภาพให้เป็น array ของแต่ละ week
                    const imagesByWeek = Array.from({ length: 4 }, (_, i) => ({
                        week: i + 1,
                        files: []
                    }));

                    await Promise.all(
                        imageDetails.map(async (image) => {
                            const imagePath = path.resolve(projectRoot, image.filename.trim());
                            try {
                                const imageData = await fs.promises.readFile(imagePath);
                                const base64Data = `data:image/jpeg;base64,${imageData.toString('base64')}`;

                                imagesByWeek[image.week - 1].files.push({
                                    id: image.id,
                                    compliance_list_id: image.compliance_list_id,
                                    filename: image.filename,
                                    datecreate: image.datecreate,
                                    dateupdate: image.dateupdate,
                                    url: base64Data
                                });
                                // ✅ จัดเรียง `files` ตาม `id` ASC
                                imagesByWeek[image.week - 1].files.sort((a, b) => a.id - b.id);
                            } catch (err) {
                                console.error(`Error reading image (${image.filename}):`, err.message);
                            }
                        })
                    );

                    ComplianceDetail.dataValues.imageDetails = imagesByWeek;

                    if (product && product.picture) {
                        const picPaths = product.picture.split(',');
                        const base64Images = await Promise.all(
                            picPaths.map(async (picPath) => {
                                const imagePath = path.resolve(projectRoot, picPath.trim());
                                const fileName = path.basename(picPath.trim());

                                try {
                                    const imageData = await fs.promises.readFile(imagePath);
                                    return {
                                        // url: `data:image/jpeg;base64,${imageData.toString('base64')}`,
                                        name: fileName,
                                        id: product.id
                                    };
                                } catch (err) {
                                    console.error(`Error reading image (${fileName}):`, err.message);
                                    return null;
                                }
                            })
                        );
                        if(product.picture){
                            product.dataValues.picture = product.picture;
                        }else{
                            product.dataValues.picture = '';
                        }
                    } 

                })
            );
        }
        
        const specificDisabledDates = [];
        const targetDate = new Date(req.body.datesave);

        for (let i = 1; i <= 7; i++) {
            const dateToCheck = new Date(targetDate);
            dateToCheck.setDate(targetDate.getDate() - i);
            const formattedDate = dateToCheck.toISOString().split('T')[0];

            const dateExists = await db.Compliance.count({
                where: {
                    store_id: req.body.store_id,
                    datesave: formattedDate,
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
            where: whereConditions,
            where2 : whereConditions2,
            // groupedData, // ส่งข้อมูลสินค้าเป็นกลุ่มตาม Brand และ SubBrand
            specificDisabledDates,
        });
    } catch (err) {
        res.status(500).send({
            status: "error",
            message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!",
            stack: err.stack // เพิ่มบรรทัดนี้เพื่อดูรายละเอียด error เช่น บรรทัดที่เกิดข้อผิดพลาด
        });
    }
}
async function get_all_Compliance2(req, res) {
    try {
        const { store_id, user_id, position_name, datesave, datenow } = req.body;
        const dataStore = await db.MapUserStorelist.findOne({ where: { store_id } });
        
        if (position_name != "พนักงาน" && dataStore) {
            req.body.user_id = dataStore.user_id;
        }
        // const validProducts = await db.MapStoreComplianceList.findAll({
        //     include: [
        //         {
        //             model: db.MapStoreCompliance,
        //             as: 'mapStoreCompliance',
        //             where: { store_id }
        //         },
        //         {
        //             model: db.Product,
        //             as: 'product',
        //             required: true // Ensures product exists
        //         }
        //     ]
        // });
        // const dateToCheck = new Date(datesave);
        // const filteredValidProducts = validProducts.filter(item => {
        //     const start = item.startdate;
        //     const end = item.enddate;
        //     if (!start || !end) return false;
        //     return new Date(start) <= dateToCheck && dateToCheck <= new Date(end);
        // });
        // if (filteredValidProducts.length === 0) {
        //     return res.send({
        //         status: "no_valid_products",
        //         message: "ไม่มีสินค้าในช่วงวันที่ที่เลือก",
        //         data: null,
        //         specificDisabledDates: []
        //     });
        // }
        
        
        const whereConditions = {};
        if (req.body.store_id) {
            whereConditions.store_id = req.body.store_id;
        }
        if (req.body.datesave) {
            whereConditions.datesave = req.body.datesave;
        }
        if (req.body.user_id) {
            whereConditions.user_id = req.body.user_id;
        }
        const projectRoot = path.join(__dirname, '../');
        // ตรวจสอบว่ามีข้อมูล Compliance หรือไม่
        let data = await db.Complianceextra.findOne({
            where: whereConditions,
            order: [['id', 'DESC']],
            include: [{
                model: db.ComplianceListextra,
                as: 'complianceextraDetails',
                where: {isActive: 'Y'},
                include: {
                    model: db.Product,
                    as: 'product',
                    required: false,
                    where: {isActive: 'Y'},
                    include: [
                        { model: db.Brand, as: 'brand', required: false },
                        { model: db.SubBrand, as: 'subBrand', required: false },
                    ],
                }
            },{ model: db.Store, as: 'store', required: false }]
        });
    
        // 🔥 ป้องกันข้อผิดพลาดถ้าไม่มีข้อมูล
        if (!data || !data.complianceextraDetails) {
            return res.send({
                status: "success",
                data: {complianceextraDetails:[]},
                specificDisabledDates: [],
            });
        }
        
        await Promise.all(
            data.complianceextraDetails.map(async (ComplianceextraDetail) => {
                
                const complianceListId = ComplianceextraDetail.id;
                const product = ComplianceextraDetail?.product;
                const rental_area_unit_id = ComplianceextraDetail.rental_area_unit_id;
                const datastore_id2 = [];
    
                const datastore_id = await db.RentalAreaUnit.findOne({
                    where: { 
                        id: rental_area_unit_id
                    }
                });
                if(datastore_id){
                        const datastore_id2 = await db.RentalAreaUnit.findAll({
                        where: { 
                            group_customer_id: datastore_id.group_customer_id,
                            id: datastore_id.id,
                        }
                    });
                }
                
                if(datastore_id2){
                    ComplianceextraDetail.dataValues.user_list = datastore_id2;
                }else{
                    ComplianceextraDetail.dataValues.user_list = [];
                }
    
                
                // //console.log("Fetched user_list:", ComplianceextraDetail.dataValues.user_list);
                // ดึงข้อมูลรูปภาพสำหรับแต่ละ week
                const imageDetails = await db.ComplianceListImagesextra.findAll({
                    where: { complianceextra_list_id: complianceListId },
                    attributes: ['id','complianceextra_list_id','week', 'filename', 'datecreate', 'dateupdate'],
                    order: [['id', 'ASC']],
                });
                //console.log("Fetched imageDetails:", imageDetails);
                // จัดรูปแบบข้อมูลรูปภาพให้เป็น array ของแต่ละ week
                const imagesByWeek = Array.from({ length: 4 }, (_, i) => ({
                    week: i + 1,
                    files: []
                }));

                await Promise.all(
                    imageDetails.map(async (image) => {
                        const imagePath = path.resolve(projectRoot, image.filename.trim());
                        try {
                            const imageData = await fs.promises.readFile(imagePath);
                            // const base64Data = `data:image/jpeg;base64,${imageData.toString('base64')}`;

                            imagesByWeek[image.week - 1].files.push({
                                id: image.id,
                                complianceextra_list_id: image.complianceextra_list_id,
                                filename: image.filename,
                                datecreate: image.datecreate,
                                dateupdate: image.dateupdate,
                                // url: base64Data
                            });
                            // ✅ จัดเรียง `files` ตาม `id` ASC
                            imagesByWeek[image.week - 1].files.sort((a, b) => a.id - b.id);
                        } catch (err) {
                            console.error(`Error reading image (${image.filename}):`, err.message);
                        }
                    })
                );

                ComplianceextraDetail.dataValues.imageDetails = imagesByWeek;
    
                if (product && product.picture) {
                    const picPaths = product.picture.split(',');
                    const base64Images = await Promise.all(
                        picPaths.map(async (picPath) => {
                            const imagePath = path.resolve(projectRoot, picPath.trim());
                            const fileName = path.basename(picPath.trim());
    
                            try {
                                const imageData = await fs.promises.readFile(imagePath);
                                return {
                                    // url: `data:image/jpeg;base64,${imageData.toString('base64')}`,
                                    name: fileName,
                                    id: product.id
                                };
                            } catch (err) {
                                console.error(`Error reading image (${fileName}):`, err.message);
                                return null;
                            }
                        })
                    );
                    product.dataValues.picture = base64Images.filter(img => img !== null);
                } else {
                    product.dataValues.picture = [];
                }
            })
        );
    
        res.send({
            status: "success",
            data: data,
            specificDisabledDates: [],
        });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.stack || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_Compliance2_bk(req, res) {
    try {
        const whereConditions = {};
        if (req.body.store_id) {
            whereConditions.store_id = req.body.store_id;
        }
        if (req.body.datesave) {
            whereConditions.datesave = req.body.datesave;
        }
        whereConditions.extra = '1';
        const datastore_id = await db.MapStoreCompliance.findOne({
            where: { 
                id: req.body.store_id
            }
        });

        const count = await db.Compliance.count({
            where: {
                store_id: req.body.store_id,
                // datenow: req.body.datenow,
                datesave: req.body.datesave
            }
        });

        const projectRoot = path.join(__dirname, '../');
        let data;
        
        if (count === 0) {
            const datax = await db.Compliance.create(
                { 
                    store_id: req.body.store_id,
                    datenow: req.body.datenow,
                    datesave: req.body.datesave,
                }
            );
            const countdataCompliance = await db.Compliance.count({where: {
                store_id: req.body.store_id,
                datesave: req.body.datenow
            }});
            if(countdataCompliance > 0){
                const dataCompliance = await db.Compliance.findOne({
                    where: { 
                        store_id: req.body.store_id,
                        datesave: req.body.datenow 
                    }
                });
                const productList = await db.ComplianceList.findAll({
                    where: { compliance_id: dataCompliance.id }
                });
                if(productList.length > 0){
                    for (const product of productList) {
                        await db.ComplianceList.create({
                            compliance_id: datax.id,
                            map_storecompliance_list_id: product.map_product_store_list_id,
                            placement_point_id: product.placement_point_id || 0,
                            rental_area_unit_name: product.rental_area_unit_name || 0,
                            qty: product.qty || 0,
                            rental_area_unit_id: product.rental_area_unit_id || 0,
                            isActive: 'Y'
                        });
                    }
                }else{
                    const productList = await db.MapStoreComplianceList.findAll({
                        where: { 
                            map_product_id: datastore_id.id,
                        }
                    });
                    for (const product of productList) {
                        await db.ComplianceList.create({
                            compliance_id: datax.id,
                            map_storecompliance_list_id: product.id,
                            placement_point_id: product.placement_point_id || 0,
                            rental_area_unit_name: product.rental_area_unit_name || 0,
                            qty: product.qty || 0,
                            rental_area_unit_id: product.rental_area_unit_id || 0,
                            isActive: 'Y'
                        });
                    }
                }
                
            }else{
                const productList = await db.MapStoreComplianceList.findAll({
                    where: { map_product_id: datastore_id.id, }
                });
                for (const product of productList) {
                    await db.ComplianceList.create({
                        compliance_id: datax.id,
                        map_storecompliance_list_id: product.id,
                        placement_point_id: product.placement_point_id || 0,
                        rental_area_unit_name: product.rental_area_unit_name || 0,
                        qty: product.qty || 0,
                        rental_area_unit_id: product.rental_area_unit_id || 0,
                        isActive: 'Y'
                    });
                }
            }
            

            

            data = await db.Compliance.findOne({
                where: whereConditions,
                order: [['id', 'DESC']],
                include: [{
                    model: db.ComplianceList,
                    as: 'complianceDetails',
                    include: [{
                        model: db.MapStoreComplianceList,
                        as: 'mapStoreComplianceList',
                        include: [{
                            model: db.Product,
                            as: 'product',
                            required: false,
                            include: [
                                { model: db.Brand, as: 'brand', required: false },
                                { model: db.SubBrand, as: 'subBrand', required: false },
                            ],
                        },{
                            model: db.MapStoreCompliance,
                            as: 'mapStoreCompliance',
                            required: false,
                        }]
                    }]
                }]
            });
            await Promise.all(
                data.complianceDetails.map(async (ComplianceDetail) => {
                    const complianceListId = ComplianceDetail.id;
                    const product = ComplianceDetail.mapStoreComplianceList.product;
                    const rental_area_unit_id = ComplianceDetail.rental_area_unit_id;
            
                    // ตรวจสอบว่า rental_area_unit_id มีค่า
                    if (!rental_area_unit_id) {
                        ComplianceDetail.dataValues.user_list = [];
                        return;
                    }
            
                    // ค้นหา datastore_id จาก rental_area_unit_id
                    const datastore_id = await db.RentalAreaUnit.findOne({
                        where: { id: rental_area_unit_id }
                    });
            
                    // ตรวจสอบว่าพบ datastore_id หรือไม่
                    if (!datastore_id || !datastore_id.datastore_id) {
                        ComplianceDetail.dataValues.user_list = [];
                        return;
                    }
            
                    // ดึงข้อมูล RentalAreaUnit ที่มี datastore_id และ name ตรงกัน
                    const datastore_id2 = await db.RentalAreaUnit.findAll({
                        where: { 
                            datastore_id: datastore_id.datastore_id, 
                            name: datastore_id.name
                        }
                    });
            
                    ComplianceDetail.dataValues.user_list = datastore_id2 ? datastore_id2 : [];
            
                    // ดึงข้อมูลรูปภาพสำหรับแต่ละ week
                    const imageDetails = await db.ComplianceListImages.findAll({
                        where: { compliance_list_id: complianceListId },
                        attributes: ['id','compliance_list_id','week', 'filename', 'datecreate', 'dateupdate'],
                        order: [['id', 'ASC']],
                    });

                    // จัดรูปแบบข้อมูลรูปภาพให้เป็น array ของแต่ละ week
                    const imagesByWeek = Array.from({ length: 4 }, (_, i) => ({
                        week: i + 1,
                        files: []
                    }));

                    await Promise.all(
                        imageDetails.map(async (image) => {
                            const imagePath = path.resolve(projectRoot, image.filename.trim());
                            try {
                                const imageData = await fs.promises.readFile(imagePath);
                                const base64Data = `data:image/jpeg;base64,${imageData.toString('base64')}`;

                                imagesByWeek[image.week - 1].files.push({
                                    id: image.id,
                                    compliance_list_id: image.compliance_list_id,
                                    filename: image.filename,
                                    datecreate: image.datecreate,
                                    dateupdate: image.dateupdate,
                                    url: base64Data
                                });
                            } catch (err) {
                                console.error(`Error reading image (${image.filename}):`, err.message);
                            }
                        })
                    );

                    ComplianceDetail.dataValues.imageDetails = imagesByWeek;
                    
                    // แปลงรูปภาพเป็น Base64
                    if (product && product.picture) {
                        const picPaths = product.picture.split(',');
                        const base64Images = await Promise.all(
                            picPaths.map(async (picPath) => {
                                const imagePath = path.resolve(projectRoot, picPath.trim());
                                const fileName = path.basename(picPath.trim());
            
                                try {
                                    const imageData = await fs.promises.readFile(imagePath);
                                    return {
                                        url: `data:image/jpeg;base64,${imageData.toString('base64')}`,
                                        name: fileName,
                                        id: product.id
                                    };
                                } catch (err) {
                                    console.error(`Error reading image (${fileName}):`, err.message);
                                    return null;
                                }
                            })
                        );
                        product.dataValues.picture = base64Images.filter(img => img !== null);
                    } else {
                        product.dataValues.picture = [];
                    }
                })
            );
        } else {
            data = await db.Compliance.findOne({
                where: whereConditions,
                order: [['id', 'DESC']],
                include: [{
                    model: db.ComplianceList,
                    as: 'complianceDetails',
                    include: [{
                        model: db.MapStoreComplianceList,
                        as: 'mapStoreComplianceList',
                        include: [{
                            model: db.Product,
                            as: 'product',
                            required: false,
                            include: [
                                { model: db.Brand, as: 'brand', required: false },
                                { model: db.SubBrand, as: 'subBrand', required: false },
                            ],
                        },{
                            model: db.MapStoreCompliance,
                            as: 'mapStoreCompliance',
                            required: false,
                        }]
                    }]
                }]
            });
            await Promise.all(
                
                data.complianceDetails.map(async (ComplianceDetail) => {
                    const complianceListId = ComplianceDetail.id;
                    const product = ComplianceDetail.mapStoreComplianceList.product;
                    const rental_area_unit_id = ComplianceDetail.rental_area_unit_id;
                    const datastore_id = await db.RentalAreaUnit.findOne({
                        where: { 
                            id: rental_area_unit_id
                        }
                    });
                    const datastore_id2 = await db.RentalAreaUnit.findAll({
                        where: { 
                            group_customer_id: datastore_id.group_customer_id,
                            name: datastore_id.name,
                        }
                    });
                    if(datastore_id2){
                        ComplianceDetail.dataValues.user_list = datastore_id2;
                    }else{
                        ComplianceDetail.dataValues.user_list = [];
                    }

                    // ดึงข้อมูลรูปภาพสำหรับแต่ละ week
                    const imageDetails = await db.ComplianceListImages.findAll({
                        where: { compliance_list_id: complianceListId },
                        attributes: ['id','compliance_list_id','week', 'filename', 'datecreate', 'dateupdate'],
                        order: [['id', 'ASC']],
                    });

                    // จัดรูปแบบข้อมูลรูปภาพให้เป็น array ของแต่ละ week
                    const imagesByWeek = Array.from({ length: 4 }, (_, i) => ({
                        week: i + 1,
                        files: []
                    }));

                    await Promise.all(
                        imageDetails.map(async (image) => {
                            const imagePath = path.resolve(projectRoot, image.filename.trim());
                            try {
                                const imageData = await fs.promises.readFile(imagePath);
                                const base64Data = `data:image/jpeg;base64,${imageData.toString('base64')}`;

                                imagesByWeek[image.week - 1].files.push({
                                    id: image.id,
                                    compliance_list_id: image.compliance_list_id,
                                    filename: image.filename,
                                    datecreate: image.datecreate,
                                    dateupdate: image.dateupdate,
                                    url: base64Data
                                });
                            } catch (err) {
                                console.error(`Error reading image (${image.filename}):`, err.message);
                            }
                        })
                    );

                    ComplianceDetail.dataValues.imageDetails = imagesByWeek;

                    if (product && product.picture) {
                        //console.log(product.picture);
                        const picPaths = product.picture.split(',');
                        const base64Images = await Promise.all(
                            picPaths.map(async (picPath) => {
                                const imagePath = path.resolve(projectRoot, picPath.trim());
                                const fileName = path.basename(picPath.trim());

                                try {
                                    const imageData = await fs.promises.readFile(imagePath);
                                    return {
                                        url: `data:image/jpeg;base64,${imageData.toString('base64')}`,
                                        name: fileName,
                                        id: product.id
                                    };
                                } catch (err) {
                                    console.error(`Error reading image (${fileName}):`, err.message);
                                    return null;
                                }
                            })
                        );
                        product.dataValues.picture = base64Images.filter(img => img !== null);
                    } else {
                        product.dataValues.picture = [];
                    }

                    // แปลงรูปภาพแต่ละ week เป็น Base64
                    // const pictureFields = ['picture_week1', 'picture_week2', 'picture_week3', 'picture_week4'];
                    // const dateCreateFields = ['datecreate_week1', 'datecreate_week2', 'datecreate_week3', 'datecreate_week4'];
                    // const dateupdateFields = ['dateupdate_week1', 'dateupdate_week2', 'dateupdate_week3', 'dateupdate_week4'];

                    // for (let i = 0; i < pictureFields.length; i++) {
                    //     const field = pictureFields[i];
                    //     const dateField = dateCreateFields[i];
                    //     const dateField2 = dateupdateFields[i];
                    //     if (ComplianceDetail[field]) {
                    //         const picPaths = ComplianceDetail[field].split(',');
                    //         const dateCreatePaths = ComplianceDetail[dateField] ? ComplianceDetail[dateField].split(',') : [];
                    //         const dateCreatePaths2 = ComplianceDetail[dateField2] ? ComplianceDetail[dateField2].split(',') : [];

                    //         const base64Images = await Promise.all(
                    //             picPaths.map(async (picPath, index) => {
                    //                 const imagePath = path.resolve(projectRoot, picPath.trim());
                    //                 const fileName = path.basename(picPath.trim());

                    //                 try {
                    //                     const imageData = await fs.promises.readFile(imagePath);
                    //                     return {
                    //                         url: `data:image/jpeg;base64,${imageData.toString('base64')}`,
                    //                         name: fileName,
                    //                         datecreate: dateCreatePaths[index] || null, // ตรวจสอบว่า dateCreatePaths มีค่าหรือไม่
                    //                         dateupdate: dateCreatePaths2[index] || null
                    //                     };
                    //                 } catch (err) {
                    //                     console.error(`Error reading image (${fileName}):`, err.message);
                    //                     return null;
                    //                 }
                    //             })
                    //         );

                    //         ComplianceDetail.dataValues[field] = base64Images.filter((img) => img !== null);
                    //     } else {
                    //         ComplianceDetail.dataValues[field] = [];
                    //     }
                    // }
                })
            );
        }
        // หา specificDisabledDates สำหรับ 7 วันที่ผ่านมา
        const specificDisabledDates = [];
        const targetDate = new Date(req.body.datesave);

        for (let i = 1; i <= 7; i++) {
            const dateToCheck = new Date(targetDate);
            dateToCheck.setDate(targetDate.getDate() - i);
            const formattedDate = dateToCheck.toISOString().split('T')[0];

            const dateExists = await db.Compliance.count({
                where: {
                    store_id: req.body.store_id,
                    datesave: formattedDate
                }
            });

            if (dateExists === 0) {
                specificDisabledDates.push(formattedDate);
            }
        }

        res.send({
            status: "success",
            data: data,
            // groupedData, // ส่งข้อมูลสินค้าเป็นกลุ่มตาม Brand และ SubBrand
            specificDisabledDates,
        });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_Compliance_date(req, res) {
    try {
       
        // หา specificDisabledDates สำหรับ 7 วันที่ผ่านมา
        const specificDisabledDates = [];
        const targetDate = new Date(req.body.datenow);

        for (let i = 1; i <= 7; i++) {
            const dateToCheck = new Date(targetDate);
            dateToCheck.setDate(targetDate.getDate() - i);
            const formattedDate = dateToCheck.toISOString().split('T')[0];

            const dateExists = await db.Compliance.count({
                where: {
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
async function get_all_Compliance_date2(req, res) {
    try {
        // ตรวจสอบว่าค่าต่าง ๆ มีใน req.body หรือไม่
        const whereConditions = {};
        if (req.body.store_id) whereConditions.store_id = req.body.store_id;
        let data = await db.MapStoreComplianceList.findAll({
            where: {
                // เงื่อนไข enddate ต้องไม่เลยวันปัจจุบัน
                enddate: {
                    [db.Sequelize.Op.gte]: req.body.datenow, // enddate >= currentDate
                },
            },
            include: [
                {
                    model: db.MapStoreCompliance,
                    as: 'mapStoreCompliance', // ชื่อ alias ที่ตั้งไว้ใน model
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
async function get_price_check_day(req, res) {
    try {
        // หา specificDisabledDates สำหรับ 7 วันที่ผ่านมา
        const specificDisabledDates = [];
        const targetDate = new Date(req.body.datesave);

        for (let i = 1; i <= 7; i++) {
            const dateToCheck = new Date(targetDate);
            dateToCheck.setDate(targetDate.getDate() - i);
            const formattedDate = dateToCheck.toISOString().split('T')[0];

            // ตรวจสอบว่าในแต่ละวันที่ไม่มีข้อมูลใน db.Compliance
            const dateExists = await db.Compliance.count({
                where: {
                    store_id: req.body.store_id,
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
async function create_new_Compliance(req, res) {
    try {
        const whereConditions = {};
        if (req.body.store_id) whereConditions.store_id = req.body.store_id;
        if (req.body.datenow) whereConditions.datesave = req.body.datenow;

        const whereConditions2 = {};
        if (req.body.store_id) whereConditions2.store_id = req.body.store_id;
        if (req.body.datesave) whereConditions2.datesave = req.body.datesave;
        
        const count = await db.Compliance.count({
            where: {
                store_id: req.body.store_id,
            }
        });
        
        let data;
        if (count === 0) {
            const datex = new Date(req.body.datesave);
            const formattedDate = datex.getFullYear() + "-" +
                      String(datex.getMonth() + 1).padStart(2, '0') + "-" +
                      String(datex.getDate()).padStart(2, '0');
            let dataz = await db.Compliance.create({
                store_id: req.body.store_id,
                datenow: req.body.datenow,
                datesave: formattedDate,
            });
            const productList = await db.MapStoreComplianceList.findAll({
                where: { map_product_id: req.body.store_id }
            });
            // วนลูปสร้างรายการใน ComplianceList สำหรับสินค้าแต่ละตัวที่เจอ
            for (const product of productList) {
                await db.ComplianceList.create({
                    compliance_id: dataz.id,
                    map_storecompliance_list_id: product.id,
                    stock: req.body.stock || 0,
                    note: req.body.note || '',
                });
            }
        }

        data = await db.Compliance.findOne({
            where: whereConditions,
            order: [['id', 'DESC']],
            include: [{
                model: db.ComplianceList,
                as: 'complianceDetails',
                include: [{
                    model: db.MapStoreComplianceList,
                    as: 'mapStoreComplianceList',
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

            // ตรวจสอบว่าในแต่ละวันที่ไม่มีข้อมูลใน db.Compliance
            const dateExists = await db.Compliance.count({
                where: {
                    store_id: req.body.store_id,
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
            if(data.complianceDetails){
                await Promise.all(
                    data.complianceDetails.map(async (element) => {
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
async function create_new_Compliance2(req, res) {
    try {
        const whereConditions = {};
        if (req.body.store_id) whereConditions.store_id = req.body.store_id;
        if (req.body.datenow) whereConditions.datesave = req.body.datenow;

        const whereConditions2 = {};
        if (req.body.store_id) whereConditions2.store_id = req.body.store_id;
        if (req.body.datesave) whereConditions2.datesave = req.body.datesave;
        
        const count = await db.Compliance.count({
            where: {
                store_id: req.body.store_id,
                datesave: req.body.datesave,
            }
        });
        
        let data;
        if (count === 0) {
            let dataz = await db.Compliance.create({
                store_id: req.body.store_id,
                datenow: req.body.datenow,
                datesave: req.body.datesave,
            });
            const productList = await db.MapStoreComplianceList.findAll({
                where: { map_product_id: req.body.store_id }
            });
            // วนลูปสร้างรายการใน ComplianceList สำหรับสินค้าแต่ละตัวที่เจอ
            for (const product of productList) {
                await db.ComplianceList.create({
                    compliance_id: dataz.id,
                    map_storecompliance_list_id: product.id,
                    stock: req.body.stock || 0,
                    note: req.body.note || '',
                });
            }
        }

        data = await db.Compliance.findOne({
            where: whereConditions2,
            order: [['id', 'DESC']],
            include: [{
                model: db.ComplianceList,
                as: 'complianceDetails',
                include: [{
                    model: db.MapStoreComplianceList,
                    as: 'mapStoreComplianceList',
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

            // ตรวจสอบว่าในแต่ละวันที่ไม่มีข้อมูลใน db.Compliance
            const dateExists = await db.Compliance.count({
                where: {
                    store_id: req.body.store_id,
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
            if(data.complianceDetails){
                await Promise.all(
                    data.complianceDetails.map(async (element) => {
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
async function readdata_Compliance(req, res) {
    try {
        const whereConditions = {};
        if (req.body.store_id) whereConditions.id = req.body.store_id;
        
        var MapStoreCompliance = await db.MapStoreCompliance.findOne({ where: whereConditions });

        const whereConditions2 = {};
        if (MapStoreCompliance.group_customer_id) whereConditions.group_customer_id = MapStoreCompliance.group_customer_id;
        var PlacementPoint = await db.PlacementPoint.findAll({ where: whereConditions2 });
        
        res.send({ 
            status: "success", 
            MapStoreCompliance: MapStoreCompliance,
            PlacementPoint: PlacementPoint 
        });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
//get Compliance by id
async function get_Compliance_by_id(req, res) {
    try {
        let data = await db.Compliance.findByPk(req.params.id);

        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//update Compliance
async function update_Compliance(req, res) {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.Compliance.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.Compliance.update(req.body, { where: { id: req.params.id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

}

//update Compliance isActive
async function update_Compliance_isActive(req, res) {
    const id = req.params.id;
    const error = validation(req, ['isActive']);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.Compliance.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.Compliance.update(req.body, { where: { id: id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }
}
async function delete_Compliance(req, res) {
    const id = req.params.id;
    try {
        // ค้นหาแถวใน Compliance
        let row = await db.Compliance.findByPk(id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการลบ');
        }

        // ลบรายการที่เกี่ยวข้องใน ComplianceList ก่อน
        await db.ComplianceList.destroy({
            where: { map_product_id: id } // หรือใช้ฟิลด์ที่เชื่อมต่อกับ Compliance (เช่น ComplianceId)
        });

        // ลบรายการใน Compliance
        await db.Compliance.destroy({
            where: { id: id }
        });

        res.send({ status: "success", message: "ลบข้อมูลเรียบร้อยแล้ว" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถลบข้อมูลได้!" });
    }
}
async function delete_ComplianceList(req, res) {
    const id = req.body.id;
    try {
        // ค้นหาแถวใน Compliance
        let row = await db.ComplianceList.findByPk(id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการลบ');
        }

        // ลบรายการที่เกี่ยวข้องใน ComplianceList ก่อน
        await db.ComplianceList.destroy({
            where: { id: id } // หรือใช้ฟิลด์ที่เชื่อมต่อกับ Compliance (เช่น ComplianceId)
        });

        // ลบรายการใน Compliance
        await db.ComplianceListImages.destroy({
            where: { compliance_list_id: id }
        });

        const dateExists = await db.ComplianceList.count({
            where: {
                compliance_id: row.compliance_id
            }
        });

        if (dateExists === 0) {
            await db.Compliance.destroy({
                where: { id: row.compliance_id }
            });
        }

        res.send({ status: "success", message: "ลบข้อมูลเรียบร้อยแล้ว" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถลบข้อมูลได้!" });
    }
}
async function delete_ComplianceListExtra(req, res) {
    const id = req.body.id;
    try {
        // ค้นหาแถวใน Compliance
        let row = await db.ComplianceListextra.findByPk(id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการลบ');
        }

        // ลบรายการที่เกี่ยวข้องใน ComplianceListextra ก่อน
        await db.ComplianceListextra.destroy({
            where: { id: id } // หรือใช้ฟิลด์ที่เชื่อมต่อกับ Compliance (เช่น ComplianceId)
        });

        // ลบรายการใน Compliance
        await db.ComplianceListImagesextra.destroy({
            where: { complianceextra_list_id: id }
        });

        const dateExists = await db.ComplianceListextra.count({
            where: {
                complianceextra_id: row.complianceextra_id
            }
        });

        if (dateExists === 0) {
            await db.Complianceextra.destroy({
                where: { id: row.complianceextra_id }
            });
        }

        res.send({ status: "success", message: "ลบข้อมูลเรียบร้อยแล้ว" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถลบข้อมูลได้!" });
    }
}
async function delete_MapComplianceList(req, res) {
    const id = req.body.id;
    try {
        // ค้นหาแถวใน Compliance
        let row = await db.MapStoreComplianceList.findByPk(id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการลบ');
        }

        // ลบรายการที่เกี่ยวข้องใน MapStoreComplianceList ก่อน
        
        
        

        const dateExists = await db.ComplianceList.count({
            where: {
                map_storecompliance_list_id: id
            }
        });
        var compliance_id = 0;
        if (dateExists > 0) {
            var ComplianceList = await db.ComplianceList.findAll({ 
                where: {
                    map_storecompliance_list_id: id
                }
            });
            if(ComplianceList.length > 0){
                for (const val of ComplianceList) {
                    // ลบรายการใน Compliance
                    const countComplianceListImages = await db.ComplianceListImages.count({
                        where: {
                            compliance_list_id: val.id
                        }
                    });
                    if(countComplianceListImages > 0){
                        await db.ComplianceListImages.destroy({
                            where: { compliance_list_id: val.id }
                        });
                    }
                    
                    await db.ComplianceList.destroy({
                        where: { id: val.id }
                    });
                    compliance_id = val.compliance_id
                }
            }
        }
        if(compliance_id > 0){
            const dateExists = await db.ComplianceList.count({
                where: {
                    compliance_id: compliance_id
                }
            });
    
            if (dateExists === 0) {
                await db.Compliance.destroy({
                    where: { id: compliance_id }
                });
            }
        }
        
        await db.MapStoreComplianceList.destroy({
            where: { id: id } // หรือใช้ฟิลด์ที่เชื่อมต่อกับ Compliance (เช่น ComplianceId)
        });

        res.send({ status: "success", message: "ลบข้อมูลเรียบร้อยแล้ว" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถลบข้อมูลได้!" });
    }
}
module.exports = {

    //exprot function
    create_Compliance,
    get_all_Compliance,
    get_all_Compliance2,
    get_price_check_day,
    get_Compliance_by_id,
    update_Compliance,
    update_Compliance_isActive,
    delete_Compliance,
    delete_ComplianceList,
    delete_ComplianceListExtra,
    delete_MapComplianceList,
    create_new_Compliance,
    create_new_Compliance2,
    get_all_Compliance_date,
    get_all_Compliance_date2,
    create_Compliance2,
    readdata_Compliance,
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
