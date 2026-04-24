const db = require("../models")

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op
const { Sequelize } = require('sequelize');
// function create account
async function create_account(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        await db.Account.create({
            group_customer_id: req.body.group_customer_id,
            name: req.body.name,
            isActive: 'Y'
        })
        res.send({ status: "success", message: "เพิ่มข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
    }
}

//get all account
async function get_all_account(req, res) {
    try {

        const whereConditions = {};
        // if (req.body.position_name != "SuperAdmin") {
            if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        // }

        let data = await db.Account.findAll({
            where: whereConditions,
            include: [
                {
                    model: db.GroupCustomer,
                    as: 'group_customer', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                    required: false, // required: false ทำให้เป็น LEFT JOIN
                },
            ],
        });

        if (!data || data.length === 0) {
            return res.json({
                data: []
            });
        }

        res.send({ status: "success", data: data });
        // res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_account_filter(req, res) {
    try {
      let data = await db.StoreToAccount.findAll({
        attributes: [
          'account_id',
          [Sequelize.fn('MAX', Sequelize.col('StoreToAccount.id')), 'id'], // ระบุชื่อ table สำหรับคอลัมน์ id
        ],
        include: [
          {
            model: db.Account,
            as: 'account',
            attributes: ['name'], // เลือกเฉพาะฟิลด์ที่ต้องการใน Account
            required: false,
          },
        ],
        where: {
          group_customer_id: req.body.group_customer_id
        },
        group: ['account_id']
      });
  
      res.send({ status: "success", data: data });
    } catch (err) {
      res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function get_all_account_filter_user(req, res) {
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
                    raw: true,
                });
                
                var storeIdsStringxxx = [];
                for (const record of storeIdsString) {
                    // เปลี่ยน record.id เป็น record.store_id เพราะเราเลือก store_id ใน query
                    let userDataxxx = await db.User.findOne({
                        where: { 
                            id: record.user_id,
                            area_supervisor: UserData.area_supervisor,
                            area_manager: UserData.area_manager,
                        },
                    });
                    if (userDataxxx) {
                        storeIdsStringxxx.push(record);
                    }
                }
                
                const mapUserStoresx = storeIdsStringxxx.map(store => store.store_id).join(',');
                var storeIdsArray = mapUserStoresx.split(',').map(id => parseInt(id, 10));
    
                //console.log(mapUserStoresx.store_id);
            }else{
                
                if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
                if (req.body.account_id) whereConditions.account_id = req.body.account_id;
    
                var mapUserStoresx = await db.MapUserStore.findOne({
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
        const accountIdsArray = stores.map(store => store.account_id).filter(id => id); // ดึง account_id และกรองค่าที่ไม่ใช่ null หรือ undefined
        // ตรวจสอบว่ามี account_id หรือไม่
        if (accountIdsArray.length === 0) {
            return res.send({ status: "success", data: [], stores: stores });
        }
        let data = await db.StoreToAccount.findAll({
            attributes: [
                'account_id',
                [Sequelize.fn('MAX', Sequelize.col('StoreToAccount.id')), 'id'], // ระบุชื่อ table สำหรับคอลัมน์ id
            ],
            include: [
                {
                model: db.Account,
                as: 'account',
                attributes: ['name'], // เลือกเฉพาะฟิลด์ที่ต้องการใน Account
                required: false,
                },
            ],
            where: {
                ...whereConditions,
                account_id: {
                    [Op.in]: accountIdsArray, // กรองเฉพาะ account_id ที่ตรงกัน
                },
            },
            group: ['account_id']
        });

        res.send({ status: "success", data: data, stores: stores });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
//get account by id
async function get_account_by_id(req, res) {
    try {
        let data = await db.Account.findByPk(req.params.id);

        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//update account
async function update_account(req, res) {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.Account.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.Account.update(req.body, { where: { id: req.params.id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

}

//update account isActive
async function update_account_isActive(req, res) {
    const id = req.params.id;
    const error = validation(req, ['isActive']);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.Account.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.Account.update(req.body, { where: { id: id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }
}



async function get_account_by_user_position(req, res) {
    try {
        let storeIdsArray = [];
        const db = require('../models');
        const { Op } = require("sequelize");

        // 1. ตรวจสอบสิทธิ์ว่าไม่ใช่ SuperAdmin
        if (req.body.position_name !== 'SuperAdmin' && req.body.position_name !== 'Admin') {
            if (req.body.position_name === 'Supervisor' || req.body.position_name === 'Management') {
                const UserData = await db.User.findOne({ where: { id: req.body.user_id } });
                if (!UserData) return res.status(404).json({ status: "error", message: "User not found" });

                const storeIdsString = await db.MapUserStorelist.findAll({
                    where: { group_customer_id: UserData.group_customer_id },
                    raw: true,
                });

                // หาพนักงานทั้งหมดที่อยู่ใต้ Supervisor คนนี้
                const usersUnderSup = await db.User.findAll({
                    where: {
                        area_supervisor: UserData.area_supervisor,
                        area_manager: UserData.area_manager,
                    },
                    attributes: ['id'],
                    raw: true
                });
                const userIds = usersUnderSup.map(u => u.id);

                storeIdsArray = storeIdsString
                    .filter(record => userIds.includes(record.user_id))
                    .map(record => parseInt(record.store_id, 10))
                    .filter(id => !isNaN(id));

            } else {
                // สำหรับ 'พนักงาน' หรือ Role อื่นๆ
                const mapUserStoresx = await db.MapUserStore.findOne({
                    where: { user_id: req.body.user_id },
                });
                if (mapUserStoresx && mapUserStoresx.store_id) {
                    storeIdsArray = mapUserStoresx.store_id.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
                }
            }
        } else {
            // กรณีเป็น SuperAdmin (ดึงทั้งหมด หรือกรองตาม group ที่เลือก)
            const storeIdsString = await db.MapUserStorelist.findAll({
                where: req.body.group_customer_id ? { group_customer_id: req.body.group_customer_id } : {},
                attributes: ['store_id'],
                raw: true
            });
            storeIdsArray = storeIdsString.map(store => parseInt(store.store_id, 10)).filter(id => !isNaN(id));
        }

        // 2. ถ้าไม่มี Store ผูกไว้เลย ส่ง Array ว่างกลับ
        if (storeIdsArray.length === 0) {
            return res.send({ status: "success", data: [], stores: [] });
        }

        // 3. ไปหา Account_id จาก Store ที่หาได้
        const stores = await db.Store.findAll({
            where: { id: { [Op.in]: storeIdsArray } }
        });

        // ใช้ Set เพื่อกรอง account_id ไม่ให้ซ้ำกัน
        const accountIdsArray = [...new Set(stores.map(store => store.account_id).filter(id => id))];

        if (accountIdsArray.length === 0) {
            return res.send({ status: "success", data: [], stores: stores });
        }

        // 4. ดึงข้อมูลตาราง Account ของจริง
        let data = await db.Account.findAll({
            where: { id: { [Op.in]: accountIdsArray } }
        });

        // 5. แปลงโครงสร้างให้ตรงกับที่ Frontend คาดหวัง
        const formattedData = data.map(acc => ({
            account_id: acc.id,
            account: { name: acc.name },
            group_customer_id: acc.group_customer_id
        }));

        res.send({ status: "success", data: formattedData, stores: stores });
    } catch (err) {
        console.error("Account Filter Error:", err);
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}


module.exports = {

    //exprot function
    create_account,
    get_all_account,
    get_all_account_filter,
    get_all_account_filter_user,
    get_account_by_id,
    update_account,
    update_account_isActive,
    get_account_by_user_position,



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

};