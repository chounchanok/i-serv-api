const db = require("../models")

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op
const { Sequelize } = require('sequelize'); // นำเข้า Sequelize

// function create MapProductStore
async function create_MapProductStore(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }
    try {
        const whereConditions = {};
        if (req.body.account_id) whereConditions.account_id = req.body.account_id;
        if (req.body.account_type_id) whereConditions.account_type_id = req.body.account_type_id;
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        if (req.body.name) whereConditions.name = req.body.name;
        const count = await db.MapProductStore.count({
            where: {
                account_id: req.body.account_id,
                account_type_id: req.body.account_type_id,
                group_customer_id: req.body.group_customer_id,
                name: req.body.name
            }
        });
        //console.log(count);
        const UserData = await db.User.findOne({
            where: { code: req.body.user_code },
        });
        const account_idData = await db.Account.findOne({
            where: { id: req.body.account_id },
        });
        const account_type_idData = await db.AccountType.findOne({
            where: { id: req.body.account_type_id },
        });
        const existingRecordstore_code = await db.Store.findOne({
            where: {
                group_customer_id: req.body.group_customer_id,
                account_id: req.body.account_id,
                account_type_id: req.body.account_type_id
            }
        });
        let provinceData = await db.Provinces.findOne({
            where: { id: existingRecordstore_code.provinces_id },
            attributes: ['name_in_thai'],
            raw: true
        });
        const MapUserStore_code = await db.MapUserStore.findOne({
            where: {
                group_customer_id: req.body.group_customer_id,
                user_id: UserData.id,
                // store_id: { [Op.like]: `%${existingRecordstore_code.id}%` }
            }
        });
        req.body.user_prefix = UserData.prefix
        req.body.user_name = UserData.name
        req.body.user_lastname = UserData.last_name
        req.body.account_name = account_idData.name
        req.body.store_code	 = existingRecordstore_code.store_code
        // req.body.branch_name	 = MapUserStore_code.branch_name
        req.body.province_name	 = provinceData.name_in_thai
        req.body.account_type_name	 = account_type_idData.name
        req.body.group_name	 = req.body.name

        if(count == 0 && req.body.group_name_select == 0){
            var data = await db.MapProductStore.create(req.body)
            //console.log(data);
        }else{
            const whereConditions = {};
            if (req.body.account_id) whereConditions.account_id = req.body.account_id;
            if (req.body.account_type_id) whereConditions.account_type_id = req.body.account_type_id;
            if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
            if (req.body.name) whereConditions.name = req.body.name;
            // if (req.body.branch_name) whereConditions.branch_name = req.body.branch_name;
            //console.log(whereConditions);
            var data = await db.MapProductStore.findOne({ where: whereConditions });

            await db.MapProductStore.update({
                name: req.body.name
            }, {
                where: whereConditions
            });
        }
        
        res.send({ status: "success", message: "เพิ่มข้อมูลเรียบร้อย", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
    }
}

//get all MapProductStore
async function get_all_MapProductStore(req, res) {
    try {
        const whereConditions = {};
        if(req.body.position_name != 'SuperAdmin'){
            if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
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
                            attributes: ['name','flavor'], // เลือกเฉพาะฟิลด์ product_name ที่ต้องการ
                            required: false,
                        },
                    ],
                },
            ],
            // attributes: [
            //     [Sequelize.fn('DISTINCT', Sequelize.col('mapProductStore.account_id')), 'mapProductStore.account_id'],
            //     'mapProductStore.account_type_id',
            // ],
            // raw: true,
            // group:['account_id','account_type_id']
        });

        // const uniqueData = [];
        // const seen = new Map();

        // data.forEach(item => {
        //     const key = `${item.account_id}-${item.account_type_id}`; // ใช้คู่ account_id และ account_type_id เป็น key
        //     if (!seen.has(key)) {
        //         seen.set(key, true);
        //         uniqueData.push(item);
        //     }
        // });
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_MapProductStore_filter(req, res) {
    const id = req.body.id;
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.MapProductStore.findByPk(id);
        res.send({ status: "success", data: row });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลที่เลือกได้!" });
    }
}
//get MapProductStore by id
async function get_MapProductStore_by_id(req, res) {
    try {
        let data = await db.MapProductStore.findByPk(req.params.id);

        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//update MapProductStore
async function update_MapProductStore(req, res) {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.MapProductStore.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.MapProductStore.update(req.body, { where: { id: req.params.id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

}

//update MapProductStore isActive
async function update_MapProductStore_isActive(req, res) {
    const id = req.params.id;
    const error = validation(req, ['isActive']);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.MapProductStore.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.MapProductStore.update(req.body, { where: { id: id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }
}
async function delete_MapProductStore(req, res) {
    const id = req.params.id;
    try {
        // ค้นหาแถวใน MapProductStore
        let row = await db.MapProductStore.findByPk(id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการลบ');
        }

        // ลบรายการที่เกี่ยวข้องใน MapProductStoreList ก่อน
        await db.MapProductStoreList.destroy({
            where: { map_product_id: id } // หรือใช้ฟิลด์ที่เชื่อมต่อกับ MapProductStore (เช่น mapProductStoreId)
        });

        // ลบรายการใน MapProductStore
        await db.MapProductStore.destroy({
            where: { id: id }
        });

        res.send({ status: "success", message: "ลบข้อมูลเรียบร้อยแล้ว" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถลบข้อมูลได้!" });
    }
}
module.exports = {

    //exprot function
    create_MapProductStore,
    get_all_MapProductStore,
    get_all_MapProductStore_filter,
    get_MapProductStore_by_id,
    update_MapProductStore,
    update_MapProductStore_isActive,
    delete_MapProductStore,


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
