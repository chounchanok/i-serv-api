const db = require("../models")

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op

// function create WeekList
async function create_WeekList(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }
    try {
        await db.WeekList.create(req.body)
        res.send({ status: "success", message: "เพิ่มข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
    }
}
async function createOrUpdate_Week(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    const WeekList = req.body.group_id; // สมมุติว่า array ถูกส่งเข้ามาใน req.body

    try {
        for (const item of WeekList) {
            if (item.id === null) {
                // ถ้า id เป็น null ให้สร้างรายการใหม่
                await db.WeekList.create({
                    map_product_id: item.map_product_id,
                    offtake: item.offtake,
                    price: item.price,
                    product_id: item.product_id,
                    week: item.week
                });
            } else {
                // ถ้า id มีค่า ให้ทำการ update โดยใช้ id ที่มี
                await db.WeekList.update({
                    map_product_id: item.map_product_id,
                    offtake: item.offtake,
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
async function createOrUpdate_weekList(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    const WeekList = req.body; // สมมุติว่า array ถูกส่งเข้ามาใน req.body

    try {
        for (const item of WeekList) {
            if (item.id) {
                await db.WeekList.update({
                    t_rank: item.t_rank || 0,
                    week1: item.week1 || 0,
                    week2: item.week2 || 0,
                    week3: item.week3 || 0,
                    week4: item.week4 || 0,
                    week5: item.week5 || 0,
                    week6: item.week6 || 0,
                    week7: item.week7 || 0,
                    week8: item.week8 || 0,
                    week9: item.week9 || 0,
                    week10: item.week10 || 0,
                    week11: item.week11 || 0,
                    week12: item.week12 || 0,
                    note: item.note || '',
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
async function createOrUpdate_WeekList_dup(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }
    try {
        const WeekList = await db.WeekList.findOne({
            where: { 
                id: req.body.id
            }
        });
        if (WeekList.week_id > 0) {
            const Week = await db.Week.findOne({
                where: { 
                    id: WeekList.week_id
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
                WHERE tb_map_user_store_list.user_id = '${Week.user_id}' 
                AND tb_map_user_store_list.store_id != '${Week.store_id}'
                AND store.group_customer_id = '${Week.store.group_customer_id}'
                AND store.account_id = '${Week.store.account_id}'
                AND store.account_type_id = '${Week.store.account_type_id}'
                GROUP BY tb_map_user_store_list.store_id
                ORDER BY tb_map_user_store_list.store_id ASC;
            `;
    
            // // ✅ Execute Query
            const rawData = await db.sequelize.query(query, { type: db.Sequelize.QueryTypes.SELECT });
            if(rawData.length>0){
                for (const product of rawData) {
                    const count = await db.Week.count({
                        where: {
                            group_id: Week.group_id,
                            store_id: product.store_id,
                            datenow: Week.datenow,
                            datesave: Week.datesave,
                            startweek: Week.startweek,
                            user_id: Week.user_id,
                        }
                    });
                    if (count === 0) {
                        const datax = await db.Week.create(
                            { 
                                group_id: Week.group_id,
                                store_id: product.store_id,
                                datenow: Week.datenow,
                                datesave: Week.datesave,
                                startweek: Week.startweek,
                                user_id: Week.user_id,
                            }
                        );
                        if(datax.id > 0){
                            const productList = await db.WeekList.findAll({
                                where: { week_id: Week.id }
                            });
                            if(productList){
                                for (const product of productList) {
                                    await db.WeekList.create({
                                        week_id: datax.id,
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
//get all WeekList
async function get_all_WeekList(req, res) {
    try {
        let data = await db.WeekList.findAll({
            include: [
                {
                    model: db.Week,
                    as: 'week', // ชื่อ alias ที่ตั้งไว้ใน model
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

async function get_all_WeekList_filter(req, res) {
    try {
        // ตรวจสอบว่าค่าต่าง ๆ มีใน req.body หรือไม่
        const whereConditions = {};
        if (req.body.account_id) whereConditions.account_id = req.body.account_id;
        if (req.body.account_type_id) whereConditions.account_type_id = req.body.account_type_id;
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        //console.log(whereConditions);
        let data = await db.WeekList.findAll({
            include: [
                {
                    model: db.Week,
                    as: 'week', // ชื่อ alias ที่ตั้งไว้ใน model
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

//get WeekList by id
async function get_WeekList_by_id(req, res) {
    try {
        let data = await db.WeekList.findByPk(req.params.id);

        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//update WeekList
async function update_WeekList(req, res) {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.WeekList.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.WeekList.update(req.body, { where: { id: req.params.id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

}

//update WeekList isActive
async function update_WeekList_isActive(req, res) {
    const id = req.params.id;
    const error = validation(req, ['isActive']);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.WeekList.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.WeekList.update(req.body, { where: { id: id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }
}

module.exports = {

    //exprot function
    create_WeekList,
    createOrUpdate_weekList,
    createOrUpdate_WeekList_dup,
    createOrUpdate_Week,
    get_all_WeekList,
    get_all_WeekList_filter,
    get_WeekList_by_id,
    update_WeekList,
    update_WeekList_isActive,



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
