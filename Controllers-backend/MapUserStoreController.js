const db = require("../models");
const MapUserStoreList = require("../models/MapUserStoreList");

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op

// function create MapUserStore
async function create_MapUserStore(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        
            const store_ids = req.body.store_ids;
            const user_id = req.body.user_ids;
            for(var store_id of store_ids){
                let checkRoute = await db.MapUserStorelist.findOne({
                    where: {
                        route_name: req.body.route_name,
                        group_customer_id: req.body.group_customer_id,
                        user_id: user_id,
                        store_id: store_id,
                    }
                });
                if(!checkRoute){
                    let Store = await db.Store.findOne({
                        where: {
                            id: store_id,
                        }
                    });
                    await db.MapUserStorelist.create({
                        route_name: req.body.route_name,
                        group_customer_id: req.body.group_customer_id,
                        user_id: user_id,
                        store_id: store_id,
                        fullname: Store.store_name_report_full,
                        branch_name: Store.store_name,
                        branch_name_full: Store.store_name,
                        provinces_id: Store.provinces_id,
                        isActive: 'Y'
                    })
                }else{
                    res.send({ status: "warning", message: "ชื่อ Route นี้มีข้อมูลแล้ว"});
                }
            }
            
            res.send({ status: "success", message: "เพิ่มข้อมูลเรียบร้อย" });
        
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
    }
}

//get all MapUserStore
async function get_all_MapUserStore(req, res) {
    try {
        const whereConditions = {};
        if(req.body.position_name != "SuperAdmin"){
            if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        }
        

        let mapUserStores = await db.MapUserStorelist.findAll({
            where:whereConditions,
            include: [
                {
                    model: db.GroupCustomer,
                    as: 'groupCustomer', // ชื่อ alias ที่ตั้งไว้ใน model
                    required: false, // เลือกเฉพาะฟิลด์ที่ต้องการ (เช่น name)
                },
                // {
                //     model: db.User,
                //     as: 'user', // ชื่อ alias ที่ตั้งไว้ใน model
                //     required: false, // เลือกเฉพาะฟิลด์ที่ต้องการ (เช่น name)
                // },
                // {
                //     model: db.Store,
                //     as: 'store', // ชื่อ alias ที่ตั้งไว้ใน model
                //     required: false, // เลือกเฉพาะฟิลด์ที่ต้องการ (เช่น name)
                // },
            ],
        });
        const results = await Promise.all(
            mapUserStores.map(async (mapUserStore) => {
                // แปลง `store_id` จาก string เป็น array
                // const storeIdsArray = mapUserStore.store_id.split(',').map(id => parseInt(id, 10));
        
                // ดึงข้อมูล Store ที่ตรงกับ storeIdsArray
                const stores = await db.Store.findAll({
                    where: {
                    id: mapUserStore.store_id,
                    },
                });

                // const userIdsArray = mapUserStore.user_id.split(',').map(id => parseInt(id, 10));
        
                // ดึงข้อมูล User ที่ตรงกับ userIdsArray
                const users = await db.User.findAll({
                    where: {
                    id: mapUserStore.user_id,
                    },
                });
        
                return {
                    ...mapUserStore.toJSON(),
                    // store_ids: storeIdsArray, // ส่ง store_ids กลับมาเป็น array
                    stores, // รายละเอียดของ store ที่เกี่ยวข้อง
                    // user_ids: userIdsArray, // ส่ง user_ids กลับมาเป็น array
                    users, // รายละเอียดของ user ที่เกี่ยวข้อง
                };
            })
        );
        res.send({ status: "success", data: results });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//get MapUserStore by id
async function get_MapUserStore_by_id(req, res) {
    try {
        let data = await db.MapUserStore.findByPk(req.params.id);

        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//update MapUserStore
async function update_MapUserStore(req, res) {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.MapUserStorelist.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        let rows = await db.MapUserStorelist.findAll({
            where: {
                route_name: row.route_name,
                user_id: row.user_id,
                group_customer_id: row.group_customer_id
            }
        });
        let map_id = rows.map((x) => x.id);
        const store_ids = req.body.store_ids;
        const user_id = req.body.user_ids;
        let used_id = [];
        for(let index in store_ids){
            let store_id = store_ids[index];
            if(rows[index] == undefined){
                await db.MapUserStorelist.create({
                    route_name: req.body.route_name,
                    group_customer_id: req.body.group_customer_id,
                    user_id: user_id,
                    store_id: store_id,
                    isActive: row.isActive
                });
            }else{
                used_id.push(rows[index].id);
                await db.MapUserStorelist.update(
                    {
                        store_id: store_id,
                        route_name: req.body.route_name,
                        group_customer_id: req.body.group_customer_id,
                        user_id: user_id,
                    },
                    { where: { id: rows[index].id } });
            }
        }
        await db.MapUserStorelist.destroy({
            where: {
                id: {
                    [Op.in]: map_id,
                    [Op.notIn]: used_id,
                },
            },
        });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

}

//update MapUserStore isActive
async function update_MapUserStore_isActive(req, res) {
    const id = req.params.id;
    const error = validation(req, ['isActive']);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.MapUserStorelist.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.MapUserStorelist.update(req.body, { 
            where: { 
                route_name: row.route_name,
                group_customer_id: row.group_customer_id,
                user_id: row.user_id
            } 
        });
        await db.Store.update({ 
            isActive: req.body.isActive
        }, { 
            where: { 
                id: row.store_id
            } 
        });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }
}

module.exports = {

    //exprot function
    create_MapUserStore,
    get_all_MapUserStore,
    get_MapUserStore_by_id,
    update_MapUserStore,
    update_MapUserStore_isActive,



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
