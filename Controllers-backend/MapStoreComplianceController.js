const db = require("../models")

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op

// function create MapStoreCompliance
async function create_MapStoreCompliance(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }
    try {
        const storeIds = Array.isArray(req.body.store_id) ? req.body.store_id : [req.body.store_id];

        let results = [];

        for (const store_id of storeIds) {
            const whereConditions = {
                store_id: store_id,
            };
            if (req.body.name) whereConditions.name = req.body.name;

            const count = await db.MapStoreCompliance.count({
                where: whereConditions
            });

            let data;
            if (count === 0 && req.body.group_name_select == 0) {
                // สร้างข้อมูลใหม่
                data = await db.MapStoreCompliance.create({
                    ...req.body,
                    store_id: store_id, // กำหนด store_id ที่วนลูปอยู่
                });
                // //console.log('Created:', data);
            } else {
                // ค้นหาและอัปเดตข้อมูล
                data = await db.MapStoreCompliance.findOne({ where: whereConditions });
                if(data){
                    await db.MapStoreCompliance.update(
                        { name: req.body.name },
                        { where: whereConditions }
                    );
                }else{
                    data = await db.MapStoreCompliance.create({
                        ...req.body,
                        store_id: store_id, // กำหนด store_id ที่วนลูปอยู่
                    });
                }
                
                // //console.log('Updated:', data);
            }

            results.push(data);
        }

        res.send({ status: "success", message: "ดำเนินการเรียบร้อย", data: results });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
    }
}

