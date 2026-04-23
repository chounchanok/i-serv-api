const db = require("../models")

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op

// function create rental_area_unit
async function create_rental_area_unit(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }
    try {
        await db.RentalAreaUnit.create(req.body)
        res.send({ status: "success", message: "เพิ่มข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
    }
}

//get all rental_area_unit
async function get_all_rental_area_unit(req, res) {
    try {
        let accountIdFromStore = null;
        let allAccount = null;

        if (req.body.store_id) {
            const store = await db.Store.findOne({ where: { id: req.body.store_id } });
            if (store && store.account_id) {
                accountIdFromStore = store.account_id;
                req.body.account_id = store.account_id;
            }
            // ...โค้ด MapUserStorelist เดิม...
        }

        // หา account_id ที่ name = 'All' และ group_customer_id ตรงกัน
        if (req.body.store_id) {
            allAccount = await db.Account.findOne({
                where: {
                    name: 'All',
                    group_customer_id: req.body.group_customer_id
                }
            });
        }

        const whereConditions = {
            isActive: 'Y'
        };
        if (req.body.group_customer_id && req.body.group_customer_id != 8) {
            whereConditions.group_customer_id = req.body.group_customer_id;
        }

        // เงื่อนไข account_id: account_id จาก store_id หรือ account_id ของ All
        if (accountIdFromStore || allAccount) {
            whereConditions.account_id = {
                [Op.or]: [
                    accountIdFromStore ? accountIdFromStore : null,
                    allAccount ? allAccount.id : null
                ].filter(Boolean)
            };
        }

        let data = await db.RentalAreaUnit.findAll({
            where: whereConditions,
            include: [
                {
                    model: db.GroupCustomer,
                    as: 'groupCustomer',
                },
                {
                    model: db.Account,
                    as: 'account',
                },
            ],
        });
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_rental_area_unit_n(req, res) {
    try {
        let accountIdFromStore = null;
        let allAccount = null;

        if (req.body.store_id) {
            const store = await db.Store.findOne({ where: { id: req.body.store_id } });
            if (store && store.account_id) {
                accountIdFromStore = store.account_id;
                req.body.account_id = store.account_id;
            }
            // ...โค้ด MapUserStorelist เดิม...
        }

        // หา account_id ที่ name = 'All' และ group_customer_id ตรงกัน
        if (req.body.store_id) {
            allAccount = await db.Account.findOne({
                where: {
                    name: 'All',
                    group_customer_id: req.body.group_customer_id
                }
            });
        }

        const whereConditions = {};
        if (req.body.group_customer_id && req.body.group_customer_id != 8) {
            whereConditions.group_customer_id = req.body.group_customer_id;
        }

        // เงื่อนไข account_id: account_id จาก store_id หรือ account_id ของ All
        if (accountIdFromStore || allAccount) {
            whereConditions.account_id = {
                [Op.or]: [
                    accountIdFromStore ? accountIdFromStore : null,
                    allAccount ? allAccount.id : null
                ].filter(Boolean)
            };
        }

        let data = await db.RentalAreaUnit.findAll({
            where: whereConditions,
            include: [
                {
                    model: db.GroupCustomer,
                    as: 'groupCustomer',
                    attributes: ['name'],
                },
                {
                    model: db.Account,
                    as: 'account',
                },
            ],
        });
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_unit(req, res) {
    try {
        const whereConditions = {};

        // กรณีไม่ใช่ SuperAdmin
        if (req.body.position_name != "SuperAdmin") {
            if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        } else {
            const dataStore = await db.MapUserStorelist.findOne({
                where: { store_id: req.body.store_id }
            });
            req.body.group_customer_id = dataStore.group_customer_id
            if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        }

        let accountIdFromStore = null;
        let allAccount = null;

        // เพิ่ม account_id จาก store_id
        if (req.body.store_id) {
            const store = await db.Store.findOne({ where: { id: req.body.store_id } });
            if (store && store.account_id) {
                accountIdFromStore = store.account_id;
            }
        }

        // หา account_id ที่ name = 'All' และ group_customer_id ตรงกัน
        if (req.body.group_customer_id) {
            allAccount = await db.Account.findOne({
                where: {
                    name: 'All',
                    group_customer_id: req.body.group_customer_id
                }
            });
        }

        // เงื่อนไข account_id: account_id จาก store_id หรือ account_id ของ All
        if (accountIdFromStore || allAccount) {
            whereConditions.account_id = {
                [Op.or]: [
                    accountIdFromStore ? accountIdFromStore : null,
                    allAccount ? allAccount.id : null
                ].filter(Boolean)
            };
        }

        if (req.body.name) whereConditions.name = req.body.name;

        // <<< เพิ่มบรรทัดนี้เพื่อกรองข้อมูลที่ไม่ Active ออกไป
        whereConditions.isActive = { [Op.ne]: 'N' };

        let data = await db.RentalAreaUnit.findAll({
            where: whereConditions,
            include: [
                {
                    model: db.GroupCustomer,
                    as: 'groupCustomer',
                    attributes: ['name'],
                },
                {
                    model: db.Account,
                    as: 'account',
                },
            ],
        });
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_unit2(req, res) {
    try {
        const existingRecord = await db.RentalAreaUnit.findOne({ where: { id: req.body.id } });

        const whereConditions = {};
        if (req.body.position_name != "SuperAdmin") {
            if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        }else{
            const dataStore = await db.MapUserStorelist.findOne({
                where: { 
                    store_id: req.body.store_id
                }
            });
            req.body.group_customer_id = dataStore.group_customer_id
            if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        }
        
        if (req.body.id) whereConditions.name = existingRecord.name;

        // <<< เพิ่มบรรทัดนี้เพื่อกรองข้อมูลที่ไม่ Active ออกไป
        whereConditions.isActive = { [Op.ne]: 'N' };
        
        //console.log(whereConditions);
        let data = await db.RentalAreaUnit.findAll({
            where: whereConditions,
            include: [
                {
                    model: db.GroupCustomer,
                    as: 'groupCustomer', // ชื่อ alias ที่ตั้งไว้ใน model
                    attributes: ['name'], // เลือกเฉพาะฟิลด์ที่ต้องการ (เช่น name)
                },
            ],
        });
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_rental_area_unit_groupname(req, res) {
    try {
        // const whereConditions = {};
        // if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        // let data = await db.RentalAreaUnit.scope('groupByName').findAll({
        //     where: whereConditions,
        //     include: [
        //         {
        //             model: db.GroupCustomer,
        //             as: 'groupCustomer',
        //             attributes: ['name'],
        //         },
        //         {
        //             model: db.Account,
        //             as: 'account',
        //             required: false,
        //         },
        //     ],
        // });
        res.send({ status: "success" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//get rental_area_unit by id
async function get_rental_area_unit_by_id(req, res) {
    try {
        let data = await db.RentalAreaUnit.findByPk(req.params.id);

        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//update rental_area_unit
async function update_rental_area_unit(req, res) {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.RentalAreaUnit.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.RentalAreaUnit.update(req.body, { where: { id: req.params.id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

}

//update rental_area_unit isActive
async function update_rental_area_unit_isActive(req, res) {
    const id = req.params.id;
    const error = validation(req, ['isActive']);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.RentalAreaUnit.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.RentalAreaUnit.update(req.body, { where: { id: id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }
}

module.exports = {

    //exprot function
    create_rental_area_unit,
    get_all_rental_area_unit,
    get_all_rental_area_unit_n,
    get_rental_area_unit_by_id,
    update_rental_area_unit,
    update_rental_area_unit_isActive,
    get_all_rental_area_unit_groupname,
    get_unit,
    get_unit2,
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
