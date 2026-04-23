const db = require("../models")

const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const { json } = require("sequelize");
const Op = db.Sequelize.Op


async function import_userstore(req, res) {
    // //console.log(req.files.file_excel);
    try {
        let file = req.files.file_excel;
        if (!file) {
            return res.status(200).send({ status: "error", message: "No file uploaded" });
        }
        // var ext = file.name.split(".").pop();
        // var today = new Date();
        // var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + '-' +
        //     today.getHours() + "" + today.getMinutes() + "" + today.getSeconds();
        // var new_name = date + '.' + ext;
        // await file.mv('./uploads/excel/' + new_name);
        // let data = await read_excel('./uploads/excel/' + new_name);
        // fs.unlink('./uploads/excel/' + new_name, (unlinkErr) => {
        //     if (unlinkErr) {
        //         console.error("Error deleting file: ", unlinkErr);
        //     }
        // }
        // );

        const workbook = xlsx.read(file.data, { type: "buffer" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(worksheet);

        // //console.log(data);
        let insert_data = await insert_Importuserstore(data);
        return res.send({ status: "success", data: data });

    } catch (error) {
        console.error("Error in import_userstore: ", error);
        return res.status(200).send({ status: "error", message: "Error processing file" });
    }
}
async function insert_Importuserstore(data) {
  try {
        // ใช้ Map เพื่อเก็บข้อมูลที่รวมกัน
        const resultx = [];
        const map = new Map();
        // //console.log(data);
        for (let i = 0; i < data.length; i++) {
            // destructure fields จากแต่ละ row
            const { route_no, group_customer_id, code, store_code, provinces_id, account_id, branch_name,prefix,username,last_name,area_supervisor,area_manager,area_supervisor_name,area_manager_name,fullname } = data[i];
            
            // ใช้ user code เป็น key ถ้ามี ถ้าไม่มีก็ใช้ index กับ group_customer_id
            const key = code ? code : `${i + 1}-${group_customer_id}`;
            let user_id = 0;
            let store_id = 0;
            let branch_namex = '';
            // route_name อาจจะมาจาก route_no หรือใช้ index+1
            const route_name = route_no || (i + 1);

            const group_customer_id_new = await db.GroupCustomer.findOne({
                where: { name: group_customer_id },
            });

            let account_idName = account_id;
            if (!account_idName || account_idName == 0) {
            account_idName = 'Default';
            }
            const [accountRecord] = await db.Account.findOrCreate({
                where: { name: account_idName,group_customer_id: group_customer_id_new.id },
                defaults: { name: account_idName, isActive: 'Y',group_customer_id: group_customer_id_new.id }
            });

            const area_supervisor_newxxx = await db.AreaSupervisor.findOne({
                where: { name: area_supervisor,group_customer_id: group_customer_id_new.id },
            });
            if(area_supervisor_newxxx){
                var area_supervisor_new = area_supervisor_newxxx.id;
            }else{
                const newAreaSupervisor = await db.AreaSupervisor.create({ name: area_supervisor,group_customer_id: group_customer_id_new.id });
                var area_supervisor_new = newAreaSupervisor.id;
            }
            
            // let area_manager_new = areaManagerMap.get(item.area_manager) || await createAndCacheAreaManager(item.area_manager);
            const area_manager_newxxx = await db.AreaManager.findOne({
                where: { name: area_manager,group_customer_id: group_customer_id_new.id },
            });
            if(area_manager_newxxx){
                var area_manager_new = area_manager_newxxx.id;
            }else{
                const newAreaManager = await db.AreaManager.create({ name: area_manager,group_customer_id: group_customer_id_new.id });
                var area_manager_new = newAreaManager.id;
            }

            var existingRecordUser = {};
            if(code){
                const existingRecordcode = await db.User.findOne({
                    where: {
                        code: code
                    }
                });
                //console.log(code);
                if(existingRecordcode){
                    existingRecordUser = existingRecordcode;
                    user_id = existingRecordcode.id
                }else{
                    const position_id_newxxx = await db.Position.findOne({
                        where: { name: 'พนักงาน',group_customer_id: group_customer_id_new.id },
                    });
                    var position_id_new = 0;
                    if(position_id_newxxx){
                        position_id_new = position_id_newxxx.id;
                    }else{
                        const newPosition = await db.Position.create({ name: 'พนักงาน',group_customer_id: group_customer_id_new.id });
                        var position_id_new = newPosition.id;
                    }

                    await db.User.create({
                        group_customer_id: group_customer_id_new.id,
                        code: code || null,
                        email: null,
                        password: await Bcrypt.hashSync(code, 10),
                        prefix: prefix || null,
                        name: username || null,
                        last_name: last_name || null,
                        job_position_id: 25,
                        position_id: position_id_new,
                        area_supervisor: area_supervisor_new,
                        area_manager: area_manager_new,
                        isActive: 'Y',
                        groupId: 0
                    });
                    const getUser = await db.User.findOne({
                        where: { code: code },
                    });
                    if(getUser){
                        user_id = getUser.id
                    }else{
                        user_id = 0
                    }
                }
            }

            // //console.log('user_id',user_id);

            if(user_id > 0){
                var existingStore = {};
                var provinceRecord = {};
                let store_codeDefault = store_code;

                const dataProvinces = await db.Provinces.findOne({
                    where: {
                        name_in_thai: provinces_id
                    }
                });
                if(dataProvinces){
                    provinceRecord = dataProvinces;
                }

                if (!store_codeDefault || store_codeDefault == 0) {
                store_codeDefault = 'Default';
                }
                let branchNameFinal = branch_name;
                if (!branchNameFinal || branchNameFinal == 0) {
                    branchNameFinal = 'Default';
                }
                if(store_codeDefault){
                    
                    const existingRecordstore_code = await db.Store.findOne({
                        where: {
                            store_code: store_codeDefault,
                            group_customer_id: group_customer_id_new.id,
                            account_id: accountRecord.id,
                            provinces_id: dataProvinces.id,
                            store_name: branchNameFinal
                        },
                        include: [
                            {
                                model: db.Account,
                                as: 'account', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                                required: false, // required: false ทำให้เป็น LEFT JOIN
                            },
                            {
                                model: db.AccountType,
                                as: 'accountType', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                                required: false, // required: false ทำให้เป็น LEFT JOIN
                            },
                        ],
                    });
                    if(existingRecordstore_code){
                        existingStore = existingRecordstore_code;
                        store_id = existingRecordstore_code.id
                    }
                }
                
                
                // if(!resultx){
                    resultx.push({
                        route_name: route_name,
                        route_no: route_no,
                        group_customer_id: group_customer_id_new.id,
                        group_customer_name: group_customer_id_new.name,
                        user_ids: user_id,      // Set สำหรับเก็บ user_id ที่ไม่ซ้ำ
                        store_ids: store_id,    // Set สำหรับเก็บ store_id ที่ไม่ซ้ำ
                        branch_name: branchNameFinal,
                        branch_name_full: branchNameFinal,
                        account: accountRecord,
                        existingStore: existingStore,
                        existingRecordUser: existingRecordUser,
                        province: provinceRecord,
                        fullname:fullname,
                        area_supervisor:area_supervisor_new,
                        area_supervisor_name: area_supervisor_name,
                        area_manager:area_manager_new,
                        area_manager_name: area_manager_name,
                    });
                // }
                
            }
            
        }

        //console.log('resultx',resultx);
        const result = await Promise.all(
            Object.values(resultx).map(async (item) => {
                // const [groupCustomer] = await db.GroupCustomer.findOne({
                // where: { name: item.group_customer_id },
                // defaults: { name: item.group_customer_id, isActive: 'Y' }
                // });
                // const group_customer_id_new = item.group_customer_id;
                const existingRecord = await db.MapUserStorelist.findOne({
                    where: {
                        route_name: item.route_name,
                        group_customer_id: item.group_customer_id,
                        branch_name: item.branch_name,
                    }
                });
                if (!existingRecord) {
                    // ถ้าไม่มี record ในฐานข้อมูล ให้ทำการ create
                    await db.MapUserStorelist.create({
                        route_name: item.route_name,
                        route_no: item.route_no,
                        group_customer_id: item.group_customer_id,
                        user_id:item.user_ids,
                        store_id: item.store_ids,
                        branch_name: item.branch_name,
                        branch_name_full: item.branch_name_full,
                        fullname: item.fullname,
                        provinces_id:item.province.id,
                        area_supervisor: item.area_supervisor,
                        area_supervisor_name: item.area_supervisor_name,
                        area_manager: item.area_manager,
                        area_manager_name: item.area_manager_name,
                        isActive: 'Y'
                    });
                    // //console.log(`Created new route_name ${item.route_name}`);

                    var count1 = 0;
                    const datauser_ids = await db.User.findOne({
                        where: {
                            id: item.user_ids
                        },
                    });
                    // //console.log(datauser_ids);
                    const dataStore = await db.Store.findOne({
                        where: {
                            id: item.store_ids
                        },
                        include: [
                            {
                                model: db.Account,
                                as: 'account', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                                required: false, // required: false ทำให้เป็น LEFT JOIN
                            },
                            {
                                model: db.AccountType,
                                as: 'accountType', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                                required: false, // required: false ทำให้เป็น LEFT JOIN
                            },
                        ],
                    });
                    if(dataStore){
                        if(datauser_ids){
                            const MapProductStore = await db.MapProductStore.findOne({
                                where: {
                                    account_id: dataStore.account.id,
                                    account_type_id: dataStore.account_type_id,
                                    group_customer_id: item.group_customer_id,
                                    user_code: datauser_ids.code,
                                    store_code: dataStore.store_code,
                                    branch_name: item.branch_name_full,
                                    province_name: item.province.name_in_thai,
                                }
                            });
                            if(!MapProductStore){
                            await db.MapProductStore.create({
                                account_id: dataStore.account.id,
                                account_type_id: dataStore.account_type_id,
                                group_customer_id: item.group_customer_id,
                                group_customer_name: item.group_customer_name,
                                name: item.branch_name,
                                user_code: datauser_ids.code,
                                user_prefix: datauser_ids.prefix,
                                user_name: datauser_ids.name,
                                user_lastname: datauser_ids.last_name,
                                account_name: dataStore.account.name,
                                store_code: dataStore.store_code,
                                branch_name: item.branch_name_full,
                                province_name: item.province.name_in_thai,
                                account_type_name: dataStore.accountType.name,
                                group_name: item.branch_name,
                            });
                            }
                        }
                    }
                    count1++;
                }
            })
        );

        // const result = Object.values(resultx).map(item => {
        //     const [groupCustomer] = await db.GroupCustomer.findOrCreate({
        //         where: { name: item.group_customer_id },
        //         defaults: { name: item.group_customer_id, isActive: 'Y' }
        //     });
        //     const group_customer_id_new = groupCustomer.id;
        //     const existingRecord = await db.MapUserStore.findOne({
        //         where: {
        //             route_name: item.route_name,
        //             group_customer_id: group_customer_id_new,
        //             branch_name: {
        //                 [Op.in]: Array.from(item.branch_name)
        //             },
        //         }
        //     });
        //     //console.log(existingRecord);
        //     return false;
        //     // if (existingRecord) {
        //     //         // ถ้ามีข้อมูลอยู่แล้วในฐานข้อมูล ให้เทียบ user_id และ store_id
        //     //         // const existingUserIds = existingRecord.user_id ? existingRecord.user_id.split(',').map(Number) : [];
        //     //         const existingStoreIds = existingRecord.store_id ? existingRecord.store_id.split(',').map(Number) : [];

        //     //         // แปลง user_id และ store_id จาก result เป็น array
        //     //         // const newUserIds = item.user_id.split(',').map(Number);
        //     //         // const newStoreIds = item.store_ids.split(',').map(Number);

        //     //         // รวมค่าใหม่กับค่าที่มีอยู่ในฐานข้อมูล และตัดค่าที่ซ้ำออก
        //     //         // const updatedUserIds = Array.from(new Set([...existingUserIds, ...newUserIds])).join(',');
        //     //         const updatedStoreIds = Array.from(new Set([...existingStoreIds, ...item.store_ids])).join(',');

        //     //         // ตรวจสอบว่า user_id หรือ store_id มีการเปลี่ยนแปลงหรือไม่
        //     //         if (existingRecord.store_id !== updatedStoreIds) {
        //     //             // Update record ถ้ามีการเปลี่ยนแปลง
        //     //             await db.MapUserStore.update(
        //     //                 { user_id: item.user_ids, store_id: updatedStoreIds },
        //     //                 { where: { id: existingRecord.id } }
        //     //             );
        //     //             //console.log(`Updated route_name ${item.route_name}`);
        //     //         }

        //     //         // const MapProductStore = await db.MapProductStore.findOne({
        //     //         //     where: {
        //     //         //         account_id: item.account_id_new.id,
        //     //         //         account_type_id: item.existingStore.account_type_id,
        //     //         //         group_customer_id: group_customer_id_new,
        //     //         //         user_code: existingRecordcodex.code,
        //     //         //         store_code: item.existingStore.store_code,
        //     //         //         branch_name: item.branch_name,
        //     //         //         province_name: item.provinceRecord.name_in_thai,
        //     //         //     }
        //     //         // });
        //     //         // if(!MapProductStore){
        //     //         //     await db.MapProductStore.create({
        //     //         //         account_id: item.account_id_new.id,
        //     //         //         account_type_id: item.existingStore.account_type_id,
        //     //         //         group_customer_id: group_customer_id_new,
        //     //         //         name: 'Test',
        //     //         //         user_prefix: existingRecordcodex.prefix,
        //     //         //         user_name: existingRecordcodex.name,
        //     //         //         user_lastname: existingRecordcodex.last_name,
        //     //         //         account_name: item.account_id_new.name,
        //     //         //         store_code: item.existingStore.store_code,
        //     //         //         branch_name: item.branch_name,
        //     //         //         province_name: item.provinceRecord.id,
        //     //         //         account_type_name: item.existingStore.account.name,
        //     //         //         group_name: 'Test',
        //     //         //     });
        //     //         // }
        //     // } else {
        //     //         // ถ้าไม่มี record ในฐานข้อมูล ให้ทำการ create
        //     //         await db.MapUserStore.create({
        //     //             route_name: item.route_name,
        //     //             route_no: item.route_no,
        //     //             group_customer_id: group_customer_id_new,
        //     //             group_customer_name: groupCustomer.name,
        //     //             user_id:item.user_ids,
        //     //             store_id: Array.from(item.store_ids).join(','),
        //     //             branch_name: Array.from(item.branch_name).join(','),
        //     //             isActive: 'Y'
        //     //         });
        //     //         //console.log(`Created new route_name ${item.route_name}`);

        //     //         // const MapProductStore = await db.MapProductStore.findOne({
        //     //         // where: {
        //     //         //     account_id: item.account_id_new.id,
        //     //         //     account_type_id: item.existingStore.account_type_id,
        //     //         //     group_customer_id: group_customer_id_new,
        //     //         //     user_code: existingRecordcodex.code,
        //     //         //     store_code: item.existingStore.store_code,
        //     //         //     branch_name: item.branch_name,
        //     //         //     province_name: item.provinceRecord.name_in_thai,
        //     //         // }
        //     //         // });
        //     //         // if(!MapProductStore){
        //     //         //     await db.MapProductStore.create({
        //     //         //         account_id: item.account_id_new.id,
        //     //         //         account_type_id: item.existingStore.account_type_id,
        //     //         //         group_customer_id: group_customer_id_new,
        //     //         //         name: 'Test',
        //     //         //         user_prefix: existingRecordcodex.prefix,
        //     //         //         user_name: existingRecordcodex.name,
        //     //         //         user_lastname: existingRecordcodex.last_name,
        //     //         //         account_name: account_id_new.name,
        //     //         //         store_code: item.existingStore.store_code,
        //     //         //         branch_name: item.branch_name,
        //     //         //         province_name: item.provinceRecord.id,
        //     //         //         account_type_name: item.existingStore.account.name,
        //     //         //         group_name: 'Test',
        //     //         //     });
        //     //         // }
        //     // }
        // });
        // }
      
      // //console.log(result);
      //console.log('Store inserted and updated successfully');
  } catch (error) {
      console.error("Error inserting data: ", error.message);
      throw new Error("Error inserting data");
  }
}
async function insert_Importuserstore_multi(data) {
    try {
          
  
          // ใช้ Map เพื่อเก็บข้อมูลที่รวมกัน
          const resultx = [];
          const map = new Map();
          for (let i = 0; i < data.length; i++) {
              // destructure fields จากแต่ละ row
              const { route_no, group_customer_id, code, store_code, provinces_id, account_id, branch_name,prefix,username,last_name,area_supervisor,area_manager } = data[i];
              // ใช้ user code เป็น key ถ้ามี ถ้าไม่มีก็ใช้ index กับ group_customer_id
              const key = code ? code : `${i + 1}-${group_customer_id}`;
              let user_id = 0;
              let store_id = 0;
              let branch_namex = '';
              // route_name อาจจะมาจาก route_no หรือใช้ index+1
              const route_name = route_no || (i + 1);
  
              const group_customer_id_new = await db.GroupCustomer.findOne({
                  where: { name: group_customer_id },
              });
  
              let account_idName = account_id;
              if (!account_idName || account_idName == 0) {
              account_idName = 'Default';
              }
              const [accountRecord] = await db.Account.findOrCreate({
                  where: { name: account_idName },
                  defaults: { name: account_idName, isActive: 'Y' }
              });
  
              var existingRecordUser = {};
              if(code){
                  const existingRecordcode = await db.User.findOne({
                      where: {
                          code: code
                      }
                  });
                  if(existingRecordcode){
                      existingRecordUser = existingRecordcode;
                      user_id = existingRecordcode.id
                  }else{
                      const position_id_newxxx = await db.Position.findOne({
                          where: { name: 'พนักงาน',group_customer_id: group_customer_id_new.id },
                      });
                      var position_id_new = 0;
                      if(position_id_newxxx){
                          position_id_new = position_id_newxxx.id;
                      }else{
                          const newPosition = await db.Position.create({ name: 'พนักงาน',group_customer_id: group_customer_id_new.id });
                          var position_id_new = newPosition.id;
                      }
  
                      const area_supervisor_newxxx = await db.AreaSupervisor.findOne({
                          where: { name: area_supervisor },
                      });
                      if(area_supervisor_newxxx){
                          var area_supervisor_new = area_supervisor_newxxx.id;
                      }else{
                          const newAreaSupervisor = await db.AreaSupervisor.create({ name: area_supervisor });
                          var area_supervisor_new = newAreaSupervisor.id;
                      }
                      
                      // let area_manager_new = areaManagerMap.get(item.area_manager) || await createAndCacheAreaManager(item.area_manager);
                      const area_manager_newxxx = await db.AreaManager.findOne({
                          where: { name: area_manager },
                      });
                      if(area_manager_newxxx){
                          var area_manager_new = area_manager_newxxx.id;
                      }else{
                          const newAreaManager = await db.AreaManager.create({ name: area_manager });
                          var area_manager_new = newAreaManager.id;
                      }
                      
                      await db.User.create({
                          group_customer_id: group_customer_id_new.id,
                          code: code || null,
                          email: null,
                          password: await Bcrypt.hashSync(code, 10),
                          prefix: prefix || null,
                          name: username || null,
                          last_name: last_name || null,
                          job_position_id: 25,
                          position_id: position_id_new,
                          area_supervisor: area_supervisor_new,
                          area_manager: area_manager_new,
                          isActive: 'Y',
                          groupId: 0
                      });
                      const getUser = await db.User.findOne({
                          where: { code: code },
                      });
                      user_id = getUser.id
                  }
              }
              
              var existingStore = {};
              var provinceRecord = {};
              let store_codeDefault = store_code;
  
              const dataProvinces = await db.Provinces.findOne({
                  where: {
                      name_in_thai: provinces_id
                  }
              });
              if(dataProvinces){
                  provinceRecord = dataProvinces;
              }
  
              if (!store_codeDefault || store_codeDefault == 0) {
              store_codeDefault = 'Default';
              }
              if(store_codeDefault){
                  
                  const existingRecordstore_code = await db.Store.findOne({
                      where: {
                          store_code: store_codeDefault,
                          group_customer_id: group_customer_id_new.id,
                          account_id: accountRecord.id,
                          provinces_id: dataProvinces.id
                      },
                      include: [
                          {
                              model: db.Account,
                              as: 'account', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                              required: false, // required: false ทำให้เป็น LEFT JOIN
                          },
                          {
                              model: db.AccountType,
                              as: 'accountType', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                              required: false, // required: false ทำให้เป็น LEFT JOIN
                          },
                      ],
                  });
                  if(existingRecordstore_code){
                      existingStore = existingRecordstore_code;
                      store_id = existingRecordstore_code.id
                  }
              }
              
              let branchNameFinal = branch_name;
              if (!branchNameFinal || branchNameFinal == 0) {
              branchNameFinal = 'Default';
              }
              
              // if (!map.has(key)) {
              //     // ถ้าไม่มี key นี้ใน Map ให้สร้าง entry ใหม่
              //     if(user_id > 0){
              //         map.set(key, {
              //             route_name: route_name,
              //             route_no: route_no,
              //             group_customer_id: group_customer_id,
              //             user_ids: user_id,      // Set สำหรับเก็บ user_id ที่ไม่ซ้ำ
              //             store_ids: new Set([store_id]),    // Set สำหรับเก็บ store_id ที่ไม่ซ้ำ
              //             branch_name: new Set([branchNameFinal]),
              //             account: accountRecord,
              //             existingStore: existingStore,
              //             province: provinceRecord,
              //         });
              //     }
              if(!resultx[key]){
                  resultx[key] = {
                      route_name: route_name,
                      route_no: route_no,
                      group_customer_id: group_customer_id_new.id,
                      group_customer_name: group_customer_id_new.name,
                      user_ids: user_id,      // Set สำหรับเก็บ user_id ที่ไม่ซ้ำ
                      store_ids: new Set([store_id]),    // Set สำหรับเก็บ store_id ที่ไม่ซ้ำ
                      branch_name: new Set([branchNameFinal]),
                      branch_name_full: [branchNameFinal],
                      account: accountRecord,
                      existingStore: existingStore,
                      existingRecordUser: existingRecordUser,
                      province: provinceRecord,
                  };
                  // resultx.push({
                  //     route_name: route_name,
                  //     route_no: route_no,
                  //     group_customer_id: group_customer_id,
                  //     user_ids: user_id,      // Set สำหรับเก็บ user_id ที่ไม่ซ้ำ
                  //     store_ids: new Set([store_id]),    // Set สำหรับเก็บ store_id ที่ไม่ซ้ำ
                  //     branch_name: new Set([branchNameFinal]),
                  //     account: accountRecord,
                  //     existingStore: existingStore,
                  //     province: provinceRecord,
                  // });
              } else {
                  if(user_id > 0){
              //         // ถ้ามี key นี้แล้ว ให้เพิ่ม user_id และ store_id ที่ไม่ซ้ำกัน
              //         const existing = map.get(key);
              //         // existing.user_ids.add(user_id);
              //         existing.store_ids.add(store_id);
              //         existing.branch_name.add(branchNameFinal);
                      resultx[key].store_ids.add(store_id);
                      resultx[key].branch_name.add(branchNameFinal);
                      resultx[key].branch_name_full.push(branchNameFinal);
                  }
              }
              
          }
  
          // const result = [];
          // map.forEach((value, key) => {
          //     result.push({
          //         key: key,
          //         route_name: value.route_name,
          //         route_no: value.route_no,
          //         group_customer_id: value.group_customer_id,
          //         user_id: value.user_ids, // ควรมีแค่ค่าเดียว
          //         store_id: Array.from(value.store_ids).join(','), // store_ids รวมกันเป็น string
          //         branch_name: Array.from(value.branch_names).join(','),
          //         account: value.account,
          //         existingStore: value.existingStore,
          //         province: value.province,
          //     });
          // });
          // //console.log(resultx);
          // return false;
          // if(!result){
              // //console.log(result);
          // }
          // เริ่มทำการหาใน db.MapUserStore และ update หรือ create
          // const result = Object.values(resultx).map(item => {
              // //console.log(item.group_customer_id);
              // return false;
              // return {
              //   route_name: item.route_name,
              //   route_no: item.route_no,
              //   group_customer_id: item.group_customer_id,
              //   user_id: item.user_ids, // ควรมีค่าเดียว
              //   store_id: Array.from(item.store_ids).join(','), // รวม store_id ทั้งหมดเป็น string
              //   branch_name: Array.from(item.branch_names).join(','),
              //   account: item.account,
              //   existingStore: item.existingStore,
              //   province: item.province,
              // };
          //   });
          // for (const item of resultx) {
          const result = await Promise.all(
              Object.values(resultx).map(async (item) => {
                  // const [groupCustomer] = await db.GroupCustomer.findOne({
                  // where: { name: item.group_customer_id },
                  // defaults: { name: item.group_customer_id, isActive: 'Y' }
                  // });
                  // const group_customer_id_new = item.group_customer_id;
                  const existingRecord = await db.MapUserStore.findOne({
                  where: {
                      route_name: item.route_name,
                      group_customer_id: item.group_customer_id,
                      branch_name: {
                      [Op.in]: Array.from(item.branch_name)
                      },
                  }
                  });
                  if (existingRecord) {
                          // ถ้ามีข้อมูลอยู่แล้วในฐานข้อมูล ให้เทียบ user_id และ store_id
                          // const existingUserIds = existingRecord.user_id ? existingRecord.user_id.split(',').map(Number) : [];
                          const existingStoreIds = existingRecord.store_id ? existingRecord.store_id.split(',').map(Number) : [];
  
                          // แปลง user_id และ store_id จาก result เป็น array
                          // const newUserIds = item.user_id.split(',').map(Number);
                          // const newStoreIds = item.store_ids.split(',').map(Number);
  
                          // รวมค่าใหม่กับค่าที่มีอยู่ในฐานข้อมูล และตัดค่าที่ซ้ำออก
                          // const updatedUserIds = Array.from(new Set([...existingUserIds, ...newUserIds])).join(',');
                          const updatedStoreIds = Array.from(new Set([...existingStoreIds, ...item.store_ids])).join(',');
  
                          // ตรวจสอบว่า user_id หรือ store_id มีการเปลี่ยนแปลงหรือไม่
                          if (existingRecord.store_id !== updatedStoreIds) {
                              // Update record ถ้ามีการเปลี่ยนแปลง
                              await db.MapUserStore.update(
                                  { user_id: item.user_ids, store_id: updatedStoreIds },
                                  { where: { id: existingRecord.id } }
                              );
                              // //console.log(`Updated route_name ${item.route_name}`);
                          }
  
                          var count1 = 0;
                          // //console.log(item.store_ids);
                          // const result2 = await Promise.all(
                          //     Object.values(item.store_ids).map(async (item2) => {
                              const storeIdsArray = Array.from(item.store_ids);
                              for (let i = 0; i < storeIdsArray.length; i++) {
                                  // //console.log(`Updated route_name ${storeIdsArray[i]}`);
                                  const datauser_ids = await db.User.findOne({
                                      where: {
                                          id: item.user_ids
                                      },
                                  });
                                  // //console.log(datauser_ids);
                                  const dataStore = await db.Store.findOne({
                                      where: {
                                          id: storeIdsArray[i]
                                      },
                                      include: [
                                          {
                                              model: db.Account,
                                              as: 'account', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                                              required: false, // required: false ทำให้เป็น LEFT JOIN
                                          },
                                          {
                                              model: db.AccountType,
                                              as: 'accountType', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                                              required: false, // required: false ทำให้เป็น LEFT JOIN
                                          },
                                      ],
                                  });
                                  if(dataStore){
                                      if(datauser_ids){
                                          const MapProductStore = await db.MapProductStore.findOne({
                                              where: {
                                                  account_id: dataStore.account.id,
                                                  account_type_id: dataStore.account_type_id,
                                                  group_customer_id: item.group_customer_id,
                                                  user_code: datauser_ids.code,
                                                  store_code: dataStore.store_code,
                                                  branch_name: item.branch_name_full[i],
                                                  province_name: item.province.name_in_thai,
                                              }
                                          });
                                          if(!MapProductStore){
                                              await db.MapProductStore.create({
                                                  account_id: dataStore.account.id,
                                                  account_type_id: dataStore.account_type_id,
                                                  group_customer_id: item.group_customer_id,
                                                  group_customer_name: item.group_customer_name,
                                                  name: 'Test',
                                                  user_code: datauser_ids.code,
                                                  user_prefix: datauser_ids.prefix,
                                                  user_name: datauser_ids.name,
                                                  user_lastname: datauser_ids.last_name,
                                                  account_name: dataStore.account.name,
                                                  store_code: dataStore.store_code,
                                                  branch_name: item.branch_name_full[i],
                                                  province_name: item.province.name_in_thai,
                                                  account_type_name: dataStore.accountType.name,
                                                  group_name: 'Test',
                                              });
                                          }
                                      }
                                  }
                                  count1++;
                              }
                          //     })
                          // );
                          
                          
                  } else {
                          // ถ้าไม่มี record ในฐานข้อมูล ให้ทำการ create
                          await db.MapUserStore.create({
                              route_name: item.route_name,
                              route_no: item.route_no,
                              group_customer_id: item.group_customer_id,
                              user_id:item.user_ids,
                              store_id: Array.from(item.store_ids).join(','),
                              branch_name: Array.from(item.branch_name).join(','),
                              branch_name_full: Array.from(item.branch_name_full).join(','),
                              isActive: 'Y'
                          });
                          // //console.log(`Created new route_name ${item.route_name}`);
  
                          var count1 = 0;
                          // //console.log(item.store_ids);
                          // const result2 = await Promise.all(
                          //     Object.values(item.store_ids).map(async (item2) => {
                              const storeIdsArray = Array.from(item.store_ids);
                              for (let i = 0; i < storeIdsArray.length; i++) {
                                  // //console.log(`Updated route_name ${storeIdsArray[i]}`);
                                  const datauser_ids = await db.User.findOne({
                                      where: {
                                          id: item.user_ids
                                      },
                                  });
                                  // //console.log(datauser_ids);
                                  const dataStore = await db.Store.findOne({
                                      where: {
                                          id: storeIdsArray[i]
                                      },
                                      include: [
                                          {
                                              model: db.Account,
                                              as: 'account', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                                              required: false, // required: false ทำให้เป็น LEFT JOIN
                                          },
                                          {
                                              model: db.AccountType,
                                              as: 'accountType', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                                              required: false, // required: false ทำให้เป็น LEFT JOIN
                                          },
                                      ],
                                  });
                                  if(dataStore){
                                      if(datauser_ids){
                                          const MapProductStore = await db.MapProductStore.findOne({
                                              where: {
                                                  account_id: dataStore.account.id,
                                                  account_type_id: dataStore.account_type_id,
                                                  group_customer_id: item.group_customer_id,
                                                  user_code: datauser_ids.code,
                                                  store_code: dataStore.store_code,
                                                  branch_name: item.branch_name_full[i],
                                                  province_name: item.province.name_in_thai,
                                              }
                                          });
                                          if(!MapProductStore){
                                          await db.MapProductStore.create({
                                              account_id: dataStore.account.id,
                                              account_type_id: dataStore.account_type_id,
                                              group_customer_id: item.group_customer_id,
                                              group_customer_name: item.group_customer_name,
                                              name: 'Test',
                                              user_code: datauser_ids.code,
                                              user_prefix: datauser_ids.prefix,
                                              user_name: datauser_ids.name,
                                              user_lastname: datauser_ids.last_name,
                                              account_name: dataStore.account.name,
                                              store_code: dataStore.store_code,
                                              branch_name: item.branch_name_full[i],
                                              province_name: item.province.name_in_thai,
                                              account_type_name: dataStore.accountType.name,
                                              group_name: 'Test',
                                          });
                                          }
                                      }
                                  }
                                  count1++;
                              }
                          //     })
                          // );
                  }
              })
          );
          // const result = Object.values(resultx).map(item => {
          //     const [groupCustomer] = await db.GroupCustomer.findOrCreate({
          //         where: { name: item.group_customer_id },
          //         defaults: { name: item.group_customer_id, isActive: 'Y' }
          //     });
          //     const group_customer_id_new = groupCustomer.id;
          //     const existingRecord = await db.MapUserStore.findOne({
          //         where: {
          //             route_name: item.route_name,
          //             group_customer_id: group_customer_id_new,
          //             branch_name: {
          //                 [Op.in]: Array.from(item.branch_name)
          //             },
          //         }
          //     });
          //     //console.log(existingRecord);
          //     return false;
          //     // if (existingRecord) {
          //     //         // ถ้ามีข้อมูลอยู่แล้วในฐานข้อมูล ให้เทียบ user_id และ store_id
          //     //         // const existingUserIds = existingRecord.user_id ? existingRecord.user_id.split(',').map(Number) : [];
          //     //         const existingStoreIds = existingRecord.store_id ? existingRecord.store_id.split(',').map(Number) : [];
  
          //     //         // แปลง user_id และ store_id จาก result เป็น array
          //     //         // const newUserIds = item.user_id.split(',').map(Number);
          //     //         // const newStoreIds = item.store_ids.split(',').map(Number);
  
          //     //         // รวมค่าใหม่กับค่าที่มีอยู่ในฐานข้อมูล และตัดค่าที่ซ้ำออก
          //     //         // const updatedUserIds = Array.from(new Set([...existingUserIds, ...newUserIds])).join(',');
          //     //         const updatedStoreIds = Array.from(new Set([...existingStoreIds, ...item.store_ids])).join(',');
  
          //     //         // ตรวจสอบว่า user_id หรือ store_id มีการเปลี่ยนแปลงหรือไม่
          //     //         if (existingRecord.store_id !== updatedStoreIds) {
          //     //             // Update record ถ้ามีการเปลี่ยนแปลง
          //     //             await db.MapUserStore.update(
          //     //                 { user_id: item.user_ids, store_id: updatedStoreIds },
          //     //                 { where: { id: existingRecord.id } }
          //     //             );
          //     //             //console.log(`Updated route_name ${item.route_name}`);
          //     //         }
  
          //     //         // const MapProductStore = await db.MapProductStore.findOne({
          //     //         //     where: {
          //     //         //         account_id: item.account_id_new.id,
          //     //         //         account_type_id: item.existingStore.account_type_id,
          //     //         //         group_customer_id: group_customer_id_new,
          //     //         //         user_code: existingRecordcodex.code,
          //     //         //         store_code: item.existingStore.store_code,
          //     //         //         branch_name: item.branch_name,
          //     //         //         province_name: item.provinceRecord.name_in_thai,
          //     //         //     }
          //     //         // });
          //     //         // if(!MapProductStore){
          //     //         //     await db.MapProductStore.create({
          //     //         //         account_id: item.account_id_new.id,
          //     //         //         account_type_id: item.existingStore.account_type_id,
          //     //         //         group_customer_id: group_customer_id_new,
          //     //         //         name: 'Test',
          //     //         //         user_prefix: existingRecordcodex.prefix,
          //     //         //         user_name: existingRecordcodex.name,
          //     //         //         user_lastname: existingRecordcodex.last_name,
          //     //         //         account_name: item.account_id_new.name,
          //     //         //         store_code: item.existingStore.store_code,
          //     //         //         branch_name: item.branch_name,
          //     //         //         province_name: item.provinceRecord.id,
          //     //         //         account_type_name: item.existingStore.account.name,
          //     //         //         group_name: 'Test',
          //     //         //     });
          //     //         // }
          //     // } else {
          //     //         // ถ้าไม่มี record ในฐานข้อมูล ให้ทำการ create
          //     //         await db.MapUserStore.create({
          //     //             route_name: item.route_name,
          //     //             route_no: item.route_no,
          //     //             group_customer_id: group_customer_id_new,
          //     //             group_customer_name: groupCustomer.name,
          //     //             user_id:item.user_ids,
          //     //             store_id: Array.from(item.store_ids).join(','),
          //     //             branch_name: Array.from(item.branch_name).join(','),
          //     //             isActive: 'Y'
          //     //         });
          //     //         //console.log(`Created new route_name ${item.route_name}`);
  
          //     //         // const MapProductStore = await db.MapProductStore.findOne({
          //     //         // where: {
          //     //         //     account_id: item.account_id_new.id,
          //     //         //     account_type_id: item.existingStore.account_type_id,
          //     //         //     group_customer_id: group_customer_id_new,
          //     //         //     user_code: existingRecordcodex.code,
          //     //         //     store_code: item.existingStore.store_code,
          //     //         //     branch_name: item.branch_name,
          //     //         //     province_name: item.provinceRecord.name_in_thai,
          //     //         // }
          //     //         // });
          //     //         // if(!MapProductStore){
          //     //         //     await db.MapProductStore.create({
          //     //         //         account_id: item.account_id_new.id,
          //     //         //         account_type_id: item.existingStore.account_type_id,
          //     //         //         group_customer_id: group_customer_id_new,
          //     //         //         name: 'Test',
          //     //         //         user_prefix: existingRecordcodex.prefix,
          //     //         //         user_name: existingRecordcodex.name,
          //     //         //         user_lastname: existingRecordcodex.last_name,
          //     //         //         account_name: account_id_new.name,
          //     //         //         store_code: item.existingStore.store_code,
          //     //         //         branch_name: item.branch_name,
          //     //         //         province_name: item.provinceRecord.id,
          //     //         //         account_type_name: item.existingStore.account.name,
          //     //         //         group_name: 'Test',
          //     //         //     });
          //     //         // }
          //     // }
          // });
          // }
        
        // //console.log(result);
        //console.log('Store inserted and updated successfully');
    } catch (error) {
        console.error("Error inserting data: ", error.message);
        throw new Error("Error inserting data");
    }
  }
async function insert_Importuserstore_bk(data) {
  try {
      // เก็บข้อมูลที่จะสร้างใหม่หรืออัปเดตในหน่วยความจำ
      const routeMap = new Map(); // ใช้ Map เพื่อเก็บข้อมูล route_name และ route_no
      const storesToInsert = [];

      for (let i = 0; i < data.length; i++) {
          // ค้นหาหรือสร้าง group_customer_id
          const [groupCustomer] = await db.GroupCustomer.findOrCreate({
              where: { name: data[i].group_customer_id },
              defaults: { name: data[i].group_customer_id, isActive: 'Y' }
          });
          const group_customer_id_new = groupCustomer.id;

          // สร้างคีย์เฉพาะสำหรับ route_name + route_no + group_customer_id
          const routeKey = `${data[i].route_name}-${data[i].route_no}-${group_customer_id_new}`;

          // ตรวจสอบว่า route นี้มีอยู่แล้วใน Map หรือไม่
          if (!routeMap.has(routeKey)) {
              // ถ้าไม่มีใน Map ให้ดึงข้อมูลจากฐานข้อมูล
              let existingStore = await db.MapUserStore.findOne({
                  where: {
                      route_name: data[i].route_name,
                      route_no: data[i].route_no,
                      group_customer_id: group_customer_id_new
                  }
              });

              if (existingStore) {
                  // แปลง user_id และ store_id เป็น array และเก็บใน Map
                  const existingUserIds = existingStore.user_id ? existingStore.user_id.split(',').map(Number) : [];
                  const existingStoreIds = existingStore.store_id ? existingStore.store_id.split(',').map(Number) : [];
                  routeMap.set(routeKey, {
                      id: existingStore.id,
                      userIds: new Set(existingUserIds), // ใช้ Set เพื่อป้องกันค่าซ้ำ
                      storeIds: new Set(existingStoreIds),
                  });
              } else {
                  // ถ้าไม่มีในฐานข้อมูล ให้เพิ่ม entry ใหม่ใน Map
                  routeMap.set(routeKey, {
                      id: null, // ยังไม่มี ID เพราะจะสร้างใหม่
                      userIds: new Set(),
                      storeIds: new Set(),
                  });
              }
          }

          // ดึงข้อมูลจาก Map
          const routeData = routeMap.get(routeKey);
          //console.log(routeData);
          // แปลง user_id และ store_id จาก Excel เป็น array
          // const newUserIds = data[i].user_id.split(',').map(Number);
          // const newStoreIds = data[i].store_id.split(',').map(Number);

          // // เพิ่ม user_id และ store_id ใหม่ใน Set เพื่อป้องกันค่าซ้ำ
          // newUserIds.forEach(id => routeData.userIds.add(id));
          // newStoreIds.forEach(id => routeData.storeIds.add(id));

          // // ถ้า ID เป็น null แสดงว่ายังไม่มีข้อมูลในฐานข้อมูล ให้เพิ่มลงใน storesToInsert
          // if (!routeData.id) {
          //     storesToInsert.push({
          //         route_name: data[i].route_name,
          //         route_no: data[i].route_no,
          //         group_customer_id: group_customer_id_new,
          //         user_id: Array.from(routeData.userIds).join(','),
          //         store_id: Array.from(routeData.storeIds).join(','),
          //         isActive: 'Y',
          //     });
          // }
      }

      // Insert ข้อมูลใหม่ทั้งหมดในครั้งเดียว
      // if (storesToInsert.length > 0) {
      //     const createdStores = await db.MapUserStore.bulkCreate(storesToInsert);

      //     // อัปเดต ID ใน Map หลังจากสร้างเสร็จ
      //     createdStores.forEach(store => {
      //         const routeKey = `${store.route_name}-${store.route_no}-${store.group_customer_id}`;
      //         if (routeMap.has(routeKey)) {
      //             routeMap.get(routeKey).id = store.id;
      //         }
      //     });
      // }

      // // Update ข้อมูลที่มีอยู่ในฐานข้อมูล
      // for (const [routeKey, routeData] of routeMap) {
      //     if (routeData.id) {
      //         await db.MapUserStore.update(
      //             { user_id: Array.from(routeData.userIds).join(','), store_id: Array.from(routeData.storeIds).join(',') },
      //             { where: { id: routeData.id } }
      //         );
      //     }
      // }

      //console.log('Store inserted and updated successfully');
  } catch (error) {
      console.error("Error inserting data: ", error.message);
      throw new Error("Error inserting data");
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
        throw new Error("Error reading Excel file"); // Throw an error to be handled in import_userstore
    }
}
module.exports = {
    import_userstore
}
