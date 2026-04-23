const db = require("../models")

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op

// function create account_type
async function create_account_type(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        await db.AccountType.create({
            group_customer_id: req.body.group_customer_id,

            account_id: parseInt(req.body.account_id),
            name: req.body.name,
            isActive: 'Y'
        })
        res.send({ status: "success", message: req.body });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
    }
}

//get all account_type
async function get_all_account_type(req, res) {
    try {

        const whereConditions = {};
        // if (req.body.position_name != "SuperAdmin") {
            if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
            if (req.body.account_id) whereConditions.id = req.body.account_id;
        // }


        let data = await db.Account.findAll({
            where: whereConditions,
        });

        if (!data || data.length === 0) {
            return res.json({
                data: []
            });
        }


        let id = [];
        id = data.map((item) => {
            return item.id;
        });

        let datax = await db.AccountType.findAll({
            where: {
                account_id: id,
            },
            include: [
                {
                    model: db.Account,
                    as: 'account',
                    required: false,
                },{
                    model: db.GroupCustomer,
                    as: 'group_customer', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                    required: false, // required: false ทำให้เป็น LEFT JOIN
                },
            ],
        });
        
        // ดึงข้อมูลพร้อมกับการ join ตาราง tb_account (Account)
        // let data = await db.AccountType.findAll({
        //     include: [
        //         {
        //             model: db.Account,
        //             as: 'account', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
        //             required: false, // required: false ทำให้เป็น LEFT JOIN
        //         },
        //     ],
        // });
        
        res.send({ status: "success", data: datax });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//get account_type by id
async function get_account_type_by_id(req, res) {
    try {
        let data = await db.AccountType.findByPk(req.params.id);

        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

async function get_account_type_by_accountid(req, res) {
    try {
        const whereConditions = {};
        if(req.body.position_name != 'SuperAdmin'){
            if(req.body.position_name == 'Admin' || req.body.position_name == 'Management'){
                var storeIdsString = await db.MapUserStorelist.findAll({
                    where: {
                        group_customer_id: req.body.group_customer_id,
                    },
                    attributes: ['store_id'], // ดึงแค่ store_id เท่านั้น
                    raw: true // ให้ผลลัพธ์เป็น JSON ธรรมดา
                });
                const mapUserStoresx = storeIdsString.map(store => store.store_id).join(',');
                var storeIdsArray = mapUserStoresx.split(',').map(id => parseInt(id, 10));
    
                //console.log(mapUserStoresx.store_id);
            }else if(req.body.position_name == 'Supervisor'){
                let UserData = await db.User.findOne({
                    where: { 
                        id: req.body.user_id,
                    },
                });
                
                if (!UserData) {
                    return res.status(404).json({ status: "error", message: "User not found" });
                }
                
                var storeIdsString = await db.MapUserStorelist.findAll({
                    where: {
                        group_customer_id: UserData.group_customer_id,
                    },
                    attributes: ['store_id'], // ดึงแค่ store_id เท่านั้น
                    raw: true // ให้ผลลัพธ์เป็น JSON ธรรมดา
                });
                var mapUserStoresx = storeIdsString.map(store => store.store_id).join(',');
                var storeIdsArray = mapUserStoresx.split(',').map(id => parseInt(id, 10));
    
                //console.log(mapUserStoresx.store_id);
            }else{
                if (req.body.account_id) whereConditions.account_id = req.body.account_id;
                let mapUserStoresx = await db.MapUserStore.findOne({
                    where: {
                        user_id: req.body.user_id
                    },
                });
                var storeIdsArray = mapUserStoresx.store_id.split(',').map(id => parseInt(id, 10));
            }
        }else{
            var storeIdsString = await db.MapUserStorelist.findAll({
                where: {
                    group_customer_id: req.body.group_customer_id,
                },
                attributes: ['store_id'], // ดึงแค่ store_id เท่านั้น
                raw: true // ให้ผลลัพธ์เป็น JSON ธรรมดา
            });
            const mapUserStoresx = storeIdsString.map(store => store.store_id).join(',');
            var storeIdsArray = mapUserStoresx.split(',').map(id => parseInt(id, 10));

            //console.log(mapUserStoresx.store_id);
        }
        

        
        const stores = await db.Store.findAll({
            where: {
            id: {
                [Op.in]: storeIdsArray,
            },
            },
        });
        const accountIdsArray = stores.map(store => store.account_type_id).filter(id => id); // ดึง account_id และกรองค่าที่ไม่ใช่ null หรือ undefined
        if (accountIdsArray.length === 0) {
            return res.send({ status: "successx", data: [], stores: stores });
        }
        let data = await db.Store.findAll({
            attributes: [
                'account_type_id',
                'accountType.name',
            ],
            where: {
                group_customer_id: req.body.group_customer_id,
                account_id: req.body.account_id,
            },
            include: [
                {
                    model: db.AccountType,
                    as: 'accountType',
                    required: false,
                },
            ],
            group: ['account_type_id']
        });
        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data, whereConditions: whereConditions, accountIdsArray: accountIdsArray });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//update account_type
async function update_account_type(req, res) {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.AccountType.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.AccountType.update(req.body, { where: { id: req.params.id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

}

//update account_type isActive
async function update_account_type_isActive(req, res) {
    const id = req.params.id;
    const error = validation(req, ['isActive']);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.AccountType.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.AccountType.update(req.body, { where: { id: id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }
}

module.exports = {

    //exprot function
    create_account_type,
    get_all_account_type,
    get_account_type_by_id,
    get_account_type_by_accountid,

    update_account_type,
    update_account_type_isActive,



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
