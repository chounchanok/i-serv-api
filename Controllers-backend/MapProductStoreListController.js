const db = require("../models")

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op

// function create MapProductStoreList
async function create_MapProductStoreList(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }
    try {
        await db.MapProductStoreList.create(req.body)
        res.send({ status: "success", message: "เพิ่มข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
    }
}
async function getTodayOosId() {
    const today = new Date().toISOString().split('T')[0];
    let todayOos = await db.Oos.findOne({
        where: { datesave: today },
    });

    // if (!todayOos) {
    //     // ถ้าไม่มี Oos สำหรับวันนี้ ให้สร้างใหม่
    //     todayOos = await db.Oos.create({
    //         datesave: today,
    //     });
    // }

    return (todayOos?todayOos.id:null); // คืนค่า oos_id
}
async function createOrUpdate_MapProductStoreList(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    const mapProductStoreList = req.body; // สมมุติว่า array ถูกส่งเข้ามาใน req.body

    try {
        for (const item of mapProductStoreList) {
            if (item.id === null) {
                // ถ้า id เป็น null ให้สร้างรายการใหม่
                var datax = await db.MapProductStoreList.create({
                    area: item.area,
                    map_product_id: item.map_product_id,
                    offtake: item.offtake,
                    oos: item.oos,
                    stock: item.stock,
                    price: item.price,
                    product_id: item.product_id,
                    week: item.week,
                    msl: item.msl,
                });

                const dataOos = await db.Oos.findOne({
                    include: [
                        {
                            model: db.Store,
                            as: 'store', // ชื่อ alias ใน model
                            required: true,
                            where: { 
                                account_id: item.account_id,
                                account_type_id: item.account_type_id,
                                group_customer_id: item.group_customer_id,
                            },
                        },
                    ],
                });
                if(dataOos){
                    const Ooss = await db.Oos.findAll({
                        where: {
                            store_id: dataOos.store_id,
                        }
                    });
                    for (const Oos of Ooss) {
                        const exists = await db.OosList.findOne({
                            where: {
                                oos_id: Oos.id,
                                map_product_store_list_id: datax.id
                            }
                        });
                        if (!exists) {
                            await db.OosList.create({
                                oos_id: Oos.id,
                                map_product_store_list_id: datax.id,
                                qty: 0, // กำหนดค่าตามที่ต้องการ
                                oos_status: 'N', // กำหนดค่าตามที่ต้องการ
                                oos_status2: 'N', // กำหนดค่าตามที่ต้องการ
                                not_sell: 'N', // กำหนดค่าตามที่ต้องการ
                                note: '', // กำหนดค่าตามที่ต้องการ
                                isActive: 'N', // กำหนดค่าตามที่ต้องการ
                            });
                        }
                    }
                }
                
                const dataOfftake = await db.Offtake.findOne({
                    include: [
                        {
                            model: db.Store,
                            as: 'store', // ชื่อ alias ใน model
                            required: true,
                            where: { 
                                account_id: item.account_id,
                                account_type_id: item.account_type_id,
                                group_customer_id: item.group_customer_id,
                            },
                        },
                    ],
                });
                if(dataOfftake){
                    const Offtakes = await db.Offtake.findAll({
                        where: {
                            store_id: dataOfftake.store_id,
                        }
                    });
                    for (const Offtake of Offtakes) {
                        const exists = await db.OfftakeList.findOne({
                            where: {
                                offtake_id: Offtake.id,
                                map_product_store_list_id: datax.id
                            }
                        });
                        if (!exists) {
                            await db.OfftakeList.create({
                                offtake_id: Offtake.id,
                                map_product_store_list_id: datax.id,
                                isActive: 'N', // กำหนดค่าตามที่ต้องการ
                            });
                        }
                    }
                }
                // const today = new Date().toISOString().split('T')[0]; // วันที่ปัจจุบันในรูปแบบ YYYY-MM-DD
                // const oosId = await getTodayOosId();
                // if(oosId){
                //     const existingItem = await db.OosList.findOne({
                //         where: { map_product_store_list_id: datax.id },
                //         include: [
                //             {
                //                 model: db.Oos,
                //                 as: 'oos', // ชื่อ alias ใน model
                //                 required: true,
                //                 // where: { datesave: today }, // กรองวันที่เป็นวันที่ปัจจุบัน
                //             },
                //         ],
                //     });
                //     // ถ้าไม่มีใน OosList ให้เพิ่มใหม่
                //     if (!existingItem) {
                //         await db.OosList.create({
                //             oos_id: oosId,
                //             map_product_store_list_id: datax.id,
                //             qty: 0, // กำหนดค่าตามที่ต้องการ
                //             oos_status: 'N', // กำหนดค่าตามที่ต้องการ
                //             oos_status2: 'N', // กำหนดค่าตามที่ต้องการ
                //             not_sell: 'N', // กำหนดค่าตามที่ต้องการ
                //             note: '', // กำหนดค่าตามที่ต้องการ
                //             isActive: 'Y', // กำหนดค่าตามที่ต้องการ
                //             oos_id: await getTodayOosId(), // ฟังก์ชันที่ดึง `oos_id` ของวันนี้
                //         });
                //     }
                // }
                
            } else {
                // ถ้า id มีค่า ให้ทำการ update โดยใช้ id ที่มี
                await db.MapProductStoreList.update({
                    area: item.area,
                    map_product_id: item.map_product_id,
                    offtake: item.offtake,
                    oos: item.oos,
                    stock: item.stock,
                    price: item.price,
                    product_id: item.product_id,
                    week: item.week,
                    msl: item.msl,
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
//get all MapProductStoreList
async function get_all_MapProductStoreList(req, res) {
    try {
        let data = await db.MapProductStoreList.findAll({
            include: [
                {
                    model: db.MapProductStore,
                    as: 'mapProductStore', // ชื่อ alias ที่ตั้งไว้ใน model
                    required: false, // เลือกเฉพาะฟิลด์ที่ต้องการ (เช่น name)
                },
                {
                    model: db.Product,
                    as: 'mapProductStorePList', // ชื่อ alias ที่ตั้งไว้ใน model
                    required: false, // เลือกเฉพาะฟิลด์ที่ต้องการ (เช่น name)
                },
            ],
        });
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

async function get_all_MapProductStoreList_filter(req, res) {
    try {
        // ตรวจสอบว่าค่าต่าง ๆ มีใน req.body หรือไม่
        const whereConditions = {};
        if (req.body.account_id) whereConditions.account_id = req.body.account_id;
        if (req.body.account_type_id) whereConditions.account_type_id = req.body.account_type_id;
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        if (req.body.name) whereConditions.name = req.body.name;
        if (req.body.branch_name) whereConditions.branch_name = req.body.branch_name;
        //console.log(whereConditions);
        let data = await db.MapProductStoreList.findAll({
            where:{
                isActive:'Y'
            },
            include: [
                {
                    model: db.MapProductStore,
                    as: 'mapProductStore', // ชื่อ alias ที่ตั้งไว้ใน model
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

//get MapProductStoreList by id
async function get_MapProductStoreList_by_id(req, res) {
    try {
        let data = await db.MapProductStoreList.findByPk(req.params.id);

        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//update MapProductStoreList
async function update_MapProductStoreList(req, res) {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.MapProductStoreList.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.MapProductStoreList.update(req.body, { where: { id: req.params.id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

}

//update MapProductStoreList isActive
async function update_MapProductStoreList_isActive(req, res) {
    const id = req.params.id;
    const error = validation(req, ['isActive']);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.MapProductStoreList.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.MapProductStoreList.update(req.body, { where: { id: id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }
}
async function del_MapProductStore(req, res) {
    const id = req.body.id;
    try {
        await db.MapProductStoreList.update({
            isActive:'N'
        }, { where: { id: id } });

        await db.OosList.update({
            isActive:'N'
        }, { where: { map_product_store_list_id: id } });
        await db.OfftakeList.update({
            isActive:'N'
        }, { where: { map_product_store_list_id: id } });
        await db.PricePromotionList.update({
            isActive:'N'
        }, { where: { map_product_store_list_id: id } });
        await db.WeekList.update({
            isActive:'N'
        }, { where: { map_product_store_list_id: id } });
        res.send({ status: "success", message: "ลบข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถลบข้อมูลที่เลือกได้!" });
    }
}
module.exports = {

    //exprot function
    create_MapProductStoreList,
    createOrUpdate_MapProductStoreList,
    get_all_MapProductStoreList,
    get_all_MapProductStoreList_filter,
    get_MapProductStoreList_by_id,
    update_MapProductStoreList,
    update_MapProductStoreList_isActive,
    del_MapProductStore,


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
