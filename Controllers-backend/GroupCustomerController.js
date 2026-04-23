const db = require("../models")

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op

// function create group_customer
async function create_group_customer(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        await db.GroupCustomer.create({
            name: req.body.name,
            picture: req.body.picture,
            group_customer_id: req.body.group_customer_id,
            isActive: 'Y'
        })
        res.send({ status: "success", message: "เพิ่มข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
    }
}

//get all group_customer
async function get_all_group_customer(req, res) {
    try {
        // //console.log(req.body);
        const whereConditions = {};
        if(req.body.position_name != "SuperAdmin"){
            if (req.body.group_customer_id) whereConditions.id = req.body.group_customer_id;
        }
        let data = await db.GroupCustomer.findAll({
            where:whereConditions,
            
        });
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_group_customer_user(req, res) {
    try {
        const whereConditions = {};
        if(req.body.position_name != "SuperAdmin"){
            if (req.body.group_customer_id) whereConditions.id = req.body.group_customer_id;
        }
        
        let data = await db.GroupCustomer.findAll({
            where: whereConditions,
        });
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

async function get_all_group_name(req, res) {
    try {
        let data = await db.MapProductStore.findAll({
            where: { 
                account_id: req.body.account_id,
                account_type_id: req.body.account_type_id,
                group_customer_id: req.body.group_customer_id,
            }
        });
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_group_name_compliance(req, res) {
    try {
        const storeIds = Array.isArray(req.body.store_id) ? req.body.store_id : [req.body.store_id];
        for (const store_id of storeIds) {
            let data = await db.MapStoreCompliance.findAll({
                where: { 
                    store_id: store_id,
                }
            });
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
function removeDuplicatesByName(arr) {
    const nameCount = arr.reduce((count, item) => {
        count[item.name] = (count[item.name] || 0) + 1;
        return count;
    }, {});

    // กรองเฉพาะ name ที่ไม่ซ้ำ
    return arr.filter(item => nameCount[item.name] === 1);
}

// ฟังก์ชันหลัก
async function get_all_produuct_store_compliance(req, res) {
    try {
        // ตรวจสอบ store_id ที่ส่งมา
        const storeIds = Array.isArray(req.body.store_id) ? req.body.store_id : [req.body.store_id];

        // ดึงข้อมูลทั้งหมดจากฐานข้อมูลในครั้งเดียว
        const results = await db.MapStoreCompliance.findAll({
            where: {
                store_id: storeIds
            }
        });

        // ตรวจสอบว่ามีข้อมูลหรือไม่
        if (results.length === 0) {
            return res.send({ status: "success", data: [] });
        }

        // กรองข้อมูลไม่ให้ซ้ำ
        const uniqueData = removeDuplicatesByName(results.map(item => item.toJSON()));

        res.send({ status: "success", data: results });
    } catch (err) {
        console.error(err);
        res.status(500).send({
            status: "error",
            message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!"
        });
    }
}
//get group_customer by id
async function get_group_customer_by_id(req, res) {
    try {
        let data = await db.GroupCustomer.findByPk(req.params.id);

        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//update group_customer
async function update_group_customer(req, res) {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.GroupCustomer.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.GroupCustomer.update(req.body, { where: { id: req.params.id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

}

//update group_customer isActive
async function update_group_customer_isActive(req, res) {
    const id = req.params.id;
    const error = validation(req, ['isActive']);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.GroupCustomer.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.GroupCustomer.update(req.body, { where: { id: id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }
}

module.exports = {

    //exprot function
    create_group_customer,
    get_all_group_customer,
    get_all_group_customer_user,
    get_all_group_name,
    get_all_group_name_compliance,
    get_group_customer_by_id,
    update_group_customer,
    update_group_customer_isActive,
    get_all_produuct_store_compliance,


    findAll: async (req, res) => {
        const name = req.query.name;
        var condition = name ? { name: { [Op.like]: `%${name}%` } } : null;
        const { page, perPage, sort } = req.body;
        const { limit, offset } = getPagination(page, perPage);
        const order = [[sort.field ? sort.field : 'id', sort.desc ? 'DESC' : 'ASC']];

        try {
            let data = await db.GroupCustomer.findAndCountAll({
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
