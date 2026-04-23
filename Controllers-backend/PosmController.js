const db = require("../models")

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op

// function create posm
async function create_posm(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        await db.Posm.create({
            group_customer_id: req.body.group_customer_id,
            name: req.body.name,
            isActive: 'Y'
        })
        res.send({ status: "success", message: "เพิ่มข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
    }
}

//get all posm
async function get_all_posm(req, res) {
    try {

        const whereConditions = {};
        if (req.body.position_name != "SuperAdmin") {
            if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        }
        let data = await db.Posm.findAll({
            where: whereConditions,
            include: [
                {
                    model: db.GroupCustomer,
                    as: 'group_customer', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                    required: false, // required: false ทำให้เป็น LEFT JOIN
                },
            ],
        });
        
        res.send({ status: "success", data: data });
        // let data = await db.Posm.findAll();
        // res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_posm_filter(req, res) {
    try {
        const whereConditions = {};
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        whereConditions.isActive = 'Y';
        let data = await db.Posm.findAll({
            where: whereConditions,
            include: [
                {
                    model: db.GroupCustomer,
                    as: 'group_customer', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                    required: false, // required: false ทำให้เป็น LEFT JOIN
                },
            ],
        });
        
        res.send({ status: "success", data: data });
        // let data = await db.Posm.findAll();
        // res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_product_filter(req, res) {
    try {
        const whereConditions = {};
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        let data = await db.Product.findAll({
            where: whereConditions,
        });
        
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_product_filter2_bk(req, res) {
    try {
        const whereConditions = {};
        if (req.body.store_id) whereConditions.store_id = req.body.store_id;
        let data = await db.MapStoreComplianceList.findAll({
            where: {
                isActive: 'Y'
            },
            include: [
                {
                    model: db.MapStoreCompliance,
                    as: 'mapStoreCompliance',
                    required: Object.keys(whereConditions).length > 0,
                    where: whereConditions,
                },
                {
                    model: db.Product,
                    as: 'product',
                    required: false,
                    attributes: ['id', 'name']
                },
            ],
        });

        // แปลงข้อมูลให้เหลือแค่ id และ name ของ product เท่านั้น
        const filteredData = data.map(item => item.product ? { id: item.MapStoreComplianceList.id, name: item.product.name } : null).filter(item => item !== null);

        res.send({
            status: "success",
            data: filteredData
        });
    } catch (err) {
        res.status(500).send({
            status: "error",
            message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!"
        });
    }
}
async function get_all_product_filter2(req, res) {
    try {
        const whereConditions = {};
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        whereConditions.isActive = 'Y';
        let data = await db.Product.findAll({
            where: whereConditions
        });
        // let data = await db.MapProductStoreList.findAll({
        //     where: {
        //         isActive: 'Y'
        //     },
        //     include: [
        //         {
        //             model: db.MapProductStore,
        //             as: 'mapProductStore',
        //             required: Object.keys(whereConditions).length > 0,
        //             where: whereConditions,
        //         },
        //         {
        //             model: db.Product,
        //             as: 'product',
        //             required: false,
        //             attributes: ['id', 'name']
        //         },
        //     ],
        // });

        // แปลงข้อมูลให้เหลือแค่ id และ name ของ product เท่านั้น
        const filteredData = data.map(item => item ? { id: item.id, name: item.name, name: item.flavor, newname: item.name+(item.flavor?' ('+item.flavor+')':'') } : null).filter(item => item !== null);

        res.send({
            status: "success",
            data: filteredData
        });
    } catch (err) {
        res.status(500).send({
            status: "error",
            message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!"
        });
    }
}


//get posm by id
async function get_posm_by_id(req, res) {
    try {
        let data = await db.Posm.findByPk(req.params.id);

        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//update posm
async function update_posm(req, res) {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.Posm.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.Posm.update(req.body, { where: { id: req.params.id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

}

//update posm isActive
async function update_posm_isActive(req, res) {
    const id = req.params.id;
    const error = validation(req, ['isActive']);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.Posm.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.Posm.update(req.body, { where: { id: id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }
}

module.exports = {

    //exprot function
    create_posm,
    get_all_posm,
    get_all_posm_filter,
    get_all_product_filter,
    get_all_product_filter2,
    get_posm_by_id,
    update_posm,
    update_posm_isActive,



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
