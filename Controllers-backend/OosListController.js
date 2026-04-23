const db = require("../models")

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op

// function create OosList
async function create_OosList(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }
    try {
        await db.OosList.create(req.body)
        res.send({ status: "success", message: "เพิ่มข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
    }
}
async function createOrUpdate_Oos(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    const OosList = req.body.group_id; // สมมุติว่า array ถูกส่งเข้ามาใน req.body

    try {
        for (const item of OosList) {
            if (item.id === null) {
                // ถ้า id เป็น null ให้สร้างรายการใหม่
                await db.OosList.create({
                    area: item.area,
                    map_product_id: item.map_product_id,
                    offtake: item.offtake,
                    oos: item.oos,
                    price: item.price,
                    product_id: item.product_id,
                    week: item.week
                });
            } else {
                // ถ้า id มีค่า ให้ทำการ update โดยใช้ id ที่มี
                await db.OosList.update({
                    area: item.area,
                    map_product_id: item.map_product_id,
                    offtake: item.offtake,
                    oos: item.oos,
                    price: item.price,
                    product_id: item.product_id,
                    week: item.week
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
async function createOrUpdate_OosList(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    const OosList = req.body; // สมมุติว่า array ถูกส่งเข้ามาใน req.body

    try {
        var oos_idzzz = 0;
        for (const item of OosList) {
            if (item.id) {
                await db.OosList.update({
                    qty: item.qty,

                    oos_status: item.oos_status || 'N',
                    not_sell: item.not_sell || 'N',
                    oos_status2: item.oos_status2 || 'N',
                    
                    note: item.note,
                    isActive: 'Y'
                }, {
                    where: { id: item.id }
                });
                const oosList = await db.OosList.findOne({
                    where: { 
                        id: item.id
                    }
                });
                oos_idzzz = oosList.oos_id
            }
        }
        
        if (oos_idzzz > 0) {
            const oos = await db.Oos.findOne({
                where: { 
                    id: oos_idzzz
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
                WHERE tb_map_user_store_list.user_id = '${oos.user_id}' AND tb_map_user_store_list.store_id != '${oos.store_id}'
                AND store.group_customer_id = '${oos.store.group_customer_id}'
                AND store.account_id = '${oos.store.account_id}'
                AND store.account_type_id = '${oos.store.account_type_id}'
                GROUP BY tb_map_user_store_list.store_id
                ORDER BY tb_map_user_store_list.store_id ASC;
            `;
    
            // // ✅ Execute Query
            const rawData = await db.sequelize.query(query, { type: db.Sequelize.QueryTypes.SELECT });
            
            if(rawData.length>0){
                for (const product of rawData) {
                    const count = await db.Oos.count({
                        where: {
                            group_id: oos.group_id,
                            store_id: product.store_id,
                            datenow: oos.datenow,
                            datesave: oos.datesave,
                            user_id: oos.user_id,
                        }
                    });
                    if (count === 0) {
                        const datax = await db.Oos.create(
                            { 
                                group_id: oos.group_id,
                                store_id: product.store_id,
                                datenow: oos.datenow,
                                datesave: oos.datesave,
                                user_id: oos.user_id,
                            }
                        );
                        if(datax.id > 0){
                            const productList = await db.OosList.findAll({
                                where: { oos_id: oos.id }
                            });
                            if(productList){
                                for (const product of productList) {
                                    await db.OosList.create({
                                        oos_id: datax.id,
                                        map_product_store_list_id: product.map_product_store_list_id,
                                        // qty: product.qty,
                                        // oos_status: product.oos_status || 'N',
                                        // not_sell: product.not_sell || 'N',
                                        // oos_status2: product.oos_status2 || 'N',
                                        // note: product.note,
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
//get all OosList
async function get_all_OosList(req, res) {
    try {
        let data = await db.OosList.findAll({
            include: [
                {
                    model: db.Oos,
                    as: 'oos', // ชื่อ alias ที่ตั้งไว้ใน model
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

async function get_all_OosList_filter(req, res) {
    try {
        // ตรวจสอบว่าค่าต่าง ๆ มีใน req.body หรือไม่
        const whereConditions = {};
        if (req.body.account_id) whereConditions.account_id = req.body.account_id;
        if (req.body.account_type_id) whereConditions.account_type_id = req.body.account_type_id;
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        //console.log(whereConditions);
        let data = await db.OosList.findAll({
            include: [
                {
                    model: db.Oos,
                    as: 'oos', // ชื่อ alias ที่ตั้งไว้ใน model
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

//get OosList by id
async function get_OosList_by_id(req, res) {
    try {
        let data = await db.OosList.findByPk(req.params.id);

        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//update OosList
async function update_OosList(req, res) {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.OosList.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.OosList.update(req.body, { where: { id: req.params.id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

}

//update OosList isActive
async function update_OosList_isActive(req, res) {
    const id = req.params.id;
    const error = validation(req, ['isActive']);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.OosList.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.OosList.update(req.body, { where: { id: id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }
}

module.exports = {

    //exprot function
    create_OosList,
    createOrUpdate_OosList,
    createOrUpdate_Oos,
    get_all_OosList,
    get_all_OosList_filter,
    get_OosList_by_id,
    update_OosList,
    update_OosList_isActive,



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
