const { Op, Sequelize } = require("sequelize"); // ✅ Import Sequelize

const db = require("../models");
const { validation, getPagingData, getPagination } = require("../utilities/function");
const Bcrypt = require("bcrypt");

// ฟังก์ชันสำหรับ Export Excel
async function get_all_filters_GroupCustomer(req, res) {
    try {
        const whereConditions = {};
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        let data = await db.GroupCustomer.findAll({
            where: whereConditions,
        });
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_filters(req, res) {
    try {
        let dataUser = await db.User.findOne({
            where: {
                code: req.body.user_code
            },
        });

        const whereConditions_User_position = {};
        if (req.body.position_name === 'Supervisor') {
            whereConditions_User_position.name = { [Op.ne]: 'Supervisor' };
        }
        // //console.log(whereConditions_User_position);
        const whereConditions_AreaManager = {};
        const whereConditions_areaSupervisors = {};
        const whereConditions_Accounts = {};
        const whereConditions_provinces = {};
        const whereConditions_GroupCustomer = {};
        const where_GroupCustomer = {};
        if(req.body.position_name != 'SuperAdmin'){
            if (req.body.group_customer_id){
                whereConditions_AreaManager.group_customer_id = req.body.group_customer_id;
                whereConditions_areaSupervisors.group_customer_id = req.body.group_customer_id;
                whereConditions_Accounts.group_customer_id = req.body.group_customer_id;
                whereConditions_provinces.group_customer_id = req.body.group_customer_id;
                whereConditions_GroupCustomer.id = req.body.group_customer_id;
                where_GroupCustomer.group_customer_id = req.body.group_customer_id;
            }
            // if (req.body.user_code) whereConditions_Accounts.user_code = req.body.user_code;
            if (req.body.channel_id){
                whereConditions_Accounts.channel_id = req.body.channel_id;
                whereConditions_provinces.channel_id = req.body.channel_id;
            } 
            if (req.body.account_id) whereConditions_provinces.account_id = req.body.account_id;
            if (req.body.store_code) whereConditions_provinces.store_code = req.body.store_code;
        }
        const whereConditions_store = {};
        if (req.body.group_customer_id) whereConditions_store.group_customer_id = req.body.group_customer_id;
        if (req.body.channel_id) whereConditions_store.channel_id = req.body.channel_id;
        if (req.body.account_id) whereConditions_store.account_id = req.body.account_id;
        if (req.body.provinces_id) whereConditions_store.provinces_id = req.body.provinces_id;
        

        // ✅ รับค่าจาก Frontend
        const {
            brand_id,       // กรอง Sub Brand
            categoryId,    // กรอง Product Name
            manager_id,     // กรอง Area Manager
            area_manager_id, // กรอง Supervisor
            area_supervisor // กรอง Employee
        } = req.body;

        // ✅ ดึง brand_id จาก tb_product แบบไม่ซ้ำ และ Join กับ tb_brand
        const [brands, categories, subBrands] = await Promise.all([
            db.Product.findAll({
                attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('brand_id')), 'id']],
                include: [{ model: db.Brand, as: 'brand', attributes: ['id', 'name'] }],
                where: { 
                    ...where_GroupCustomer,
                    brand_id: { [Op.ne]: 0 },
                    isActive: 'Y' 
                },
                raw: true
            }),
            db.Product.findAll({
                attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('categoryId')), 'id']],
                include: [{ model: db.Category, as: 'category', attributes: ['id', 'name'] }],
                where: { 
                    ...where_GroupCustomer,
                    categoryId: { [Op.ne]: 0 },
                    isActive: 'Y' 
                },
                raw: true
            }),
            db.Product.findAll({
                attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('sub_brand_id')), 'id']],
                include: [{ model: db.SubBrand, as: 'subBrand', attributes: ['id', 'name'] }],
                where: { 
                    ...where_GroupCustomer,
                    sub_brand_id: { [Op.ne]: 0 },
                    isActive: 'Y' 
                },
                raw: true
            })
        ]);

        let AreaManagerdata = await db.MapUserArea.findAll({
            // attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('area_manager_id')), 'area_manager_id']], // ✅ ใช้ DISTINCT
            where: {
                ...whereConditions_AreaManager,
                // isActive: 'Y'
            },
            // raw: true
        });
        const AreaManagerIds = AreaManagerdata.map(item => item.area_manager_id);
        
        let AreaSupervisorsdata = await db.MapUserArea.findAll({
            attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('area_supervisor_id')), 'area_supervisor_id']], // ✅ ใช้ DISTINCT
            where: {
                ...whereConditions_areaSupervisors,
                area_manager_id: dataUser.area_manager,
                // isActive: 'Y'
            },
            raw: true
        });
        const areaSupervisorsIds = AreaSupervisorsdata.map(item => item.area_supervisor_id);
        
        let channelssdata = await db.Store.findAll({
            attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('channel_id')), 'channel_id']], // ✅ ใช้ DISTINCT
            where: {
                ...whereConditions_AreaManager,
                isActive: 'Y'
            },
            raw: true
        });
        const channelsIds = channelssdata.map(item => item.channel_id);

        // let Accountsdata = await db.MapProductStore.findAll({
        //     attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('account_id')), 'account_id']], // ✅ ใช้ DISTINCT
        //     where: whereConditions_Accounts,
        //     raw: true
        // });
        // const AccountsIds = Accountsdata.map(item => item.account_id);

        let MapProductStorex = await db.MapProductStore.findAll({
            where: {
                user_code: req.body.user_code,
                isActive: 'Y'
            },
            raw: true // ใช้ raw เพื่อให้ได้ผลลัพธ์เป็น object แทน instance ของ Sequelize
        });

        // let stores = [];

        // for (const item of MapProductStorex) {
        //     let storeData = await db.Store.findOne({
        //         where: { 
        //             store_code: item.store_code,
        //             group_customer_id: item.group_customer_id,
        //             isActive: 'Y'
        //             // store_name_report: `${item.account_name}${item.branch_name}${item.province_name}`
        //         },
        //         attributes: ['id', 'store_name_report'],
        //         raw: true
        //     });

        //     if (storeData) {
        //         item.store_id = storeData.id; // อัพเดท store_id ใน object
        //         item.store_name_report = storeData.store_name_report;
        //     }
        //     stores.push(item);
        // }
        let conditions_stores = [`mus.isActive = 'Y' AND mus.store_id != 0`];
        let replacements = {};

        if (req.body.group_customer_id) {
            conditions_stores.push(`mus.group_customer_id = :group_customer_id`);
            replacements.group_customer_id = req.body.group_customer_id;
        }

        if (req.body.account_id) {
            conditions_stores.push(`s.account_id = :account_id`);
            replacements.account_id = req.body.account_id;
        }

        if (req.body.channel_id) {
            conditions_stores.push(`s.channel_id = :channel_id`);
            replacements.channel_id = req.body.channel_id;
        }
        if (req.body.position_name == 'พนักงาน') {
            if (dataUser.id) {
                conditions_stores.push(`mus.user_id = :user_id`);
                replacements.user_id = dataUser.id;
            }
        }
        const whereClause_stores = conditions_stores.length > 0 ? `WHERE ${conditions_stores.join(' AND ')}` : '';

        const query_stores = `
            SELECT
                mus.*,
                s.id AS store_id,
                s.store_name AS store_name,
                s.store_code AS store_code,
                a.id AS account_id,
                a.name AS account_name,
                s.store_name_report AS store_name_report,
                p.name AS position_name
            FROM
                tb_map_user_store_list mus
            LEFT JOIN tb_store s ON mus.store_id = s.id
            LEFT JOIN tb_account a ON s.account_id = a.id
            LEFT JOIN tb_user u ON mus.user_id = u.id  -- Add this line
            LEFT JOIN tb_position p ON u.position_id = p.id
            WHERE
                mus.isActive = 'Y'
                AND mus.store_id != 0
                AND mus.group_customer_id = 11
                AND p.name LIKE 'พนักงาน'
                AND u.isActive = 'Y'
            GROUP BY
                s.store_code, mus.group_customer_id, mus.id, s.store_name_report;
        `;

        var stores = await db.sequelize.query(query_stores, {
            replacements,
            type: db.Sequelize.QueryTypes.SELECT
        });
        // let accounts = [];
        // let uniqueAccounts = new Map();

        // for (const item of MapProductStorex) {
        //     let storeData = await db.Store.findOne({
        //         where: {
        //             ...whereConditions_Accounts,
        //             isActive: 'Y'
        //         },
        //         attributes: ['id'],
        //         raw: true
        //     });

        //     if (storeData) {
        //         item.store_id = storeData.id; // อัพเดท store_id ใน object
        //     }

        //     // ✅ ตรวจสอบว่ามี account_id นี้อยู่ใน Map หรือไม่
        //     if (!uniqueAccounts.has(item.account_id)) {
        //         uniqueAccounts.set(item.account_id, item);
        //     }
        // }

        // // ✅ แปลงค่าจาก Map เป็น Array (เก็บเฉพาะค่าที่ไม่ซ้ำ)
        // accounts = Array.from(uniqueAccounts.values());
        let conditions_accounts = [`mus.isActive = 'Y' AND mus.store_id != 0`];

        if (req.body.group_customer_id) {
            conditions_accounts.push(`mus.group_customer_id = :group_customer_id`);
        }

        if (req.body.channel_id) {
            conditions_accounts.push(`s.channel_id = :channel_id`);
        }
        if (req.body.position_name == 'พนักงาน') {
            if (dataUser.id) {
                conditions_accounts.push(`mus.user_id = :user_id`);
            }
        }
        const whereClause_accounts = conditions_accounts.length > 0 ? `WHERE ${conditions_accounts.join(' AND ')}` : '';

        const query_accounts = `
            SELECT mus.*, 
                mus.store_id AS store_id, 
                s.store_name AS store_name,
                s.store_code AS store_code,
                a.id AS account_id,
                a.name AS account_name,
                s.provinces_id,
                p.name_in_thai
            FROM tb_map_user_store_list mus
            LEFT JOIN tb_store s ON mus.store_id = s.id
            LEFT JOIN tb_account a ON s.account_id = a.id
            LEFT JOIN tb_provinces p ON s.provinces_id = p.id
            ${whereClause_accounts}
            GROUP BY account_id,s.store_code, mus.group_customer_id, mus.id
        `;

        var Map__accounts = await db.sequelize.query(query_accounts, {
            replacements,
            type: db.Sequelize.QueryTypes.SELECT
        });
        var accounts = [
            ...new Map(
                Map__accounts
                    .filter(item => item.account_id) // เผื่อมี null
                    .map(item => [item.account_id, item]) // ใช้ account_id เป็น key
            ).values()
        ];
        var provinces = [
            ...new Map(
                Map__accounts
                    .filter(item => item.provinces_id) // เผื่อมี null
                    .map(item => [item.provinces_id, item]) // ใช้ provinces_id เป็น key
            ).values()
        ];
        
        // let provinces = [];
        // let uniqueProvinces = new Map();

        // for (const item of MapProductStorex) {
        //     // ✅ ดึงข้อมูลจาก tb_store
        //     let storeData = await db.Store.findOne({
        //         where: {
        //             group_customer_id: item.group_customer_id,
        //             store_code: item.store_code,
        //             account_id: item.account_id,
        //             account_type_id: item.account_type_id,
        //             isActive: 'Y'
        //         },
        //         attributes: ['id', 'provinces_id'],
        //         raw: true
        //     });

        //     if (storeData) {
        //         item.store_id = storeData.id; // ✅ อัพเดท store_id
        //         item.provinces_id = storeData.provinces_id; // ✅ ดึงค่า provinces_id

        //         // ✅ ดึงชื่อจังหวัดจาก tb_provinces
        //         let provinceData = await db.Provinces.findOne({
        //             where: { 
        //                 id: storeData.provinces_id,
        //                 isActive: 'Y'
        //             },
        //             attributes: ['name_in_thai'],
        //             raw: true
        //         });

        //         if (provinceData) {
        //             item.name_in_thai = provinceData.name_in_thai; // ✅ ดึงค่า name_in_thai
        //         }

        //         // ✅ ตรวจสอบว่ามี provinces_id นี้อยู่ใน Map หรือไม่
        //         if (!uniqueProvinces.has(item.provinces_id) && item.name_in_thai != undefined) {
        //             uniqueProvinces.set(item.provinces_id, {
        //                 id: item.provinces_id,
        //                 name_in_thai: item.name_in_thai
        //             });
        //         }
        //     }
        // }

        // ✅ แปลงค่าจาก Map เป็น Array (เก็บเฉพาะค่าที่ไม่ซ้ำ)
        // provinces = Array.from(uniqueProvinces.values());
        // //console.log(channelsIds);
        // ✅ ใช้ Promise.all() เพื่อดึงข้อมูลทั้งหมดแบบขนาน ลดเวลารอ
        const [
            products,
            GroupCustomers,
            areaManagers,
            areaSupervisors,
            users,
            channels,
        ] = await Promise.all([
            db.Product.findAll({
                where: categoryId ? { 
                    categoryId: { [Op.eq]: categoryId },
                    group_customer_id:req.body.group_customer_id,
                    isActive: 'Y'
                } : {
                    group_customer_id:req.body.group_customer_id,
                    isActive: 'Y'
                },
                attributes: ['id', 'name', 'categoryId', 'flavor']
            }), // ✅ Product Name (กรองตาม Category)
            db.GroupCustomer.findAll({ 
                attributes: ['id', 'name'], 
                where: {
                    ...whereConditions_GroupCustomer,
                    isActive: 'Y'
                }, 
            }), // ✅ Manager (VIP1)

            db.AreaManager.findAll({
                where: { 
                    id: AreaManagerIds,
                    isActive: 'Y'
                }, // ✅ ค้นหา AreaManager ตาม id ที่เจอ
                attributes: ['id', 'name'],
                raw: true
            }),
            // db.AreaManager.findAll({
            //     where: manager_id ? { id: { [Op.eq]: manager_id } } : {},
            //     attributes: ['id', 'name']
            // }), // ✅ Area Manager (VIP2) (กรองตาม Manager)
            db.AreaSupervisor.findAll({
                where: { 
                    id: areaSupervisorsIds,
                    isActive: 'Y'
                }, // ✅ ค้นหา AreaManager ตาม id ที่เจอ
                attributes: ['id', 'name'],
                raw: true
            }),
            // db.AreaSupervisor.findAll({
            //     where: area_manager_id ? { id: { [Op.eq]: area_manager_id } } : {},
            //     attributes: ['id', 'name']
            // }), // ✅ Supervisor (กรองตาม Area Manager)
            db.User.findAll({
                where: {
                    group_customer_id:dataUser.group_customer_id,
                    area_supervisor:dataUser.area_supervisor,
                    area_manager:dataUser.area_manager,
                    isActive: 'Y'
                },
                attributes: ['id', 'name', 'last_name', 'area_supervisor', 'area_manager'],
                include: [{ model: db.Position, as: 'position', where: whereConditions_User_position, }],
            }), // ✅ Employee (กรองตาม Supervisor)
            db.Channel.findAll({
                where: { 
                    id: channelsIds,
                    isActive: 'Y' 
                }, // ✅ ค้นหา AreaManager ตาม id ที่เจอ
                attributes: ['id', 'name'],
                raw: true
            }),
            // db.Channel.findAll({ attributes: ['id', 'name'] }), // ✅ Channel
            // db.Account.findAll({ where: { id: AccountsIds },attributes: ['id', 'name'] }), // ✅ Account
            // db.Store.findAll({
            //     where:whereConditions_store,
            //     attributes: ['id', 'store_name'],
            //     limit: 100, // ✅ ดึงข้อมูลเพียง 100 รายการ เพื่อลดการโหลดข้อมูล
            //     order: [['updatedAt', 'DESC']]
            // }), // ✅ Store (ลดจำนวนที่โหลด)
            // db.Provinces.findAll({ attributes: ['id', 'name_in_thai'] }) // ✅ Province
        ]);

        // ✅ ส่งข้อมูลกลับไปยัง Frontend
        res.send({
            status: "success",
            data: {
                brands,
                subBrands,
                categories,
                products,
                GroupCustomers,
                areaManagers,
                areaSupervisors,
                users,
                channels,
                accounts,
                stores,
                provinces
            }
        });

    } catch (err) {
        console.error("Error:", err);
        res.status(500).send({
            status: "error",
            message: err.message || "ไม่สามารถดึงข้อมูลได้ในตอนนี้!"
        });
    }
}
async function get_all_filters_map(req, res) {
    try {
        const whereConditions = {};
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        let data = await db.MapStoreCompliance.findAll({
            
            include: [
                { 
                    model: db.Store, 
                    as: 'store', 
                    attributes: ['id', 'store_name'],
                    where: whereConditions,
                },
            ],
        });
        res.send({ status: "success", data: data });
    } catch (err) {
        console.error("Error:", err);
        res.status(500).send({
            status: "error",
            message: err.message || "ไม่สามารถดึงข้อมูลได้ในตอนนี้!"
        });
    }
}
async function get_all_filters_premium(req, res) {
    try {
        let dataUser = await db.User.findOne({
            where: {
                code: req.body.user_code
            },
        });

        const whereConditions_User_position = {};
        if (req.body.position_name === 'Supervisor') {
            whereConditions_User_position.name = { [Op.ne]: 'Supervisor' };
        }
        // //console.log(whereConditions_User_position);
        const whereConditions_AreaManager = {};
        const whereConditions_areaSupervisors = {};
        const whereConditions_Accounts = {};
        const whereConditions_provinces = {};
        const whereConditions_GroupCustomer = {};
        const where_GroupCustomer = {};
        if(req.body.position_name != 'SuperAdmin'){
            if (req.body.group_customer_id){
                whereConditions_AreaManager.group_customer_id = req.body.group_customer_id;
                whereConditions_areaSupervisors.group_customer_id = req.body.group_customer_id;
                whereConditions_Accounts.group_customer_id = req.body.group_customer_id;
                whereConditions_provinces.group_customer_id = req.body.group_customer_id;
                whereConditions_GroupCustomer.id = req.body.group_customer_id;
                where_GroupCustomer.group_customer_id = req.body.group_customer_id;
            }
            // if (req.body.user_code) whereConditions_Accounts.user_code = req.body.user_code;
            if (req.body.channel_id){
                whereConditions_Accounts.channel_id = req.body.channel_id;
                whereConditions_provinces.channel_id = req.body.channel_id;
            } 
            if (req.body.account_id) whereConditions_provinces.account_id = req.body.account_id;
            if (req.body.store_code) whereConditions_provinces.store_code = req.body.store_code;
        }
        const whereConditions_store = {};
        if (req.body.group_customer_id) whereConditions_store.group_customer_id = req.body.group_customer_id;
        if (req.body.channel_id) whereConditions_store.channel_id = req.body.channel_id;
        if (req.body.account_id) whereConditions_store.account_id = req.body.account_id;
        if (req.body.provinces_id) whereConditions_store.provinces_id = req.body.provinces_id;
        

        // ✅ รับค่าจาก Frontend
        const {
            brand_id,       // กรอง Sub Brand
            categoryId,    // กรอง Product Name
            manager_id,     // กรอง Area Manager
            area_manager_id, // กรอง Supervisor
            area_supervisor // กรอง Employee
        } = req.body;

        // ✅ ดึง brand_id จาก tb_product แบบไม่ซ้ำ และ Join กับ tb_brand
        const [brands, categories, subBrands] = await Promise.all([
            db.Product.findAll({
                attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('brand_id')), 'id']],
                include: [{ model: db.Brand, as: 'brand', attributes: ['id', 'name'] }],
                where: { 
                    ...where_GroupCustomer,
                    brand_id: { [Op.ne]: 0 },
                    isActive: 'Y' 
                },
                raw: true
            }),
            db.Product.findAll({
                attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('categoryId')), 'id']],
                include: [{ model: db.Category, as: 'category', attributes: ['id', 'name'] }],
                where: { 
                    ...where_GroupCustomer,
                    categoryId: { [Op.ne]: 0 },
                    isActive: 'Y' 
                },
                raw: true
            }),
            db.Product.findAll({
                attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('sub_brand_id')), 'id']],
                include: [{ model: db.SubBrand, as: 'subBrand', attributes: ['id', 'name'] }],
                where: { 
                    ...where_GroupCustomer,
                    sub_brand_id: { [Op.ne]: 0 },
                    isActive: 'Y' 
                },
                raw: true
            })
        ]);

        let AreaManagerdata = await db.MapUserArea.findAll({
            // attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('area_manager_id')), 'area_manager_id']], // ✅ ใช้ DISTINCT
            where: {
                ...whereConditions_AreaManager,
                isActive: 'Y'
            },
            // raw: true
        });
        const AreaManagerIds = AreaManagerdata.map(item => item.area_manager_id);
        
        let AreaSupervisorsdata = await db.MapUserArea.findAll({
            attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('area_supervisor_id')), 'area_supervisor_id']], // ✅ ใช้ DISTINCT
            where: {
                ...whereConditions_areaSupervisors,
                area_manager_id: dataUser.area_manager,
                isActive: 'Y'
            },
            raw: true
        });
        const areaSupervisorsIds = AreaSupervisorsdata.map(item => item.area_supervisor_id);
        
        let channelssdata = await db.Store.findAll({
            attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('channel_id')), 'channel_id']], // ✅ ใช้ DISTINCT
            where: {
                ...whereConditions_AreaManager,
                isActive: 'Y'
            },
            raw: true
        });
        const channelsIds = channelssdata.map(item => item.channel_id);

        // let Accountsdata = await db.MapProductStore.findAll({
        //     attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('account_id')), 'account_id']], // ✅ ใช้ DISTINCT
        //     where: whereConditions_Accounts,
        //     raw: true
        // });
        // const AccountsIds = Accountsdata.map(item => item.account_id);

        let MapProductStorex = await db.MapProductStore.findAll({
            where: {
                user_code: req.body.user_code,
                isActive: 'Y'
            },
            raw: true // ใช้ raw เพื่อให้ได้ผลลัพธ์เป็น object แทน instance ของ Sequelize
        });

        // let stores = [];

        // for (const item of MapProductStorex) {
        //     let storeData = await db.Store.findOne({
        //         where: { 
        //             store_code: item.store_code,
        //             group_customer_id: item.group_customer_id,
        //             isActive: 'Y'
        //             // store_name_report: `${item.account_name}${item.branch_name}${item.province_name}`
        //         },
        //         attributes: ['id', 'store_name_report'],
        //         raw: true
        //     });

        //     if (storeData) {
        //         item.store_id = storeData.id; // อัพเดท store_id ใน object
        //         item.store_name_report = storeData.store_name_report;
        //     }
        //     stores.push(item);
        // }
        let conditions_stores = [`mus.isActive = 'Y' AND mus.store_id != 0`];
        let replacements = {};

        if (req.body.group_customer_id) {
            conditions_stores.push(`mus.group_customer_id = :group_customer_id`);
            replacements.group_customer_id = req.body.group_customer_id;
        }

        if (req.body.account_id) {
            conditions_stores.push(`s.account_id = :account_id`);
            replacements.account_id = req.body.account_id;
        }

        if (req.body.channel_id) {
            conditions_stores.push(`s.channel_id = :channel_id`);
            replacements.channel_id = req.body.channel_id;
        }
        if (req.body.position_name == 'พนักงาน') {
            if (dataUser.id) {
                conditions_stores.push(`mus.user_id = :user_id`);
                replacements.user_id = dataUser.id;
            }
        }
        const whereClause_stores = conditions_stores.length > 0 ? `WHERE ${conditions_stores.join(' AND ')}` : '';

        const query_stores = `
            SELECT mus.*, 
                s.id AS store_id, 
                s.store_name AS store_name,
                s.store_code AS store_code,
                a.id AS account_id,
                a.name AS account_name,
                s.store_name_report AS store_name_report
            FROM tb_map_user_store_list mus
            LEFT JOIN tb_store s ON mus.store_id = s.id
            LEFT JOIN tb_account a ON s.account_id = a.id
            ${whereClause_stores}
            GROUP BY s.store_code, mus.group_customer_id, mus.id,s.store_name_report
        `;

        var stores = await db.sequelize.query(query_stores, {
            replacements,
            type: db.Sequelize.QueryTypes.SELECT
        });
        // let accounts = [];
        // let uniqueAccounts = new Map();

        // for (const item of MapProductStorex) {
        //     let storeData = await db.Store.findOne({
        //         where: {
        //             ...whereConditions_Accounts,
        //             isActive: 'Y'
        //         },
        //         attributes: ['id'],
        //         raw: true
        //     });

        //     if (storeData) {
        //         item.store_id = storeData.id; // อัพเดท store_id ใน object
        //     }

        //     // ✅ ตรวจสอบว่ามี account_id นี้อยู่ใน Map หรือไม่
        //     if (!uniqueAccounts.has(item.account_id)) {
        //         uniqueAccounts.set(item.account_id, item);
        //     }
        // }

        // // ✅ แปลงค่าจาก Map เป็น Array (เก็บเฉพาะค่าที่ไม่ซ้ำ)
        // accounts = Array.from(uniqueAccounts.values());
        let conditions_accounts = [`mus.isActive = 'Y' AND mus.store_id != 0`];

        if (req.body.group_customer_id) {
            conditions_accounts.push(`mus.group_customer_id = :group_customer_id`);
        }

        if (req.body.channel_id) {
            conditions_accounts.push(`s.channel_id = :channel_id`);
        }
        if (req.body.position_name == 'พนักงาน') {
            if (dataUser.id) {
                conditions_accounts.push(`mus.user_id = :user_id`);
            }
        }
        const whereClause_accounts = conditions_accounts.length > 0 ? `WHERE ${conditions_accounts.join(' AND ')}` : '';

        const query_accounts = `
            SELECT mus.*, 
                mus.store_id AS store_id, 
                s.store_name AS store_name,
                s.store_code AS store_code,
                a.id AS account_id,
                a.name AS account_name,
                s.provinces_id,
                p.name_in_thai
            FROM tb_map_user_store_list mus
            LEFT JOIN tb_store s ON mus.store_id = s.id
            LEFT JOIN tb_account a ON s.account_id = a.id
            LEFT JOIN tb_provinces p ON s.provinces_id = p.id
            ${whereClause_accounts}
            GROUP BY account_id,s.store_code, mus.group_customer_id, mus.id
        `;

        var Map__accounts = await db.sequelize.query(query_accounts, {
            replacements,
            type: db.Sequelize.QueryTypes.SELECT
        });
        var accounts = [
            ...new Map(
                Map__accounts
                    .filter(item => item.account_id) // เผื่อมี null
                    .map(item => [item.account_id, item]) // ใช้ account_id เป็น key
            ).values()
        ];
        var provinces = [
            ...new Map(
                Map__accounts
                    .filter(item => item.provinces_id) // เผื่อมี null
                    .map(item => [item.provinces_id, item]) // ใช้ provinces_id เป็น key
            ).values()
        ];
        
        // let provinces = [];
        // let uniqueProvinces = new Map();

        // for (const item of MapProductStorex) {
        //     // ✅ ดึงข้อมูลจาก tb_store
        //     let storeData = await db.Store.findOne({
        //         where: {
        //             group_customer_id: item.group_customer_id,
        //             store_code: item.store_code,
        //             account_id: item.account_id,
        //             account_type_id: item.account_type_id,
        //             isActive: 'Y'
        //         },
        //         attributes: ['id', 'provinces_id'],
        //         raw: true
        //     });

        //     if (storeData) {
        //         item.store_id = storeData.id; // ✅ อัพเดท store_id
        //         item.provinces_id = storeData.provinces_id; // ✅ ดึงค่า provinces_id

        //         // ✅ ดึงชื่อจังหวัดจาก tb_provinces
        //         let provinceData = await db.Provinces.findOne({
        //             where: { 
        //                 id: storeData.provinces_id,
        //                 isActive: 'Y'
        //             },
        //             attributes: ['name_in_thai'],
        //             raw: true
        //         });

        //         if (provinceData) {
        //             item.name_in_thai = provinceData.name_in_thai; // ✅ ดึงค่า name_in_thai
        //         }

        //         // ✅ ตรวจสอบว่ามี provinces_id นี้อยู่ใน Map หรือไม่
        //         if (!uniqueProvinces.has(item.provinces_id) && item.name_in_thai != undefined) {
        //             uniqueProvinces.set(item.provinces_id, {
        //                 id: item.provinces_id,
        //                 name_in_thai: item.name_in_thai
        //             });
        //         }
        //     }
        // }

        // ✅ แปลงค่าจาก Map เป็น Array (เก็บเฉพาะค่าที่ไม่ซ้ำ)
        // provinces = Array.from(uniqueProvinces.values());
        // //console.log(channelsIds);
        // ✅ ใช้ Promise.all() เพื่อดึงข้อมูลทั้งหมดแบบขนาน ลดเวลารอ
        const [
            products,
            GroupCustomers,
            areaManagers,
            areaSupervisors,
            users,
            channels,
        ] = await Promise.all([
            db.Product.findAll({
                where: categoryId ? { 
                    categoryId: { [Op.eq]: categoryId },
                    group_customer_id:req.body.group_customer_id,
                    isActive: 'Y'
                } : {
                    group_customer_id:req.body.group_customer_id,
                    isActive: 'Y'
                },
                attributes: ['id', 'name', 'categoryId', 'flavor']
            }), // ✅ Product Name (กรองตาม Category)
            db.GroupCustomer.findAll({ 
                attributes: ['id', 'name'], 
                where: {
                    ...whereConditions_GroupCustomer,
                    isActive: 'Y'
                }, 
            }), // ✅ Manager (VIP1)

            db.AreaManager.findAll({
                where: { 
                    id: AreaManagerIds,
                    isActive: 'Y'
                }, // ✅ ค้นหา AreaManager ตาม id ที่เจอ
                attributes: ['id', 'name'],
                raw: true
            }),
            // db.AreaManager.findAll({
            //     where: manager_id ? { id: { [Op.eq]: manager_id } } : {},
            //     attributes: ['id', 'name']
            // }), // ✅ Area Manager (VIP2) (กรองตาม Manager)
            db.AreaSupervisor.findAll({
                where: { 
                    id: areaSupervisorsIds,
                    isActive: 'Y'
                }, // ✅ ค้นหา AreaManager ตาม id ที่เจอ
                attributes: ['id', 'name'],
                raw: true
            }),
            // db.AreaSupervisor.findAll({
            //     where: area_manager_id ? { id: { [Op.eq]: area_manager_id } } : {},
            //     attributes: ['id', 'name']
            // }), // ✅ Supervisor (กรองตาม Area Manager)
            db.User.findAll({
                where: {
                    group_customer_id:dataUser.group_customer_id,
                    area_supervisor:dataUser.area_supervisor,
                    area_manager:dataUser.area_manager,
                    isActive: 'Y'
                },
                attributes: ['id', 'name', 'last_name', 'area_supervisor', 'area_manager'],
                include: [{ model: db.Position, as: 'position', where: whereConditions_User_position, }],
            }), // ✅ Employee (กรองตาม Supervisor)
            db.Channel.findAll({
                where: { 
                    id: channelsIds,
                    isActive: 'Y' 
                }, // ✅ ค้นหา AreaManager ตาม id ที่เจอ
                attributes: ['id', 'name'],
                raw: true
            }),
            // db.Channel.findAll({ attributes: ['id', 'name'] }), // ✅ Channel
            // db.Account.findAll({ where: { id: AccountsIds },attributes: ['id', 'name'] }), // ✅ Account
            // db.Store.findAll({
            //     where:whereConditions_store,
            //     attributes: ['id', 'store_name'],
            //     limit: 100, // ✅ ดึงข้อมูลเพียง 100 รายการ เพื่อลดการโหลดข้อมูล
            //     order: [['updatedAt', 'DESC']]
            // }), // ✅ Store (ลดจำนวนที่โหลด)
            // db.Provinces.findAll({ attributes: ['id', 'name_in_thai'] }) // ✅ Province
        ]);

        // ✅ ส่งข้อมูลกลับไปยัง Frontend
        res.send({
            status: "success",
            data: {
                brands,
                subBrands,
                categories,
                products,
                GroupCustomers,
                areaManagers,
                areaSupervisors,
                users,
                channels,
                accounts,
                stores,
                provinces
            }
        });

    } catch (err) {
        console.error("Error:", err);
        res.status(500).send({
            status: "error",
            message: err.message || "ไม่สามารถดึงข้อมูลได้ในตอนนี้!"
        });
    }
}
async function get_all_filters_premiumbk(req, res) {
    try {
        let dataUser = await db.User.findOne({
            where: {
                code: req.body.user_code
            },
        });

        const whereConditions_User_position = {};
        if (req.body.position_name === 'Supervisor') {
            whereConditions_User_position.name = { [Op.ne]: 'Supervisor' };
        }
        //console.log(whereConditions_User_position);
        const whereConditions_AreaManager = {};
        if(req.body.position_name != 'SuperAdmin'){
            if (req.body.group_customer_id) whereConditions_AreaManager.group_customer_id = req.body.group_customer_id;
        }
        const whereConditions_areaSupervisors = {};
        if(req.body.position_name != 'SuperAdmin'){
            if (req.body.group_customer_id) whereConditions_areaSupervisors.group_customer_id = req.body.group_customer_id;
        }
        const whereConditions_Accounts = {};
        if(req.body.position_name != 'SuperAdmin'){
            if (req.body.group_customer_id) whereConditions_Accounts.group_customer_id = req.body.group_customer_id;
            // if (req.body.user_code) whereConditions_Accounts.user_code = req.body.user_code;
            if (req.body.channel_id) whereConditions_Accounts.channel_id = req.body.channel_id;
        }
        const whereConditions_provinces = {};
        if(req.body.position_name != 'SuperAdmin'){
            if (req.body.group_customer_id) whereConditions_provinces.group_customer_id = req.body.group_customer_id;
            if (req.body.channel_id) whereConditions_provinces.channel_id = req.body.channel_id;
            if (req.body.account_id) whereConditions_provinces.account_id = req.body.account_id;
            if (req.body.store_code) whereConditions_provinces.store_code = req.body.store_code;
        }
        const whereConditions_store = {};
        if (req.body.group_customer_id) whereConditions_store.group_customer_id = req.body.group_customer_id;
        if (req.body.channel_id) whereConditions_store.channel_id = req.body.channel_id;
        if (req.body.account_id) whereConditions_store.account_id = req.body.account_id;
        if (req.body.provinces_id) whereConditions_store.provinces_id = req.body.provinces_id;

        const whereConditions_GroupCustomer = {};
        if(req.body.position_name != 'SuperAdmin'){
            if (req.body.group_customer_id) whereConditions_GroupCustomer.id = req.body.group_customer_id;
        }
        

        // ✅ รับค่าจาก Frontend
        const {
            brand_id,       // กรอง Sub Brand
            categoryId,    // กรอง Product Name
            manager_id,     // กรอง Area Manager
            area_manager_id, // กรอง Supervisor
            area_supervisor // กรอง Employee
        } = req.body;

        // ✅ ดึง brand_id จาก tb_product แบบไม่ซ้ำ และ Join กับ tb_brand
        const [brands, categories, subBrands] = await Promise.all([
            db.Product.findAll({
                attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('brand_id')), 'id']],
                include: [{ model: db.Brand, as: 'brand', attributes: ['id', 'name'] }],
                where: { brand_id: { [Op.ne]: 0 },group_customer_id:req.body.group_customer_id },
                raw: true
            }),
            
            db.Product.findAll({
                attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('categoryId')), 'id']],
                include: [
                    { 
                        model: db.Category, as: 'category', attributes: ['id', 'name'] 
                    }
                ],
                where: { 
                    categoryId: { [Op.ne]: 0 },
                    group_customer_id:req.body.group_customer_id,
                    promotion_id: { [Op.gt]: 0 }
                },
                raw: true
            }),
            
            db.Product.findAll({
                attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('sub_brand_id')), 'id']],
                include: [{ model: db.SubBrand, as: 'subBrand', attributes: ['id', 'name'] }],
                where: { sub_brand_id: { [Op.ne]: 0 },group_customer_id:req.body.group_customer_id },
                raw: true
            })
        ]);

        let AreaManagerdata = await db.MapUserArea.findAll({
            // attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('area_manager_id')), 'area_manager_id']], // ✅ ใช้ DISTINCT
            where: whereConditions_AreaManager,
            // raw: true
        });
        const AreaManagerIds = AreaManagerdata.map(item => item.area_manager_id);
        
        let AreaSupervisorsdata = await db.MapUserArea.findAll({
            attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('area_supervisor_id')), 'area_supervisor_id']], // ✅ ใช้ DISTINCT
            where: whereConditions_areaSupervisors,
            raw: true
        });
        const areaSupervisorsIds = AreaSupervisorsdata.map(item => item.area_supervisor_id);
        
        let channelssdata = await db.Store.findAll({
            attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('channel_id')), 'channel_id']], // ✅ ใช้ DISTINCT
            where: whereConditions_AreaManager,
            raw: true
        });
        const channelsIds = channelssdata.map(item => item.channel_id);

        // let Accountsdata = await db.MapProductStore.findAll({
        //     attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('account_id')), 'account_id']], // ✅ ใช้ DISTINCT
        //     where: whereConditions_Accounts,
        //     raw: true
        // });
        // const AccountsIds = Accountsdata.map(item => item.account_id);

        let MapProductStorex = await db.MapProductStore.findAll({
            where: {
                user_code: req.body.user_code
            },
            raw: true // ใช้ raw เพื่อให้ได้ผลลัพธ์เป็น object แทน instance ของ Sequelize
        });

        let stores = [];

        for (const item of MapProductStorex) {
            let storeData = await db.Store.findOne({
                where: { 
                    store_code: item.store_code,
                    group_customer_id: item.group_customer_id,
                    isActive: 'Y'
                    // store_name_report: `${item.account_name}${item.branch_name}${item.province_name}`
                },
                attributes: ['id', 'store_name_report'],
                raw: true
            });

            if (storeData) {
                item.store_id = storeData.id; // อัพเดท store_id ใน object
                item.store_name_report = storeData.store_name_report;
            }
            stores.push(item);
        }

        let accounts = [];
        let uniqueAccounts = new Map();

        for (const item of MapProductStorex) {
            let storeData = await db.Store.findOne({
                where: whereConditions_Accounts,
                attributes: ['id'],
                raw: true
            });

            if (storeData) {
                item.store_id = storeData.id; // อัพเดท store_id ใน object
            }

            // ✅ ตรวจสอบว่ามี account_id นี้อยู่ใน Map หรือไม่
            if (!uniqueAccounts.has(item.account_id)) {
                uniqueAccounts.set(item.account_id, item);
            }
        }

        // ✅ แปลงค่าจาก Map เป็น Array (เก็บเฉพาะค่าที่ไม่ซ้ำ)
        accounts = Array.from(uniqueAccounts.values());

        let provinces = [];
        let uniqueProvinces = new Map();

        for (const item of MapProductStorex) {
            // ✅ ดึงข้อมูลจาก tb_store
            let storeData = await db.Store.findOne({
                where: {
                    id: item.store_id,
                    group_customer_id: item.group_customer_id,
                    store_code: item.store_code,
                    account_id: item.account_id,
                    account_type_id: item.account_type_id
                },
                attributes: ['id', 'provinces_id'],
                raw: true
            });

            if (storeData) {
                item.store_id = storeData.id; // ✅ อัพเดท store_id
                item.provinces_id = storeData.provinces_id; // ✅ ดึงค่า provinces_id

                // ✅ ดึงชื่อจังหวัดจาก tb_provinces
                let provinceData = await db.Provinces.findOne({
                    where: { id: storeData.provinces_id },
                    attributes: ['name_in_thai'],
                    raw: true
                });

                if (provinceData) {
                    item.name_in_thai = provinceData.name_in_thai; // ✅ ดึงค่า name_in_thai
                }

                // ✅ ตรวจสอบว่ามี provinces_id นี้อยู่ใน Map หรือไม่
                if (!uniqueProvinces.has(item.provinces_id)) {
                    uniqueProvinces.set(item.provinces_id, {
                        id: item.provinces_id,
                        name_in_thai: item.name_in_thai
                    });
                }
            }
        }

        // ✅ แปลงค่าจาก Map เป็น Array (เก็บเฉพาะค่าที่ไม่ซ้ำ)
        provinces = Array.from(uniqueProvinces.values());
        // //console.log(channelsIds);
        // ✅ ใช้ Promise.all() เพื่อดึงข้อมูลทั้งหมดแบบขนาน ลดเวลารอ

        const whereConditionsxxx = {
            promotion_id: { [Op.in]: [1, 2, 3] },
            group_customer_id: req.body.group_customer_id
        };
        
        // ตรวจสอบว่ามีการส่งค่า categoryId มาหรือไม่
        if (req.body.categoryId) {
            whereConditionsxxx.categoryId = req.body.categoryId;
        }
        
        const [
            products,
            GroupCustomers,
            areaManagers,
            areaSupervisors,
            users,
            channels,
        ] = await Promise.all([
            db.Product.findAll({
            where: whereConditionsxxx,
            attributes: ['id', 'name', 'categoryId', 'flavor']
            }),
            
            db.GroupCustomer.findAll({ attributes: ['id', 'name'], where:whereConditions_GroupCustomer, }), // ✅ Manager (VIP1)

            db.AreaManager.findAll({
                where: { id: AreaManagerIds }, // ✅ ค้นหา AreaManager ตาม id ที่เจอ
                attributes: ['id', 'name'],
                raw: true
            }),
            // db.AreaManager.findAll({
            //     where: manager_id ? { id: { [Op.eq]: manager_id } } : {},
            //     attributes: ['id', 'name']
            // }), // ✅ Area Manager (VIP2) (กรองตาม Manager)
            db.AreaSupervisor.findAll({
                where: { id: areaSupervisorsIds }, // ✅ ค้นหา AreaManager ตาม id ที่เจอ
                attributes: ['id', 'name'],
                raw: true
            }),
            // db.AreaSupervisor.findAll({
            //     where: area_manager_id ? { id: { [Op.eq]: area_manager_id } } : {},
            //     attributes: ['id', 'name']
            // }), // ✅ Supervisor (กรองตาม Area Manager)
            db.User.findAll({
                where: {
                    group_customer_id:dataUser.group_customer_id,
                    area_supervisor:dataUser.area_supervisor,
                    area_manager:dataUser.area_manager,
                },
                attributes: ['id', 'name', 'last_name', 'area_supervisor', 'area_manager'],
                include: [{ model: db.Position, as: 'position', where: whereConditions_User_position, }],
            }), // ✅ Employee (กรองตาม Supervisor)
            db.Channel.findAll({
                where: { id: channelsIds }, // ✅ ค้นหา AreaManager ตาม id ที่เจอ
                attributes: ['id', 'name'],
                raw: true
            }),
            // db.Channel.findAll({ attributes: ['id', 'name'] }), // ✅ Channel
            // db.Account.findAll({ where: { id: AccountsIds },attributes: ['id', 'name'] }), // ✅ Account
            // db.Store.findAll({
            //     where:whereConditions_store,
            //     attributes: ['id', 'store_name'],
            //     limit: 100, // ✅ ดึงข้อมูลเพียง 100 รายการ เพื่อลดการโหลดข้อมูล
            //     order: [['updatedAt', 'DESC']]
            // }), // ✅ Store (ลดจำนวนที่โหลด)
            // db.Provinces.findAll({ attributes: ['id', 'name_in_thai'] }) // ✅ Province
        ]);

        // ✅ ส่งข้อมูลกลับไปยัง Frontend
        res.send({
            status: "success",
            data: {
                brands,
                subBrands,
                categories,
                products,
                GroupCustomers,
                areaManagers,
                areaSupervisors,
                users,
                channels,
                accounts,
                stores,
                provinces
            }
        });

    } catch (err) {
        console.error("Error:", err);
        res.status(500).send({
            status: "error",
            message: err.message || "ไม่สามารถดึงข้อมูลได้ในตอนนี้!"
        });
    }
}
async function get_all_filters_areaManagers(req, res) {
    try {
        const whereConditions = {};
        whereConditions.isActive = 'Y';
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;

        let data = await db.MapUserArea.findAll({
            attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('area_manager_id')), 'area_manager_id']], // ✅ ใช้ DISTINCT
            where: {
                ...whereConditions,
                isActive: 'Y'
            },
            raw: true
        });
        const AreaManagerIds = data.map(item => item.area_manager_id);

        let AreaManagers = await db.AreaManager.findAll({
            where: { 
                id: AreaManagerIds,
                isActive: 'Y'
            }, // ✅ ค้นหา AreaManager ตาม id ที่เจอ
            attributes: ['id', 'name'],
            raw: true
        });

        res.send({ status: "success", data: AreaManagers });

    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_filters_areaSupervisors(req, res) {
    try {
        const whereConditions = {};
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        if (req.body.area_manager_id) whereConditions.area_manager_id = req.body.area_manager_id;
        
        whereConditions.isActive = 'Y';

        let data = await db.MapUserArea.findAll({
            attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('area_supervisor_id')), 'area_supervisor_id']], // ✅ ใช้ DISTINCT
            where: whereConditions,
            raw: true
        });
        const AreaSupervisorIds = data.map(item => item.area_supervisor_id);

        let AreaSupervisors = await db.AreaSupervisor.findAll({
            where: { id: AreaSupervisorIds }, // ✅ ค้นหา AreaSupervisor ตาม id ที่เจอ
            attributes: ['id', 'name'],
            raw: true
        });

        res.send({ status: "success", data: AreaSupervisors });

    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_filters_users(req, res) {
    try {
        const whereConditions = {};
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        if (req.body.area_manager) whereConditions.area_manager = req.body.area_manager;
        if (req.body.area_supervisor) whereConditions.area_supervisor = req.body.area_supervisor;

        whereConditions.isActive = 'Y';

        let data = await db.User.findAll({
            attributes: ['id', 'name', 'last_name', 'area_supervisor', 'area_manager'],
            where: whereConditions,
            include: [{
                model: db.Position,
                as: 'position', // 👈 เปลี่ยน 'positionData' เป็น 'position'
                attributes: ['id', 'name'],
                where: {
                    name: 'พนักงาน' 
                },
                required: true 
            }],
            raw: true
        });

        res.send({ status: "success", data: data });

    } catch (err) {
        console.error("Error in get_all_filters_users:", err); 
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_filters_channel(req, res) {
    try {
        const whereConditions = {};
        let conditions = [`mus.isActive = 'Y' AND mus.store_id != 0`];
        let replacements = {};

        if (req.body.group_customer_id) {
            conditions.push(`mus.group_customer_id = :group_customer_id`);
            replacements.group_customer_id = req.body.group_customer_id;
        }
        if (req.body.area_manager) {
            conditions.push(`u.area_manager = :area_manager`);
            replacements.area_manager = req.body.area_manager;
        }
        if (req.body.area_supervisor) {
            conditions.push(`u.area_supervisor = :area_supervisor`);
            replacements.area_supervisor = req.body.area_supervisor;
        }
        if (req.body.filter_user_id) {
            conditions.push(`mus.user_id = :user_id`);
            replacements.user_id = req.body.filter_user_id;
        }else{
            if (req.body.position_name == 'พนักงาน') {
                if (req.body.user_id) {
                    conditions.push(`mus.user_id = :user_id`);
                    replacements.user_id = req.body.user_id;
                }
            }
        }
        if (req.body.account_id) {
            conditions.push(`s.account_id = :account_id`);
            replacements.account_id = req.body.account_id;
        }

        if (req.body.channel_id) {
            conditions.push(`s.channel_id = :channel_id`);
            replacements.channel_id = req.body.channel_id;
        }
        
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const query = `
            SELECT ch.id AS id,
                ch.name AS name,
                s.group_customer_id
            FROM tb_map_user_store_list mus
            LEFT JOIN tb_store s ON mus.store_id = s.id
            LEFT JOIN tb_account a ON s.account_id = a.id
            LEFT JOIN tb_channel ch ON s.channel_id = ch.id
            LEFT JOIN tb_user u ON mus.user_id = u.id
            ${whereClause}
            GROUP BY id, name,s.group_customer_id
        `;

        var MapProductStorex = await db.sequelize.query(query, {
            replacements,
            type: db.Sequelize.QueryTypes.SELECT
        });
        
        res.send({ status: "success", data: MapProductStorex });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_filters_account(req, res) {
    try {
        const whereConditions = {};
        
                let conditions = [`mus.isActive = 'Y' AND mus.store_id != 0`];
                let replacements = {};

                if (req.body.group_customer_id) {
                    conditions.push(`mus.group_customer_id = :group_customer_id`);
                    replacements.group_customer_id = req.body.group_customer_id;
                }
                if (req.body.area_manager) {
                    conditions.push(`u.area_manager = :area_manager`);
                    replacements.area_manager = req.body.area_manager;
                }
                if (req.body.area_supervisor) {
                    conditions.push(`u.area_supervisor = :area_supervisor`);
                    replacements.area_supervisor = req.body.area_supervisor;
                }
                if (req.body.filter_user_id) {
                    conditions.push(`mus.user_id = :user_id`);
                    replacements.user_id = req.body.filter_user_id;
                }else{
                    if (req.body.position_name == 'พนักงาน') {
                        if (req.body.user_id) {
                            conditions.push(`mus.user_id = :user_id`);
                            replacements.user_id = req.body.user_id;
                        }
                    }
                }
                if (req.body.channel_id) {
                    conditions.push(`s.channel_id = :channel_id`);
                    replacements.channel_id = req.body.channel_id;
                }
                
                const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

                const query = `
                    SELECT mus.*, 
                        s.id AS store_id, 
                        s.store_name AS store_name,
                        s.store_code AS store_code,
                        a.id AS account_id,
                        a.name AS account_name,
                        p.name AS position_name
                    FROM tb_map_user_store_list mus
                    LEFT JOIN tb_store s ON mus.store_id = s.id
                    LEFT JOIN tb_account a ON s.account_id = a.id
                    LEFT JOIN tb_user u ON mus.user_id = u.id
                    LEFT JOIN tb_position p ON u.position_id = p.id
                    ${whereClause}
                    AND p.name LIKE 'พนักงาน'
                    AND u.isActive = 'Y'
                    GROUP BY account_id,s.store_code, mus.group_customer_id, mus.id
                `;

                var MapProductStorexxx = await db.sequelize.query(query, {
                    replacements,
                    type: db.Sequelize.QueryTypes.SELECT
                });
                var MapProductStorex = [
                    ...new Map(
                        MapProductStorexxx
                            .filter(item => item.account_id) // เผื่อมี null
                            .map(item => [item.account_id, item]) // ใช้ account_id เป็น key
                    ).values()
                ];
                // if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
                // // if (req.body.channel_id) whereConditions_store.channel_id = req.body.channel_id;
                // // if (req.body.channel_id) whereConditions_store.channel_id = req.body.channel_id;
                // // if (req.body.provinces_id) whereConditions_store.provinces_id = req.body.provinces_id;
                // var MapProductStorex = await db.MapProductStore.findAll({
                //     where: {
                //         ...whereConditions,
                //         isActive: 'Y'
                //     },
                //     group: ['account_id'],
                //     raw: true // ใช้ raw เพื่อให้ได้ผลลัพธ์เป็น object แทน instance ของ Sequelize
                // });
            // }
            
        // }
        
        let stores = [];
        for (const item of MapProductStorex) {
            let storeData = await db.Store.findOne({
                where: { 
                    id: item.store_id,
                    // channel_id: req.body.channel_id,
                    // group_customer_id: item.group_customer_id,
                    // store_code: item.store_code,
                    isActive: 'Y'
                    // store_name_report: `${item.account_name}${item.branch_name}${item.province_name}`
                },
                attributes: ['id', 'store_name_report'],
                raw: true
            });

            if (storeData) {
                item.store_id = storeData.id; // อัพเดท store_id ใน object
                item.store_name_report = storeData.store_name_report
            }
            stores.push(item);
        }
        res.send({ status: "success", data: stores });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_filters_Store(req, res) {
    try {
        const whereConditions = {};
        // if (req.body.position_name != 'SuperAdmin' && req.body.position_name != 'Admin') {
            // if (req.body.position_name == 'พนักงาน') {
            //     if (req.body.user_id) whereConditions.user_id = req.body.user_id;
            //     if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
            //     if (req.body.channel_id) whereConditions.channel_id = req.body.channel_id;
            //     if (req.body.account_id) whereConditions.account_id = req.body.account_id;
            //     var MapProductStorex = await db.sequelize.query(
            //         `SELECT mus.*, 
            //                 mus.store_id AS store_id,  
            //                 s.store_name AS store_name,
            //                 s.store_code AS store_code,
            //                 a.id AS account_id,
            //                 a.name AS account_name
            //          FROM tb_map_user_store_list mus
            //          LEFT JOIN tb_store s ON mus.store_id = s.id
            //          LEFT JOIN tb_account a ON s.account_id = a.id
            //          WHERE mus.group_customer_id = :group_customer_id 
            //            AND mus.user_id = :user_id
            //            AND mus.isActive = 'Y'
            //            AND s.account_id = :account_id
            //            AND s.channel_id = :channel_id
            //          GROUP BY s.store_code, mus.group_customer_id`,
            //         {
            //             replacements: {
            //                 group_customer_id: req.body.group_customer_id,
            //                 user_id: req.body.user_id,
            //                 channel_id: req.body.channel_id,
            //                 account_id: req.body.account_id
            //             },
            //             type: db.Sequelize.QueryTypes.SELECT
            //         }
            //     );
            // }else{
                let conditions = [`mus.isActive = 'Y' AND mus.store_id != 0`];
                let replacements = {};

                if (req.body.group_customer_id) {
                    conditions.push(`mus.group_customer_id = :group_customer_id`);
                    replacements.group_customer_id = req.body.group_customer_id;
                }
                if (req.body.area_manager) {
                    conditions.push(`u.area_manager = :area_manager`);
                    replacements.area_manager = req.body.area_manager;
                }
                if (req.body.area_supervisor) {
                    conditions.push(`u.area_supervisor = :area_supervisor`);
                    replacements.area_supervisor = req.body.area_supervisor;
                }
                if (req.body.filter_user_id) {
                    conditions.push(`mus.user_id = :user_id`);
                    replacements.user_id = req.body.filter_user_id;
                }else{
                    if (req.body.position_name == 'พนักงาน') {
                        if (req.body.user_id) {
                            conditions.push(`mus.user_id = :user_id`);
                            replacements.user_id = req.body.user_id;
                        }
                    }
                }
                if (req.body.account_id) {
                    conditions.push(`s.account_id = :account_id`);
                    replacements.account_id = req.body.account_id;
                }

                if (req.body.channel_id) {
                    conditions.push(`s.channel_id = :channel_id`);
                    replacements.channel_id = req.body.channel_id;
                }
                
                const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

                const query = `
                    SELECT mus.*, 
                        mus.store_id AS store_id,  
                        s.store_name AS store_name,
                        s.store_code AS store_code,
                        a.id AS account_id,
                        a.name AS account_name
                    FROM tb_map_user_store_list mus
                    LEFT JOIN tb_store s ON mus.store_id = s.id
                    LEFT JOIN tb_account a ON s.account_id = a.id
                    LEFT JOIN tb_user u ON mus.user_id = u.id
                    ${whereClause}
                    GROUP BY s.store_code, mus.group_customer_id, mus.id
                `;

                var MapProductStorex = await db.sequelize.query(query, {
                    replacements,
                    type: db.Sequelize.QueryTypes.SELECT
                });
                // var MapProductStorex = await db.MapProductStore.findAll({
                //     where: {
                //         ...whereConditions,
                //         isActive: 'Y'
                //     },
                //     group: ['group_customer_id', 'store_code'],
                //     raw: true // ใช้ raw เพื่อให้ได้ผลลัพธ์เป็น object แทน instance ของ Sequelize
                // });
            // }
        // }
        let stores = [];

        for (const item of MapProductStorex) {
            let storeData = await db.Store.findOne({
                where: { 
                    id: item.store_id,
                    // group_customer_id: item.group_customer_id,
                    isActive: 'Y'
                    // store_name_report: `${item.account_name}${item.branch_name}${item.province_name}`
                },
                attributes: ['id', 'store_name_report'],
                raw: true
            });

            if (storeData) {
                item.store_id = storeData.id; // อัพเดท store_id ใน object
                item.store_name_report = storeData.store_name_report;
            }
            stores.push(item);
        }
        res.send({ status: "success", data: stores });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_filters_provinces(req, res) {
    try {
        const whereConditions = {};
        let whereClause = '';
        // if (req.body.position_name != 'SuperAdmin' && req.body.position_name != 'Admin') {
            if (req.body.position_name == 'พนักงาน') {
                if (req.body.user_id) whereConditions.user_id = req.body.user_id;
                if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
                if (req.body.channel_id) whereConditions.channel_id = req.body.channel_id;
                if (req.body.account_id) whereConditions.account_id = req.body.account_id;
                if (req.body.channel_id) whereClause += ` AND s.channel_id = :channel_id`;
                if (req.body.account_id) whereClause += ` AND s.account_id = :account_id`;
                if (req.body.store_code) whereClause += ` AND s.store_code = :store_code`;
                var Provinces = await db.sequelize.query(
                    `SELECT pv.*
                     FROM tb_map_user_store_list mus
                     LEFT JOIN tb_store s ON mus.store_id = s.id
                     LEFT JOIN tb_account a ON s.account_id = a.id
                     LEFT JOIN tb_provinces pv ON s.provinces_id = pv.id
                     WHERE mus.group_customer_id = :group_customer_id 
                       AND mus.user_id = :user_id
                       AND mus.isActive = 'Y'
                       ${whereClause}
                     GROUP BY pv.id`,
                    {
                        replacements: {
                            group_customer_id: req.body.group_customer_id,
                            user_id: req.body.user_id,
                            channel_id: req.body.channel_id,
                            account_id: req.body.account_id,
                            store_code: req.body.store_code
                        },
                        type: db.Sequelize.QueryTypes.SELECT
                    }
                );
            }else{
                let conditions = [`mus.isActive = 'Y' AND mus.store_id != 0`];
                let replacements = {};

                if (req.body.group_customer_id) {
                    conditions.push(`mus.group_customer_id = :group_customer_id`);
                    replacements.group_customer_id = req.body.group_customer_id;
                }

                if (req.body.account_id) {
                    conditions.push(`s.account_id = :account_id`);
                    replacements.account_id = req.body.account_id;
                }

                if (req.body.channel_id) {
                    conditions.push(`s.channel_id = :channel_id`);
                    replacements.channel_id = req.body.channel_id;
                }
                if (req.body.store_id) {
                    conditions.push(`s.id = :store_id`);
                    replacements.store_id = req.body.store_id;
                }
                if (req.body.position_name == 'พนักงาน') {
                    if (req.body.user_id) {
                        conditions.push(`mus.user_id = :user_id`);
                        replacements.user_id = req.body.user_id;
                    }
                }
                const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

                const query = `
                    SELECT pv.*
                    FROM tb_map_user_store_list mus
                    LEFT JOIN tb_store s ON mus.store_id = s.id
                    LEFT JOIN tb_account a ON s.account_id = a.id
                    LEFT JOIN tb_provinces pv ON s.provinces_id = pv.id
                    ${whereClause}
                    GROUP BY pv.id
                `;

                var Provinces = await db.sequelize.query(query, {
                    replacements,
                    type: db.Sequelize.QueryTypes.SELECT
                });
            }
        // }

        res.send({ status: "success", data: Provinces });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_filters_Brands(req, res) {
    try {
        const whereConditions = {};
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        if (req.body.categoryId) whereConditions.categoryId = req.body.categoryId;

        // ✅ ดึงเฉพาะ brand_id ที่ไม่ซ้ำจากตาราง Product
        let data = await db.Product.findAll({
            attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('brand_id')), 'brand_id']], // ✅ ใช้ DISTINCT
            where: whereConditions,
            raw: true
        });

        // ✅ ดึง Brand จริงๆ จาก brand_id ที่ได้มา
        const brandIds = data.map(item => item.brand_id); // ✅ เอาแค่ค่า brand_id

        let brands = await db.Brand.findAll({
            where: { id: brandIds }, // ✅ ค้นหา Brand ตาม id ที่เจอ
            attributes: ['id', 'name'],
            raw: true
        });

        const formattedData = brands.map(Brand => ({
            id: Brand.id,
            'brand.id': Brand.id,
            'brand.name': Brand.name // ✅ เปลี่ยนชื่อ key ที่ระดับ Application
        }));

        res.send({ status: "success", data: formattedData });

    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_filters_subBrands(req, res) {
    try {
        const whereConditions = {};
        if (req.body.brand_id) whereConditions.brand_id = req.body.brand_id;

        // ✅ ค้นหา SubBrand ตาม brand_id ที่ส่งมา
        let data = await db.SubBrand.findAll({
            where: whereConditions,
            attributes: ['id', 'name'] // ✅ ดึงค่าปกติ ไม่ต้องใช้ alias
        });

        // ✅ แปลงชื่อ key 'name' -> 'subBrand.name'
        const formattedData = data.map(subBrand => ({
            id: subBrand.id,
            'subBrand.id': subBrand.id,
            'subBrand.name': subBrand.name // ✅ เปลี่ยนชื่อ key ที่ระดับ Application
        }));

        res.send({ status: "success", data: formattedData });

    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_filters_products(req, res) {
    try {
        const whereConditions = {};
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        if (req.body.categoryId) whereConditions.categoryId = req.body.categoryId;
        if (req.body.brand_id) whereConditions.brand_id = req.body.brand_id;
        if (req.body.sub_brand_id) whereConditions.sub_brand_id = req.body.sub_brand_id;

        // ✅ ค้นหา SubBrand ตาม brand_id ที่ส่งมา
        let data = await db.Product.findAll({
            where: whereConditions,
            attributes: ['id', 'name'] // ✅ ดึงค่าปกติ ไม่ต้องใช้ alias
        });
        res.send({ status: "success", data: data });

    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_filters_products_premium(req, res) {
    try {
        const whereConditions = {};
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        if (req.body.categoryId) whereConditions.categoryId = req.body.categoryId;
        if (req.body.brand_id) whereConditions.brand_id = req.body.brand_id;
        if (req.body.sub_brand_id) whereConditions.sub_brand_id = req.body.sub_brand_id;
        
        if(req.body.promotion_id){
             whereConditions.promotion_id = req.body.promotion_id;
        }else{
            whereConditions.promotion_id = { [Op.in]: [1, 2, 3] };
        }
        
        // ✅ ค้นหา SubBrand ตาม brand_id ที่ส่งมา
        let data = await db.Product.findAll({
            where: whereConditions,
            attributes: ['id', 'name'] // ✅ ดึงค่าปกติ ไม่ต้องใช้ alias
        });
        res.send({ status: "success", data: data });

    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
module.exports = {
    get_all_filters_GroupCustomer,
    get_all_filters,
    get_all_filters_premium,
    get_all_filters_areaManagers,
    get_all_filters_areaSupervisors,
    get_all_filters_users,
    get_all_filters_channel,
    get_all_filters_account,
    get_all_filters_Store,
    get_all_filters_provinces,
    get_all_filters_Brands,
    get_all_filters_subBrands,
    get_all_filters_products,
    get_all_filters_products_premium,
    get_all_filters_map
};