const db = require("../models")

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op
const { Sequelize, where } = require('sequelize');
// function create store
async function create_store(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        await db.Store.create({
            group_customer_id: req.body.group_customer_id,
            channel_id: req.body.channel_id,
            store_code: req.body.store_code,
            store_name: req.body.store_name,
            store_name_report: req.body.store_name_report,
            account_id: req.body.account_id,
            account_type_id: req.body.account_type_id,
            provinces_id: req.body.provinces_id,
            isActive: 'Y'
        })
        res.send({ status: "success", message: "เพิ่มข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
    }
}

//get all store
async function get_all_store(req, res) {
    try {
        const whereConditions = {};
        if(req.body.position_name != "SuperAdmin"){
            if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        }
        // whereConditions.isActive = 'Y';
        let data = await db.Store.findAll({
            where: whereConditions,
            include: [
                {
                    model: db.GroupCustomer,
                    as: 'groupCustomer', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                    required: false, // required: false ทำให้เป็น LEFT JOIN
                },
                {
                    model: db.Channel,
                    as: 'channel', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                    required: false, // required: false ทำให้เป็น LEFT JOIN
                },
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
                {
                    model: db.Provinces,
                    as: 'provinces', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                    required: false, // required: false ทำให้เป็น LEFT JOIN
                },
            ],
            
        });
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_store_user(req, res) {
    try {
        if(req.body.position_name == 'Supervisor'){
            let UserData = await db.User.findOne({
                where: { 
                    id: req.body.user_id,
                },
            });
            var mapUserStoresxxx = await db.MapProductStore.findAll({
                where: {
                    group_customer_id: UserData.group_customer_id,
                },
                raw: true // ใช้ raw เพื่อให้ได้ผลลัพธ์เป็น object แทน instance ของ Sequelize
            });
            const userPromises = mapUserStoresxxx.map(async (store) => {
                let UserDataxxx = await db.User.findOne({
                    where: { 
                        code: store.user_code,
                    },
                    include: [{
                        model: db.Position,
                        as: 'position',
                        attributes: ['name']
                    }]
                });
            
                if (UserDataxxx && UserDataxxx.position && UserDataxxx.position.name !== "Supervisor") {
                    return store;
                }
                return null;
            });
            
            var mapUserStoresx = (await Promise.all(userPromises)).filter(Boolean);
        }else if(req.body.position_name == 'Assistant Management'){
            let UserData = await db.User.findOne({
                where: { 
                    id: req.body.user_id,
                },
            });
            var mapUserStoresxxx = await db.MapProductStore.findAll({
                where: {
                    group_customer_id: UserData.group_customer_id,
                },
                raw: true // ใช้ raw เพื่อให้ได้ผลลัพธ์เป็น object แทน instance ของ Sequelize
            });
            const userPromises = mapUserStoresxxx.map(async (store) => {
                let UserDataxxx = await db.User.findOne({
                    where: { 
                        code: store.user_code,
                    },
                    include: [{
                        model: db.Position,
                        as: 'position',
                        attributes: ['name']
                    }]
                });
            
                if (UserDataxxx && UserDataxxx.position) {
                    return store;
                }
                return null;
            });
            
            var mapUserStoresx = (await Promise.all(userPromises)).filter(Boolean);
        }else if(req.body.position_name == 'Management' || req.body.position_name == 'Admin'){
            let UserData = await db.User.findOne({
                where: { 
                    id: req.body.user_id,
                },
                
            });
            var mapUserStoresx = await db.MapProductStore.findAll({
                where: {
                    group_customer_id: UserData.group_customer_id
                },
                raw: true // ใช้ raw เพื่อให้ได้ผลลัพธ์เป็น object แทน instance ของ Sequelize
            });
        }else{
            const whereCondition = req.body.group_customer_id
                ? { group_customer_id: req.body.group_customer_id }
                : {};

            var mapUserStoresx = await db.MapProductStore.findAll({
                where: {
                    user_code: req.body.user_code
                },
                raw: true // ใช้ raw เพื่อให้ได้ผลลัพธ์เป็น object แทน instance ของ Sequelize
            });
        }
        

        let updatedUserStores = [];

        for (const item of mapUserStoresx) {
            let storeData = await db.Store.findOne({
                where: { 
                    store_code: item.store_code,
                    store_name_report: `${item.account_name}${item.branch_name}${item.province_name}`
                },
                attributes: ['id'],
                raw: true
            });

            if (storeData) {
                item.store_id = storeData.id; // อัพเดท store_id ใน object
            }
            updatedUserStores.push(item);
        }

        res.send({ status: "success", data: updatedUserStores });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_store_user2(req, res) {
    try {
        if(req.body.position_name == 'SuperAdmin'){
            var mapUserStoresxxx = await db.MapProductStore.findAll({
                raw: true // ใช้ raw เพื่อให้ได้ผลลัพธ์เป็น object แทน instance ของ Sequelize
            });
            const userPromises = mapUserStoresxxx.map(async (store) => {
                let UserDataxxx = await db.User.findOne({
                    where: { 
                        code: store.user_code,
                    },
                    include: [{
                        model: db.Position,
                        as: 'position',
                        attributes: ['name']
                    }]
                });
            
                if (UserDataxxx && UserDataxxx.position && UserDataxxx.position.name !== "Supervisor") {
                    return store;
                }
                return null;
            });
            
            var mapUserStoresx = (await Promise.all(userPromises)).filter(Boolean);
        }else if(req.body.position_name == 'Supervisor'){
            let UserData = await db.User.findOne({
                where: { 
                    id: req.body.user_id,
                },
            });
            var mapUserStoresxxx = await db.MapProductStore.findAll({
                where: {
                    group_customer_id: UserData.group_customer_id,
                },
                raw: true // ใช้ raw เพื่อให้ได้ผลลัพธ์เป็น object แทน instance ของ Sequelize
            });
            const userPromises = mapUserStoresxxx.map(async (store) => {
                let UserDataxxx = await db.User.findOne({
                    where: { 
                        code: store.user_code,
                    },
                    include: [{
                        model: db.Position,
                        as: 'position',
                        attributes: ['name']
                    }]
                });
            
                if (UserDataxxx && UserDataxxx.position && UserDataxxx.position.name !== "Supervisor") {
                    return store;
                }
                return null;
            });
            
            var mapUserStoresx = (await Promise.all(userPromises)).filter(Boolean);
        }else if(req.body.position_name == 'Assistant Management'){
            let UserData = await db.User.findOne({
                where: { 
                    id: req.body.user_id,
                },
            });
            var mapUserStoresxxx = await db.MapProductStore.findAll({
                where: {
                    group_customer_id: UserData.group_customer_id,
                },
                raw: true // ใช้ raw เพื่อให้ได้ผลลัพธ์เป็น object แทน instance ของ Sequelize
            });
            const userPromises = mapUserStoresxxx.map(async (store) => {
                let UserDataxxx = await db.User.findOne({
                    where: { 
                        code: store.user_code,
                    },
                    include: [{
                        model: db.Position,
                        as: 'position',
                        attributes: ['name']
                    }]
                });
            
                if (UserDataxxx && UserDataxxx.position) {
                    return store;
                }
                return null;
            });
            
            var mapUserStoresx = (await Promise.all(userPromises)).filter(Boolean);
        }else if(req.body.position_name == 'Management' || req.body.position_name == 'Admin'){
            let UserData = await db.User.findOne({
                where: { 
                    id: req.body.user_id,
                },
                
            });
            var mapUserStoresx = await db.MapUserStorelist.findAll({
                where: {
                    group_customer_id: req.body.group_customer_id,
                    user_id: req.body.user_id
                },
                include: [
                    {
                        model: db.Store,
                        as: 'store', // ชื่อ alias ที่ตั้งไว้ใน model
                        required: false, // เลือกเฉพาะฟิลด์ที่ต้องการ (เช่น name)
                    },
                ],
                raw: true // ใช้ raw เพื่อให้ได้ผลลัพธ์เป็น object แทน instance ของ Sequelize
            });
        }else{
            const whereCondition = req.body.group_customer_id
                ? { group_customer_id: req.body.group_customer_id }
                : {};

            var mapUserStoresx = await db.MapProductStore.findAll({
                where: {
                    user_code: req.body.user_code
                },
                raw: true // ใช้ raw เพื่อให้ได้ผลลัพธ์เป็น object แทน instance ของ Sequelize
            });
        }
        

        // let updatedUserStores = [];

        // for (const item of mapUserStoresx) {
        //     let storeData = await db.Store.findOne({
        //         where: { 
        //             store_code: item.store_code,
        //             store_name_report: `${item.account_name}${item.branch_name}${item.province_name}`
        //         },
        //         attributes: ['id'],
        //         raw: true
        //     });

        //     if (storeData) {
        //         item.store_id = storeData.id; // อัพเดท store_id ใน object
        //     }
        //     updatedUserStores.push(item);
        // }

        
        if(req.body.position_name == 'พนักงาน'){
            var whereConditions = {
                group_customer_id: req.body.group_customer_id,
                user_id: req.body.user_id
            };
            var mapUserStoresxzzz = await db.sequelize.query(
                `   SELECT 
                        s.*,
                        mus.store_id,
                        ac.name AS account_name,
                        act.name AS account_type_name,
                        pv.name_in_thai
                    FROM tb_map_user_store_list mus
                    LEFT JOIN tb_store s ON mus.store_id = s.id
                    LEFT JOIN tb_account ac ON s.account_id = ac.id
                    LEFT JOIN tb_account_type act ON s.account_type_id = act.id
                    LEFT JOIN tb_provinces pv ON s.provinces_id = pv.id
                    WHERE mus.group_customer_id = :group_customer_id AND mus.isActive = 'Y' AND s.isActive = 'Y'
                    AND mus.user_id = :user_id`,
                {
                    replacements: whereConditions,
                    type: Sequelize.QueryTypes.SELECT
                }
            );
            // var mapUserStoresxzzz = await db.sequelize.query(
            //     `   SELECT 
            //             mus.group_customer_id,
            //             gc.name as group_customer_name, 
            //             s.account_id, 
            //             s.account_type_id, 
            //             ac.name as account_name, 
            //             act.name as account_type_name, 
            //             MIN(s.id) AS store_id,  -- เลือก store_id ที่มีค่าน้อยที่สุดในกลุ่ม
            //             GROUP_CONCAT(s.store_name SEPARATOR ', ') AS store_names,
            //             pv.name_in_thai 
            //         FROM tb_map_user_store_list mus
            //         LEFT JOIN tb_store s ON mus.store_id = s.id
            //         LEFT JOIN tb_group_customer gc ON mus.group_customer_id = gc.id
            //         LEFT JOIN tb_account ac ON s.account_id = ac.id
            //         LEFT JOIN tb_account_type act ON s.account_type_id = act.id
            //         LEFT JOIN tb_provinces pv ON mus.provinces_id = pv.id
            //         WHERE mus.group_customer_id = :group_customer_id 
            //         AND mus.user_id = :user_id
            //         GROUP BY s.account_id, s.account_type_id, pv.name_in_thai;`,
            //     {
            //         replacements: whereConditions,
            //         type: Sequelize.QueryTypes.SELECT
            //     }
            // );
        }else{
            if(req.body.position_name == 'SuperAdmin'){
                if(req.body.select_user_id){
                    var whereConditions = {
                        user_id: req.body.select_user_id,
                    };
                    var mapUserStoresxzzz = await db.sequelize.query(
                        `   SELECT 
                                mus.group_customer_id,
                                gc.name as group_customer_name, 
                                s.account_id, 
                                s.account_type_id,
                                s.store_code,
                                s.store_name,
                                s.isActive,
                                ac.name as account_name, 
                                act.name as account_type_name, 
                                MIN(s.id) AS store_id,  -- เลือก store_id ที่มีค่าน้อยที่สุดในกลุ่ม
                                GROUP_CONCAT(s.store_name SEPARATOR ', ') AS store_names,
                                pv.name_in_thai 
                            FROM tb_map_user_store_list mus
                            LEFT JOIN tb_store s ON mus.store_id = s.id
                            LEFT JOIN tb_group_customer gc ON mus.group_customer_id = gc.id
                            LEFT JOIN tb_account ac ON s.account_id = ac.id
                            LEFT JOIN tb_account_type act ON s.account_type_id = act.id
                            LEFT JOIN tb_provinces pv ON s.provinces_id = pv.id
                            WHERE mus.isActive = 'Y' AND s.isActive = 'Y'
                            AND mus.user_id = :user_id 
                            AND s.account_id IS NOT NULL
                            AND act.isActive = 'Y'
                            GROUP BY s.account_id, s.account_type_id, pv.name_in_thai,s.store_code,s.store_name,mus.group_customer_id,s.isActive;`,
                        {
                            replacements: whereConditions,
                            type: Sequelize.QueryTypes.SELECT
                        }
                    );
                }else{
                    var mapUserStoresxzzz = await db.sequelize.query(
                        `   SELECT 
                                mus.group_customer_id,
                                gc.name as group_customer_name, 
                                s.account_id, 
                                s.account_type_id,
                                s.store_code,
                                s.store_name,
                                s.isActive,
                                ac.name as account_name, 
                                act.name as account_type_name, 
                                MIN(s.id) AS store_id,  -- เลือก store_id ที่มีค่าน้อยที่สุดในกลุ่ม
                                GROUP_CONCAT(s.store_name SEPARATOR ', ') AS store_names,
                                pv.name_in_thai 
                            FROM tb_map_user_store_list mus
                            LEFT JOIN tb_store s ON mus.store_id = s.id
                            LEFT JOIN tb_group_customer gc ON mus.group_customer_id = gc.id
                            LEFT JOIN tb_account ac ON s.account_id = ac.id
                            LEFT JOIN tb_account_type act ON s.account_type_id = act.id
                            LEFT JOIN tb_provinces pv ON s.provinces_id = pv.id
                            WHERE mus.isActive = 'Y' AND s.isActive = 'Y' AND s.account_id IS NOT NULL
                            AND act.isActive = 'Y'
                            GROUP BY s.account_id, s.account_type_id, pv.name_in_thai,s.store_code,s.store_name,mus.group_customer_id,s.isActive;`,
                        {
                            type: Sequelize.QueryTypes.SELECT
                        }
                    );
                }
            }else{
                if(req.body.select_user_id){
                    var whereConditions = {
                        group_customer_id: req.body.group_customer_id,
                        user_id: req.body.select_user_id,
                    };
                    var mapUserStoresxzzz = await db.sequelize.query(
                        `   SELECT 
                                mus.group_customer_id,
                                gc.name as group_customer_name, 
                                s.account_id, 
                                s.account_type_id,
                                s.store_code,
                                s.store_name,
                                s.isActive,
                                ac.name as account_name, 
                                act.name as account_type_name, 
                                MIN(s.id) AS store_id,  -- เลือก store_id ที่มีค่าน้อยที่สุดในกลุ่ม
                                GROUP_CONCAT(s.store_name SEPARATOR ', ') AS store_names,
                                pv.name_in_thai 
                            FROM tb_map_user_store_list mus
                            LEFT JOIN tb_store s ON mus.store_id = s.id
                            LEFT JOIN tb_group_customer gc ON mus.group_customer_id = gc.id
                            LEFT JOIN tb_account ac ON s.account_id = ac.id
                            LEFT JOIN tb_account_type act ON s.account_type_id = act.id
                            LEFT JOIN tb_provinces pv ON s.provinces_id = pv.id
                            WHERE mus.isActive = 'Y' AND s.isActive = 'Y' AND mus.group_customer_id = :group_customer_id 
                            AND mus.user_id = :user_id 
                            AND s.account_id IS NOT NULL
                            AND act.isActive = 'Y'
                            GROUP BY s.account_id, s.account_type_id, pv.name_in_thai,s.store_code,s.store_name,mus.group_customer_id;`,
                        {
                            replacements: whereConditions,
                            type: Sequelize.QueryTypes.SELECT
                        }
                    );
                }else{
                    var whereConditions = {
                        group_customer_id: req.body.group_customer_id,
                    };
                    var mapUserStoresxzzz = await db.sequelize.query(
                        `   SELECT 
                                mus.group_customer_id,
                                gc.name as group_customer_name, 
                                s.account_id, 
                                s.account_type_id,
                                s.store_code,
                                s.store_name,
                                s.isActive,
                                ac.name as account_name, 
                                act.name as account_type_name, 
                                act.name as account_type_name, 
                                MIN(s.id) AS store_id,  -- เลือก store_id ที่มีค่าน้อยที่สุดในกลุ่ม
                                GROUP_CONCAT(s.store_name SEPARATOR ', ') AS store_names,
                                pv.name_in_thai 
                            FROM tb_map_user_store_list mus
                            LEFT JOIN tb_store s ON mus.store_id = s.id
                            LEFT JOIN tb_group_customer gc ON mus.group_customer_id = gc.id
                            LEFT JOIN tb_account ac ON s.account_id = ac.id
                            LEFT JOIN tb_account_type act ON s.account_type_id = act.id
                            LEFT JOIN tb_provinces pv ON s.provinces_id = pv.id
                            WHERE mus.isActive = 'Y' AND s.isActive = 'Y' AND mus.group_customer_id = :group_customer_id 
                            AND s.account_id IS NOT NULL
                            AND act.isActive = 'Y'
                            GROUP BY s.account_id, s.account_type_id, pv.name_in_thai,s.store_code,s.store_name,mus.group_customer_id;`,
                        {
                            replacements: whereConditions,
                            type: Sequelize.QueryTypes.SELECT
                        }
                    );
                }
            }
            
            
        }
        
        res.send({ status: "success", data: mapUserStoresxzzz });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_group_name(req, res) {
    try {
        const whereConditions = {};
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        if (req.body.account_id) whereConditions.account_id = req.body.account_id;
        if (req.body.account_type_id) whereConditions.account_type_id = req.body.account_type_id;
        if(req.body.position_name != 'Supervisor' && req.body.position_name != 'Admin'){
            if (req.body.user_code) whereConditions.user_code = req.body.user_code;
        }
        if (req.body.store_code) whereConditions.store_code = req.body.store_code;
        if(req.body.position_name != 'พนักงาน'){
            if (req.body.branch_name) whereConditions.branch_name = req.body.branch_name;
        }
        let data = await db.MapProductStore.findAll({
            where: whereConditions,
            include: [
                {
                    model: db.Account,
                    as: 'account', // ชื่อ alias ที่ตั้งไว้ใน model
                    required: false, // เลือกเฉพาะฟิลด์ที่ต้องการ (เช่น name)
                },
                {
                    model: db.AccountType,
                    as: 'accountType', // ชื่อ alias ที่ตั้งไว้ใน model
                    required: false, // เลือกเฉพาะฟิลด์ที่ต้องการ (เช่น name)
                },
                {
                    model: db.GroupCustomer,
                    as: 'groupCustomer', // ชื่อ alias ที่ตั้งไว้ใน model
                    required: false, // เลือกเฉพาะฟิลด์ที่ต้องการ (เช่น name)
                },
                {
                    model: db.MapProductStoreList,
                    as: 'mapProductStoreList', // ชื่อ alias ที่ตั้งไว้ใน model
                    required: false, // เลือกเฉพาะฟิลด์ที่ต้องการ (เช่น name)
                    include: [
                        {
                            model: db.Product,
                            as: 'product', // ชื่อ alias ที่ตั้งไว้ใน model Product
                            attributes: ['name'], // เลือกเฉพาะฟิลด์ product_name ที่ต้องการ
                            required: false,
                        },
                    ],
                },
            ],
        });
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_group_name2(req, res) {
    try {
        const whereConditions = {};
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        if (req.body.account_id) whereConditions.account_id = req.body.account_id;
        if (req.body.account_type_id) whereConditions.account_type_id = req.body.account_type_id;
        if(req.body.position_name != 'Supervisor' && req.body.position_name != 'Admin'){
            if (req.body.user_code) whereConditions.user_code = req.body.user_code;
        }
        if (req.body.store_code) whereConditions.store_code = req.body.store_code;
        if(req.body.position_name != 'พนักงาน'){
            if (req.body.branch_name) whereConditions.branch_name = req.body.branch_name;
        }

        const whereReport = {};
        if (req.body.report == 'oos') {
            whereReport[Op.or] = [
                { oos: 'Y' },
                { stock: 'Y' }
            ];
        }
        if (req.body.report == 'offtake') whereReport.offtake = 'Y';
        if (req.body.report == 'price') whereReport.price = 'Y';
        if (req.body.report == 'week') whereReport.week = 'Y';



        let StoreData = await db.Store.findOne({
            where: { id: req.body.store_id },
        });
        let data = await db.MapProductStore.findAll({
            where: {
                group_customer_id:StoreData.group_customer_id,
                account_id:StoreData.account_id,
                account_type_id:StoreData.account_type_id,
                // store_code:StoreData.store_code,
                isActive: 'Y'
            },
            include: [
                {
                    model: db.Account,
                    as: 'account', // ชื่อ alias ที่ตั้งไว้ใน model
                    required: false, // เลือกเฉพาะฟิลด์ที่ต้องการ (เช่น name)
                },
                {
                    model: db.AccountType,
                    as: 'accountType', // ชื่อ alias ที่ตั้งไว้ใน model
                    required: false, // เลือกเฉพาะฟิลด์ที่ต้องการ (เช่น name)
                },
                {
                    model: db.GroupCustomer,
                    as: 'groupCustomer', // ชื่อ alias ที่ตั้งไว้ใน model
                    required: false, // เลือกเฉพาะฟิลด์ที่ต้องการ (เช่น name)
                },
                {
                    model: db.MapProductStoreList,
                    as: 'mapProductStoreList', // ชื่อ alias ที่ตั้งไว้ใน model
                    required: false, // เลือกเฉพาะฟิลด์ที่ต้องการ (เช่น name)
                    where: whereReport,
                    include: [
                        {
                            model: db.Product,
                            as: 'product', // ชื่อ alias ที่ตั้งไว้ใน model Product
                            attributes: ['name'], // เลือกเฉพาะฟิลด์ product_name ที่ต้องการ
                            required: false,
                        },
                    ],
                },
            ],
        });
        res.send({ status: "success", data: data, StoreData: StoreData  });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_store_for_report(req, res) {
    try {
        let MapProductStore = await db.MapProductStore.findByPk(req.body.id);
        const whereConditions = {};
        if (MapProductStore.account_id) whereConditions.account_id = MapProductStore.account_id;
        if (MapProductStore.account_type_id) whereConditions.account_type_id = MapProductStore.account_type_id;
        if (MapProductStore.group_customer_id) whereConditions.group_customer_id = MapProductStore.group_customer_id;
        //console.log(whereConditions);
        var data = await db.Store.findAll(
            { 
                where: whereConditions,
                include: [
                    {
                        model: db.GroupCustomer,
                        as: 'groupCustomer', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                        required: false, // required: false ทำให้เป็น LEFT JOIN
                    },
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
             }
        );

        // let data = await db.Store.findAll({
        //     include: [
        //         {
        //             model: db.GroupCustomer,
        //             as: 'groupCustomer', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
        //             required: false, // required: false ทำให้เป็น LEFT JOIN
        //         },
        //         {
        //             model: db.Account,
        //             as: 'account', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
        //             required: false, // required: false ทำให้เป็น LEFT JOIN
        //         },
        //         {
        //             model: db.AccountType,
        //             as: 'accountType', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
        //             required: false, // required: false ทำให้เป็น LEFT JOIN
        //         },
        //     ],
        //     where: whereCondition,
        // });
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//get store by id
async function get_store_by_id(req, res) {
    try {
        let data = await db.Store.findByPk(req.params.id);

        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//update store
async function update_store(req, res) {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.Store.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.Store.update(req.body, { where: { id: req.params.id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

}

//update store isActive
async function update_store_isActive(req, res) {
    const id = req.params.id;
    const error = validation(req, ['isActive']);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.Store.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.Store.update(req.body, { where: { id: id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }
}

module.exports = {

    //exprot function
    create_store,
    get_all_store,
    get_all_store_user,
    get_all_store_user2,
    get_store_for_report,
    get_store_by_id,
    update_store,
    update_store_isActive,
    get_group_name,
    get_group_name2,

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
