const db = require("../models")

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op
const path = require('path');
const fs = require('fs');

// function create Oos
async function create_Oos(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }
    try {
        const whereConditions = {};
        if (req.body.account_id) whereConditions.account_id = req.body.account_id;
        if (req.body.account_type_id) whereConditions.account_type_id = req.body.account_type_id;
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        const count = await db.Oos.count({
            where: {
                account_id: req.body.account_id,
                account_type_id: req.body.account_type_id,
                group_customer_id: req.body.group_customer_id
            }
        });
        //console.log(count);
        if(count == 0){
            var data = await db.Oos.create(req.body)
            //console.log(data);
        }else{
            const whereConditions = {};
            if (req.body.account_id) whereConditions.account_id = req.body.account_id;
            if (req.body.account_type_id) whereConditions.account_type_id = req.body.account_type_id;
            if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
            //console.log(whereConditions);
            var data = await db.Oos.findOne({ where: whereConditions });
        }
        
        res.send({ status: "success", message: "เพิ่มข้อมูลเรียบร้อย", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
    }
}

//get all Oos
async function get_all_Oos(req, res) {
    try {
        const whereConditions = {};
        if (req.body.group_id) whereConditions.group_id = req.body.group_id;

        const count = await db.Oos.count({
            where: {
                group_id: req.body.group_id,
                datenow: req.body.datenow
            }
        });

        //console.log(count);
        const projectRoot = path.join(__dirname, '../');
        let data;
        const BrandList = new Set();
        if (count === 0) {
            var datax = await db.Oos.create(req.body);
            const productList = await db.MapProductStoreList.findAll({
                where: { map_product_id: req.body.group_id }
            });
        
            // วนลูปสร้างรายการใน OosList สำหรับสินค้าแต่ละตัวที่เจอ
            for (const product of productList) {
                await db.OosList.create({
                    oos_id: datax.id,
                    map_product_store_list_id: product.id,
                    qty: req.body.qty || 0,
                    oos: req.body.oos || 'N',
                    not_sell: req.body.not_sell || 'N',
                    note: req.body.note || '',
                    isActive: 'Y'
                });
            }

            data = await db.Oos.findOne({
                where: whereConditions,
                order: [['id', 'DESC']],
                include: [{
                    model: db.OosList,
                    as: 'oosDetails',
                    include: [{
                        model: db.MapProductStoreList,
                        as: 'mapProductStoreList',
                        include: [{
                            model: db.Product,
                            as: 'product',
                            required: false,
                            include: [
                                {
                                    model: db.Brand,
                                    as: 'brand', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                                    required: false, // required: false ทำให้เป็น LEFT JOIN
                                    where: {
                                        id: { [db.Sequelize.Op.or]: [null, { [db.Sequelize.Op.ne]: null }] }
                                    }
                                },{
                                    model: db.SubBrand,
                                    as: 'subBrand', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                                    required: false, // required: false ทำให้เป็น LEFT JOIN
                                    where: {
                                        id: { [db.Sequelize.Op.or]: [null, { [db.Sequelize.Op.ne]: null }] }
                                    }
                                }
                            ],
                        }]
                    }]
                }]
            });
            // แปลงรูปภาพของแต่ละ product เป็น Base64
            await Promise.all(
                data.oosDetails.map(async (oosDetail) => {
                    const product = oosDetail.mapProductStoreList.product;
                    if (product && product.picture) {
                        const picPaths = product.picture.split(',');
                        const base64Images = await Promise.all(
                            picPaths.map(async (picPath) => {
                                const imagePath = path.resolve(projectRoot, picPath.trim());
                                const fileName = path.basename(picPath.trim());

                                try {
                                    const imageData = await fs.promises.readFile(imagePath);
                                    return {
                                        url: `data:image/jpeg;base64,${imageData.toString('base64')}`,
                                        name: fileName,
                                        id: product.id
                                    };
                                } catch (err) {
                                    console.error(`Error reading image (${fileName}):`, err.message);
                                    return null;
                                }
                            })
                        );
                        product.dataValues.picture_cut = base64Images.filter(img => img !== null);
                    } else {
                        product.dataValues.picture_cut = [];
                    }
                })
            );
        } else {
            data = await db.Oos.findOne({
                where: whereConditions,
                order: [['id', 'DESC']],
                include: [{
                    model: db.OosList,
                    as: 'oosDetails',
                    include: [{
                        model: db.MapProductStoreList,
                        as: 'mapProductStoreList',
                        include: [{
                            model: db.Product,
                            as: 'product',
                            // attributes: ['name','picture'],
                            required: false,
                            include: [
                                {
                                    model: db.Brand,
                                    as: 'brand', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                                    required: false, // required: false ทำให้เป็น LEFT JOIN
                                    where: {
                                        id: { [db.Sequelize.Op.or]: [null, { [db.Sequelize.Op.ne]: null }] }
                                    }
                                },{
                                    model: db.SubBrand,
                                    as: 'subBrand', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                                    required: false, // required: false ทำให้เป็น LEFT JOIN
                                    where: {
                                        id: { [db.Sequelize.Op.or]: [null, { [db.Sequelize.Op.ne]: null }] }
                                    }
                                }
                            ],
                        }]
                    }]
                }]
            });
            // แปลงรูปภาพของแต่ละ product เป็น Base64
            await Promise.all(
                
                data.oosDetails.map(async (oosDetail) => {
                    //console.log(oosDetail.mapProductStoreList.product)
                    const product = oosDetail.mapProductStoreList.product;
                    if (product) {
                        if (product.brand && product.brand.name) {
                            BrandList.add(product.brand.name);
                        }
                        if (product.subBrand && product.subBrand.name) {
                            BrandList.add(product.subBrand.name);
                        }
                    }
                    if (product && product.picture) {
                        //console.log(product.picture);
                        const picPaths = product.picture.split(',');
                        const base64Images = await Promise.all(
                            picPaths.map(async (picPath) => {
                                const imagePath = path.resolve(projectRoot, picPath.trim());
                                const fileName = path.basename(picPath.trim());

                                try {
                                    const imageData = await fs.promises.readFile(imagePath);
                                    return {
                                        url: `data:image/jpeg;base64,${imageData.toString('base64')}`,
                                        name: fileName,
                                        id: product.id
                                    };
                                } catch (err) {
                                    console.error(`Error reading image (${fileName}):`, err.message);
                                    return null;
                                }
                            })
                        );
                        product.dataValues.picture_cut = base64Images.filter(img => img !== null);
                    } else {
                        product.dataValues.picture_cut = [];
                    }
                })
            );
        }

        // หา specificDisabledDates สำหรับ 7 วันที่ผ่านมา
        const specificDisabledDates = [];
        const targetDate = new Date(req.body.datenow);
        
        for (let i = 1; i <= 7; i++) {
            const dateToCheck = new Date(targetDate);
            dateToCheck.setDate(targetDate.getDate() - i);
            const formattedDate = dateToCheck.toISOString().split('T')[0];

            // ตรวจสอบว่าในแต่ละวันที่ไม่มีข้อมูลใน db.Oos
            const dateExists = await db.Oos.count({
                where: {
                    group_id: req.body.group_id,
                    datenow: formattedDate
                }
            });

            if (dateExists === 0) {
                specificDisabledDates.push(formattedDate);
            }
        }
        const uniqueBrandList = Array.from(BrandList);
        res.send({
            status: "success",
            data: data,
            specificDisabledDates: specificDisabledDates,
            BrandList: uniqueBrandList
        });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//get Oos by id
async function get_Oos_by_id(req, res) {
    try {
        let data = await db.Oos.findByPk(req.params.id);

        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//update Oos
async function update_Oos(req, res) {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.Oos.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.Oos.update(req.body, { where: { id: req.params.id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

}

//update Oos isActive
async function update_Oos_isActive(req, res) {
    const id = req.params.id;
    const error = validation(req, ['isActive']);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.Oos.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.Oos.update(req.body, { where: { id: id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }
}
async function delete_Oos(req, res) {
    const id = req.params.id;
    try {
        // ค้นหาแถวใน Oos
        let row = await db.Oos.findByPk(id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการลบ');
        }

        // ลบรายการที่เกี่ยวข้องใน OosList ก่อน
        await db.OosList.destroy({
            where: { map_product_id: id } // หรือใช้ฟิลด์ที่เชื่อมต่อกับ Oos (เช่น OosId)
        });

        // ลบรายการใน Oos
        await db.Oos.destroy({
            where: { id: id }
        });

        res.send({ status: "success", message: "ลบข้อมูลเรียบร้อยแล้ว" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถลบข้อมูลได้!" });
    }
}
module.exports = {

    //exprot function
    create_Oos,
    get_all_Oos,
    get_Oos_by_id,
    update_Oos,
    update_Oos_isActive,
    delete_Oos,


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
