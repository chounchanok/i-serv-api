const db = require("../models")
const { validation, getPagingData, getPagination } = require("../utilities/function")
const { setUpCookie } = require('../middleware/admin')
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op

module.exports = {

  renew_product_oos: async (req, res) => {
    const error = validation(req);  
    if (error) {
      return res.status(422).json(error);
    }

    const t = await db.sequelize.transaction();

    const now = new Date();
    const dateNow = now.toISOString().split('T')[0];
    
    try {
      const oos = await db.Oos.findOne({
                            where: { 
                                user_id: req.body.user_id,
                                store_id: req.body.store_id,
                                datesave: dateNow,
                            }
                        });
      
      if (!oos) {
        return res.json({ status: 'error', message: 'ไม่พบข้อมูล OOS' });
      }

      await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction: t });

      await db.OosList.destroy({
          where: { oos_id: oos.id },
          transaction: t
      });

      await db.Oos.destroy({
          where: { id: oos.id },
          transaction: t
      });

      await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction: t });

      await t.commit();
      
      res.json({ status: 'success', message: 'ลบข้อมูล OOS สำเร็จ' });
    } catch (err) {
      res.json({ status: 'error', message: err.message });
    }
  },

  renew_product_offtake: async (req, res) => {
    const error = validation(req);  
    if (error) {
      return res.status(422).json(error);
    }

    const t = await db.sequelize.transaction();
    
    const now = new Date();
    const dateNow = now.toISOString().split('T')[0];

    try {
      const offtake = await db.Offtake.findOne({
                            where: { 
                                user_id: req.body.user_id,
                                store_id: req.body.store_id,
                                datenow: dateNow,
                            }
                        });
      
      if (!offtake) {
        return res.json({ status: 'error', message: 'ไม่พบข้อมูล Offtake' });
      }

      await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction: t });
      
      await db.OfftakeList.destroy({
          where: { offtake_id: offtake.id },
          transaction: t
      });

      await db.Offtake.destroy({
          where: { id: offtake.id },
          transaction: t
      });

      await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction: t });

      await t.commit();

      res.json({ status: 'success', message: 'ลบข้อมูล Offtake สำเร็จ' });
    } catch (err) {
      res.json({ status: 'error', message: err.message });
    }
  },

  renew_product_price: async (req, res) => {
    const error = validation(req);  
    if (error) {
      return res.status(422).json(error);
    }

    const t = await db.sequelize.transaction();
    
    const now = new Date();
    const dateNow = now.toISOString().split('T')[0];

    try {
      const price = await db.PricePromotion.findOne({
                            where: { 
                                user_id: req.body.user_id,
                                store_id: req.body.store_id,
                                datenow: dateNow,
                            }
                        });
      
      if (!price) {
        return res.json({ status: 'error', message: 'ไม่พบข้อมูล Price & Promotion' });
      }

      await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction: t });

      await db.PricePromotionList.destroy({
          where: { pricepromotion_id: price.id },
          transaction: t
      });

      await db.PricePromotion.destroy({
          where: { id: price.id },
          transaction: t
      });

      await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction: t });

      await t.commit();

      res.json({ status: 'success', message: 'ลบข้อมูล Price & Promotion สำเร็จ' });
    } catch (err) {
      res.json({ status: 'error', message: err.message });
    }
  },

  renew_product_week: async (req, res) => {
    const error = validation(req);  
    if (error) {
      return res.status(422).json(error);
    }

    const t = await db.sequelize.transaction();

    const now = new Date();
    const dateNow = now.toISOString().split('T')[0];
    
    try {
      const week = await db.Week.findOne({
                            where: { 
                                user_id: req.body.user_id,
                                store_id: req.body.store_id,
                                datenow: dateNow,
                            }
                        });
      
      if (!week) {
        return res.json({ status: 'error', message: 'ไม่พบข้อมูล 12 Week' });
      }

      await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { transaction: t });

      await db.WeekList.destroy({
          where: { week_id: week.id },
          transaction: t
      });

      await db.Week.destroy({
          where: { id: week.id },
          transaction: t
      });

      await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { transaction: t });

      await t.commit();

      res.json({ status: 'success', message: 'ลบข้อมูล 12 Week สำเร็จ' });
    } catch (err) {
      res.json({ status: 'error', message: err.message });
    }
  },

  create: async (req, res) => {
    const error = validation(req);
    if (error) {
      return res.status(422).json(error);
    }


    try {
      await db.Admin.create({
        username: req.body.username,
        password: await Bcrypt.hashSync(req.body.password, 10),
        isActive: 'Y'
      })
      res.send({ status: "success", message: "เพิ่มข้อมูลเรียบร้อย" });
    } catch (err) {
      res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
    }

  },

  findAll: async (req, res) => {
    const username = req.query.username;
    var condition = username ? { username: { [Op.like]: `%${username}%` } } : null;
    const { page, perPage, sort } = req.body;
    const { limit, offset } = getPagination(page, perPage);
    const order = [[sort.field ? sort.field : 'id', sort.desc ? 'DESC' : 'ASC']];

    try {
      let data = await db.Admin.findAndCountAll({
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
      let row = await db.Admin.findByPk(req.params.id);
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
      let row = await db.Admin.findByPk(req.params.id);
      if (!row) {
        throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
      }
      delete req.body.username;
      if (req.body.password) {
        req.body.password = await Bcrypt.hashSync(req.body.password, 10);
      } else {
        delete req.body.password;
      }
      await db.Admin.update(req.body, { where: { id: req.params.id } });
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
      let row = await db.user.findByPk(req.params.id);
      if (!row) {
        throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการลบ');
      }
      await db.Admin.destroy({ where: { id: req.params.id } });
      res.send({ status: "success", message: "ลบข้อมูลเรียบร้อย" });
    } catch (err) {
      res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }

  },

  me: async (req, res) => {
    const user = await db.Admin.findOne({ where: { id: req.user.id } });
    res.send({ status: "success", user: user });
  },


  login: async (req, res) => {

    //console.log(req.body);

    const error = validation(req);

    if (error) {
      return res.status(422).json(error);
    }

    try {
      let row = await db.User.scope("withPassword").findOne({
        where: { code: req.body.email,isActive: 'Y' },
        include: [
          {
            model: db.Position, // ชื่อ model ของตาราง Position
            as: 'position', // alias ที่กำหนดในความสัมพันธ์
            required: false,
          }
        ]
      });
      // res.send({ status: "error", user: row});
      // return false
      // let row = await db.User.scope("withPassword").findOne({ where: { code: req.body.email } });

      if (row) {

        var user = row.toJSON();
        const passwordIsValid = Bcrypt.compareSync(req.body.password, user.password);
        if (!passwordIsValid) {
          throw new Error("รหัสผ่านไม่ถูกต้อง.");
        }

        row.loginAt = Date();

        row.token = await Bcrypt.hashSync(row.code + row.loginAt, 10);
        await row.save();

        //Assign Token
        let payload = (await db.User.scope("withPublic").findByPk(row.id, {
          include: [
            {
              model: db.Position, // ชื่อ model ของตาราง Position
              as: 'position', // alias ที่ตั้งไว้ในความสัมพันธ์ระหว่าง User และ Position
              required: false,
            }
          ]
        })).toJSON();
        let result = setUpCookie(res, null, payload)
        //console.log("payload", payload);
        if (result.error) {
          throw new Error(result.message)
        }
        //console.log("payload", payload);
        const foundItem = await db.Login.findOne({ where: { mode: 'admin', user_id: payload.id } });
        if (!foundItem) {
          db.Login.create({ mode: 'admin', user_id: payload.id, token: payload.token })
        } else {
          db.Login.update({ token: payload.token }, { where: { mode: 'admin', user_id: payload.id } });
        }

        res.send({ status: "success", user: payload, token: payload.token, message: "เข้าระบบเรียบร้อย" });
      } else {
        res.send({ status: "error", message: "ไม่พบข้อมูลผู้ใช้นี้ในระบบ" });
        // throw new Error("ไม่พบข้อมูลผู้ใช้นี้ในระบบ2");
      }
    } catch (err) {
      res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเข้าระบบได้" })
    }
  },

  logout: (req, res) => {
    try {
      let result = setUpCookie(res)
      if (result.error) {
        res.status(500).send({ status: "error", message: result.message || "ไม่สามารถออกจากระบบได้" })
      } else {
        res.send({ status: "success", message: "ออกจากระบบเรียบร้อย" });
      }
    } catch (err) {
      res.status(500).send({ status: "error", message: err.message || "ไม่สามารถออกจากระบบได้" })
    }
  },



  status: async (req, res) => {
    const id = req.params.id;
    const error = validation(req, ['isActive']);
    if (error) {
      return res.status(422).json(error);
    }

    try {
      let row = await db.Admin.findByPk(req.params.id);
      if (!row) {
        throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
      }
      await db.Admin.update(req.body, { where: { id: id } });
      res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
      res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }
  },


}
