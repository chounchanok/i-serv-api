const db = require("../models")

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op

// function create MapStoreComplianceList
async function create_MapStoreComplianceList(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }
    try {
        await db.MapStoreComplianceList.create(req.body)
        res.send({ status: "success", message: "เพิ่มข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
    }
}
async function createOrUpdate_MapStoreComplianceList(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    const MapStoreComplianceList = req.body; // สมมุติว่า array ถูกส่งเข้ามาใน req.body

    try {
        for (const item of MapStoreComplianceList) {
            if (item.id === null) {
                // ถ้า id เป็น null ให้สร้างรายการใหม่
                const results2xxx = await db.MapStoreComplianceList.create({
                    area: item.area,
                    map_product_id: item.map_product_id,
                    product_id: item.product_id,
                    placement_point_id: item.placement_point_id || 192,
                    rental_area_unit_name: item.rental_area_unit_name,
                    qty: item.qty,
                    rental_area_unit_id: item.rental_area_unit_id,
                    startdate: item.startdate,
                    enddate: item.enddate,
                });
                // ตรวจสอบว่ามี Compliance ที่ store_id นี้ไหม
                const compliances = await db.Compliance.findAll({
                    where: {
                        store_id: item.store_id,
                        datesave: {
                            [Op.between]: [item.startdate, item.enddate]
                        }
                    }
                });
                for (const compliance of compliances) {
                    const exists = await db.ComplianceList.findOne({
                        where: {
                            compliance_id: compliance.id,
                            map_storecompliance_list_id: results2xxx.id
                        }
                    });
                    if (!exists) {
                        await db.ComplianceList.create({
                            compliance_id: compliance.id,
                            map_storecompliance_list_id: results2xxx.id,
                            placement_point_id: item.placement_point_id || 0,
                            rental_area_unit_name: item.rental_area_unit_name || 0,
                            qty: item.qty || 0,
                            rental_area_unit_id: item.rental_area_unit_id || 0,
                            isActive: 'Y'
                        });
                    }
                }
            } else {
                // ถ้า id มีค่า ให้ทำการ update โดยใช้ id ที่มี
                const results = await db.MapStoreComplianceList.findOne({ where: {
                    id: item.id,
                    // map_product_id: item.map_product_id,
                    // product_id: item.product_id
                } });
                if(results){
                    const results2 = await db.MapStoreComplianceList.findOne({ where: {
                        id: item.id,
                        map_product_id: item.map_product_id,
                        // product_id: item.product_id
                    } });
                    if(results2){
                        await db.MapStoreComplianceList.update({
                            product_id: item.product_id,
                            area: item.area,
                            // map_product_id: item.map_product_id,
                            placement_point_id: item.placement_point_id || 192,
                            rental_area_unit_name: item.rental_area_unit_name,
                            qty: item.qty,
                            rental_area_unit_id: item.rental_area_unit_id,
                            startdate: item.startdate,
                            enddate: item.enddate,
                        }, {
                            where: { id: results.id }
                        });
                    }else{
                        await db.MapStoreComplianceList.create({
                            area: item.area,
                            map_product_id: item.map_product_id,
                            product_id: item.product_id,
                            placement_point_id: item.placement_point_id || 192,
                            rental_area_unit_name: item.rental_area_unit_name,
                            qty: item.qty,
                            rental_area_unit_id: item.rental_area_unit_id,
                            startdate: item.startdate,
                            enddate: item.enddate,
                        });
                        
                    }
                    
                }else{
                    // await db.MapStoreComplianceList.create({
                    //     area: item.area,
                    //     map_product_id: item.map_product_id,
                    //     product_id: item.product_id,
                    //     placement_point_id: item.placement_point_id,
                    //     rental_area_unit_name: item.rental_area_unit_name,
                    //     qty: item.qty,
                    //     rental_area_unit_id: item.rental_area_unit_id,
                    //     startdate: item.startdate,
                    //     enddate: item.enddate,
                    // });
                }
                // const results = await db.MapStoreComplianceList.findAll({
                //     where: {
                //         map_product_id: item.map_product_id
                //     }
                // });
                // for (const itemx of results) {
                //     for (const itemz of MapStoreComplianceList) {
                        
                //     }
                // }
                
            }

            
            // const countx = await db.Compliance.count({
            //     where: {
            //         store_id:item.store_id
            //     }
            // });
            // if(countx > 0){
            //     const dataCompliance = await db.Compliance.findAll({
            //         where: { 
            //             store_id: item.store_id
            //         }
            //     });
            //     if(dataCompliance.length > 0){
            //         for (const dataCompliancex of dataCompliance) {
            //             const ComplianceList = await db.ComplianceList.findAll({
            //                 where: { compliance_id: dataCompliancex.id }
            //             });
            //             if(ComplianceList.length > 0){
            //                 //console.log(3);
            //                 for (const product of ComplianceList) {
            //                     await db.ComplianceList.create({
            //                         compliance_id: datax.id,
            //                         map_storecompliance_list_id: product.map_product_store_list_id,
            //                         placement_point_id: product.placement_point_id || 0,
            //                         rental_area_unit_name: product.rental_area_unit_name || 0,
            //                         qty: product.qty || 0,
            //                         rental_area_unit_id: product.rental_area_unit_id || 0,
            //                         isActive: 'Y'
            //                     });
            //                 }
            //             }
            //         }
            //     }
            // }
        }

        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลได้ในตอนนี้!" });
    }
}
//get all MapStoreComplianceList
async function get_all_MapStoreComplianceList(req, res) {
    try {
        let data = await db.MapStoreComplianceList.findAll({
            include: [
                {
                    model: db.MapStoreCompliance,
                    as: 'mapStoreCompliance', // ชื่อ alias ที่ตั้งไว้ใน model
                    required: false, // เลือกเฉพาะฟิลด์ที่ต้องการ (เช่น name)
                },
                {
                    model: db.Product,
                    as: 'mapStoreComplianceList', // ชื่อ alias ที่ตั้งไว้ใน model
                    required: false, // เลือกเฉพาะฟิลด์ที่ต้องการ (เช่น name)
                },
            ],
        });
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

async function get_all_MapStoreComplianceList_filter(req, res) {
    try {
        // ตรวจสอบว่าค่าต่าง ๆ มีใน req.body หรือไม่
        const whereConditions = {};
        if (req.body.store_id) whereConditions.store_id = req.body.store_id;
        if (req.body.name) whereConditions.name = req.body.name;
        // //console.log(whereConditions);
        let data = await db.MapStoreComplianceList.findAll({
            include: [
                {
                    model: db.MapStoreCompliance,
                    as: 'mapStoreCompliance', // ชื่อ alias ที่ตั้งไว้ใน model
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

//get MapStoreComplianceList by id
async function get_MapStoreComplianceList_by_id(req, res) {
    try {
        let data = await db.MapStoreComplianceList.findByPk(req.params.id);

        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//update MapStoreComplianceList
async function update_MapStoreComplianceList(req, res) {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.MapStoreComplianceList.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.MapStoreComplianceList.update(req.body, { where: { id: req.params.id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

}

//update MapStoreComplianceList isActive
async function update_MapStoreComplianceList_isActive(req, res) {
    const id = req.params.id;
    const error = validation(req, ['isActive']);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.MapStoreComplianceList.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.MapStoreComplianceList.update(req.body, { where: { id: id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }
}

module.exports = {

    //exprot function
    create_MapStoreComplianceList,
    createOrUpdate_MapStoreComplianceList,
    get_all_MapStoreComplianceList,
    get_all_MapStoreComplianceList_filter,
    get_MapStoreComplianceList_by_id,
    update_MapStoreComplianceList,
    update_MapStoreComplianceList_isActive,



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