//get all MapStoreCompliance
async function get_all_MapStoreCompliance(req, res) {
    try {
        const whereConditions = {};
        const uniqueData = [];
        const seenOosIds = new Set();
        if(req.body.position_name != "SuperAdmin"){
            if(req.body.position_name == "พนักงาน"){
                if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
                const query = `
                SELECT 
                    tb_map_user_store_list.store_id,
                    user.code AS user_code,
                    user.name AS user_name,
                    user.last_name AS user_lastname
                FROM tb_map_user_store_list
                LEFT JOIN tb_user AS user ON tb_map_user_store_list.user_id = user.id
                WHERE 1=1 AND tb_map_user_store_list.store_id != 0
                AND user_id = ${req.body.user_id}
                ORDER BY tb_map_user_store_list.id DESC;
                `;

                // ✅ Execute Query
                const rawData = await db.sequelize.query(query, { type: db.Sequelize.QueryTypes.SELECT });
                rawData.forEach(item => {
                    if (!seenOosIds.has(item.store_id)) {
                        seenOosIds.add(item.store_id);
                        uniqueData.push(item);
                    }
                });
            }else if(req.body.position_name == "Supervisor"){
                if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
                const query = `
                SELECT 
                    tb_map_user_store_list.store_id,
                    user.code AS user_code,
                    user.name AS user_name,
                    user.last_name AS user_lastname
                FROM tb_map_user_store_list
                LEFT JOIN tb_user AS user ON tb_map_user_store_list.user_id = user.id
                LEFT JOIN tb_position AS position ON user.position_id = position.id
                WHERE 1=1 AND tb_map_user_store_list.store_id != 0
                AND tb_map_user_store_list.user_id = ${req.body.user_id}
                AND user.area_supervisor = ${req.body.area_supervisor}
                AND user.area_manager = ${req.body.area_manager}
                AND position.name = 'พนักงาน'
                ORDER BY tb_map_user_store_list.id DESC;
                `;

                // ✅ Execute Query
                const rawData = await db.sequelize.query(query, { type: db.Sequelize.QueryTypes.SELECT });
                rawData.forEach(item => {
                    if (!seenOosIds.has(item.store_id)) {
                        seenOosIds.add(item.store_id);
                        uniqueData.push(item);
                    }
                });
            }else if(req.body.position_name == "Assistant Management"){
                if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
                const query = `
                SELECT 
                    tb_map_user_store_list.store_id,
                    user.code AS user_code,
                    user.name AS user_name,
                    user.last_name AS user_lastname
                FROM tb_map_user_store_list
                LEFT JOIN tb_user AS user ON tb_map_user_store_list.user_id = user.id
                WHERE 1=1 AND tb_map_user_store_list.store_id != 0
                AND tb_map_user_store_list.user_id = ${req.body.user_id}
                AND user.area_supervisor = ${req.body.area_supervisor}
                AND user.area_manager = ${req.body.area_manager}
                ORDER BY tb_map_user_store_list.id DESC;
                `;

                // ✅ Execute Query
                const rawData = await db.sequelize.query(query, { type: db.Sequelize.QueryTypes.SELECT });
                rawData.forEach(item => {
                    if (!seenOosIds.has(item.store_id)) {
                        seenOosIds.add(item.store_id);
                        uniqueData.push(item);
                    }
                });
            }else if(req.body.position_name == "Admin"){
                if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
                const query = `
                SELECT 
                    tb_map_user_store_list.store_id,
                    user.code AS user_code,
                    user.name AS user_name,
                    user.last_name AS user_lastname
                FROM tb_map_user_store_list
                LEFT JOIN tb_user AS user ON tb_map_user_store_list.user_id = user.id
                WHERE 1=1 AND tb_map_user_store_list.store_id != 0
                AND tb_map_user_store_list.group_customer_id = ${req.body.group_customer_id}
                ORDER BY tb_map_user_store_list.id DESC;
                `;

                // ✅ Execute Query
                const rawData = await db.sequelize.query(query, { type: db.Sequelize.QueryTypes.SELECT });
                rawData.forEach(item => {
                    if (!seenOosIds.has(item.store_id)) {
                        seenOosIds.add(item.store_id);
                        uniqueData.push(item);
                    }
                });
            }else{
                if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
                const query = `
                SELECT 
                    tb_map_user_store_list.store_id,
                    user.code AS user_code,
                    user.name AS user_name,
                    user.last_name AS user_lastname
                FROM tb_map_user_store_list
                LEFT JOIN tb_user AS user ON tb_map_user_store_list.user_id = user.id
                WHERE 1=1 AND tb_map_user_store_list.store_id != 0
                AND tb_map_user_store_list.group_customer_id = ${req.body.group_customer_id}
                ORDER BY tb_map_user_store_list.id DESC;
                `;

                // ✅ Execute Query
                const rawData = await db.sequelize.query(query, { type: db.Sequelize.QueryTypes.SELECT });
                rawData.forEach(item => {
                    if (!seenOosIds.has(item.store_id)) {
                        seenOosIds.add(item.store_id);
                        uniqueData.push(item);
                    }
                });
            }
        }else{
            if(req.body.select_user_id){
                const query = `
                SELECT 
                    tb_map_user_store_list.store_id,
                    user.code AS user_code,
                    user.name AS user_name,
                    user.last_name AS user_lastname
                FROM tb_map_user_store_list
                LEFT JOIN tb_user AS user ON tb_map_user_store_list.user_id = user.id
                WHERE 1=1 AND tb_map_user_store_list.store_id != 0
                AND user_id = ${req.body.select_user_id}
                ORDER BY tb_map_user_store_list.id DESC;
                `;

                // ✅ Execute Query
                const rawData = await db.sequelize.query(query, { type: db.Sequelize.QueryTypes.SELECT });
                rawData.forEach(item => {
                    if (!seenOosIds.has(item.store_id)) {
                        seenOosIds.add(item.store_id);
                        uniqueData.push(item);
                    }
                });
            }else{
                const query = `
                SELECT 
                    tb_map_user_store_list.store_id,
                    user.code AS user_code,
                    user.name AS user_name,
                    user.last_name AS user_lastname
                FROM tb_map_user_store_list
                LEFT JOIN tb_user AS user ON tb_map_user_store_list.user_id = user.id
                WHERE 1=1 AND tb_map_user_store_list.store_id != 0
                ORDER BY tb_map_user_store_list.id DESC;
                `;

                // ✅ Execute Query
                const rawData = await db.sequelize.query(query, { type: db.Sequelize.QueryTypes.SELECT });
                rawData.forEach(item => {
                    if (!seenOosIds.has(item.store_id)) {
                        seenOosIds.add(item.store_id);
                        uniqueData.push(item);
                    }
                });
            }
            // if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
                
                
        }
        // //console.log(uniqueData);
        // return false
        const storeIds = uniqueData.map(item => item.store_id); // ดึงเฉพาะค่า store_id

        
        // ดึง MapStoreCompliance ทั้งหมดที่ต้องการ พร้อม include ข้อมูลที่เกี่ยวข้อง
        let data = await db.MapStoreCompliance.findAll({
            where: {
                isActive: 'Y',
                store_id: storeIds.length > 0 ? storeIds : null,
            },
            include: [
                {
                    model: db.Store,
                    as: 'store',
                    required: false,
                    where: { ...whereConditions },
                    include: [
                        { model: db.GroupCustomer, as: 'groupCustomer', required: false },
                        { model: db.Account, as: 'account', attributes: ['id', 'name'], required: false },
                        { model: db.AccountType, as: 'accountType', required: false },
                        { model: db.Provinces, as: 'provinces', required: false },
                    ],
                },
                {
                    model: db.MapStoreComplianceList,
                    as: 'mapStoreComplianceList',
                    required: false,
                    include: [
                        { model: db.Product, as: 'product', attributes: ['name'], required: false },
                        { model: db.PlacementPoint, as: 'placementPoint', required: false },
                        { model: db.RentalAreaUnit, as: 'rentalAreaUnit', required: false },
                    ],
                },
            ],
            // เพิ่ม limit/offset ถ้าต้องการ pagination
            // limit: 100,
            // offset: 0,
        });

        // ไม่ต้องวนลูป query compliance list ทีละ store อีก
        // สามารถจัดรูปแบบข้อมูลที่ frontend ต้องการได้เลย

        res.send({ status: "success", data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_MapStoreCompliance_filter(req, res) {
    const id = req.body.id;
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.MapStoreCompliance.findByPk(id);
        res.send({ status: "success", data: row });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลที่เลือกได้!" });
    }
}
//get MapStoreCompliance by id
async function get_MapStoreCompliance_by_id(req, res) {
    try {
        let data = await db.MapStoreCompliance.findByPk(req.params.id);

        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//update MapStoreCompliance
async function update_MapStoreCompliance(req, res) {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.MapStoreCompliance.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.MapStoreCompliance.update(req.body, { where: { id: req.params.id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

}

//update MapStoreCompliance isActive
async function update_MapStoreCompliance_isActive(req, res) {
    const id = req.params.id;
    const error = validation(req, ['isActive']);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.MapStoreCompliance.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.MapStoreCompliance.update(req.body, { where: { id: id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }
}
async function delete_MapStoreCompliance(req, res) {
    const id = req.params.id;
    try {
        // ค้นหาแถวใน MapStoreCompliance
        let row = await db.MapStoreCompliance.findByPk(id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการลบ');
        }
        await db.MapStoreCompliance.update(
            { isActive: 'N' },
            { where: {id: id} }
        );
        // ลบรายการที่เกี่ยวข้องใน MapStoreComplianceList ก่อน
        // await db.MapStoreComplianceList.destroy({
        //     where: { map_product_id: id } // หรือใช้ฟิลด์ที่เชื่อมต่อกับ MapStoreCompliance (เช่น MapStoreComplianceId)
        // });

        // // ลบรายการใน MapStoreCompliance
        // await db.MapStoreCompliance.destroy({
        //     where: { id: id }
        // });

        res.send({ status: "success", message: "ลบข้อมูลเรียบร้อยแล้ว" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถลบข้อมูลได้!" });
    }
}
module.exports = {

    //exprot function
    create_MapStoreCompliance,
    get_all_MapStoreCompliance,
    get_all_MapStoreCompliance_filter,
    get_MapStoreCompliance_by_id,
    update_MapStoreCompliance,
    update_MapStoreCompliance_isActive,
    delete_MapStoreCompliance,


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
