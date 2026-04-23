const db = require("../models");
const { body, param, check } = require("express-validator");
const rule = (f) => {
  switch (f) {
    case "id": {
      return [
        param("id").escape().trim()
          .notEmpty().withMessage("ID ต้องไม่เป็นค่าว่าง")
          .isInt().withMessage("ID ต้องเป็นตัวเลขเท่านั้น")
      ];
    }
    case "gameId": {
      return [
        param("gameId").escape().trim()
          .notEmpty().withMessage("gameId ต้องไม่เป็นค่าว่าง")
          .isInt().withMessage("gameId ต้องเป็นตัวเลขเท่านั้น")
      ];
    }
    case "chitId": {
      return [
        param("chitId").escape().trim()
          .notEmpty().withMessage("chitId ต้องไม่เป็นค่าว่าง")
          .isInt().withMessage("chitId ต้องเป็นตัวเลขเท่านั้น")
      ];
    }
    case "roundId": {
      return [
        param("roundId").escape().trim()
          .notEmpty().withMessage("roundId ต้องไม่เป็นค่าว่าง")
          .isInt().withMessage("roundId ต้องเป็นตัวเลขเท่านั้น")
      ];
    }

    case "date": {
      return [
        body("date").escape().trim()
          .notEmpty().withMessage("วันที่ต้องไม่เป็นค่าว่าง")
          .isDate().withMessage("รูปแบบวันที่ไม่ถูกต้อง")
      ];
    }
    case "affiliate": {
      return [
        body("affiliate").escape().trim()
          .notEmpty().withMessage("ค่าแนะนำต้องไม่เป็นค่าว่าง")
          .isDecimal().withMessage("ค่าแนะนำต้องเป็นตัวเลขเท่านั้น")
      ];
    }
    case "number5": {
      return [
        body("number").escape().trim()
          .notEmpty().withMessage("ต้องระบุเลขที่ต้องการยิง ")
          .isLength({ min: 5, max: 5 }).withMessage("ต้องเป็นตัวเลข 5 หลังเท่านั้น")
      ];
    }
    case "username": {
      return [
        body("username").escape().trim()
          .isLength({ min: 5, max: 20 }).withMessage("ชื่อผู้ใช้งานต้องมีความยาว 5-20 ตัวอักษร ประกอบด้วยภาษาอังกฤษหรือตัวเลข")
          .isAlphanumeric().withMessage("ชื่อผู้ใช้งานต้องประกอบด้วยภาษาอังกฤษหรือตัวเลขเท่านั้น")
      ];
    }
    case "passwordSecurity": {
      return [
        body("password").escape().trim()
          .isLength({ min: 6, max: 30 }).withMessage("รหัสผ่านต้องมีความยาว 8-30 ตัวอักษร")
          .isAlphanumeric().withMessage("รหัสผ่านต้องประกอบด้วยตัวอักษรและตัวเลขเท่านั้น")
          .matches(/^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z]).{8,20}$/, "i").withMessage("รหัสผ่านต้องประกอบด้วย ตัวเล็ก ตัวใหญ่ และตัวเลข")
      ];
    }
    case "password": {
      return [
        body("password").escape().trim()
          .isLength({ min: 6, max: 20 }).withMessage("รหัสผ่านต้องมีความยาว 8-20 ตัวอักษร ประกอบด้วยภาษาอังกฤษหรือตัวเลข")
          .isAlphanumeric().withMessage("รหัสผ่านต้องประกอบด้วยภาษาอังกฤษหรือตัวเลขเท่านั้น")
      ];
    }
    case "newpassword": {
      return [
        body("newpassword").escape().trim()
          .isLength({ min: 8, max: 20 }).withMessage("รหัสผ่านต้องมีความยาว 8-20 ตัวอักษร ประกอบด้วยภาษาอังกฤษหรือตัวเลข")
          .isAlphanumeric().withMessage("รหัสผ่านต้องประกอบด้วยภาษาอังกฤษหรือตัวเลขเท่านั้น")
      ];
    }
    case "changemail": {
      return [
        body("email").escape().trim(),
        body("newemail").escape().trim().isEmail().withMessage("รูปแบบอีเมล์ใหม่ไม่ถูกต้อง")
      ];
    }
    case "mobile": {
      return [
        body("mobile").escape().trim()
          .isInt().withMessage("รูปแบบเบอร์มือถือไม่ถูกต้อง")
          .isLength({ min: 10, max: 10 }).withMessage("เบอร์มือถือต้องมี 10 หลัก เช่น 0931234567")
      ];
    }
    case "otp": {
      return [
        body("otp")
          .isInt().withMessage("รูปแบบ otp ไม่ถูกต้อง หรือตัวเลขไม่ครบ 4 หลัก")
          .isLength({ min: 4, max: 4 }).withMessage("รูปแบบ otp ไม่ถูกต้อง หรือตัวเลขไม่ครบ 4 หลัก")
      ];
    }
    case "birthday": {
      return [
        body("birthday")
          .isDate({ format: 'YYYY-MM-DD' }).withMessage("วันเกิดรูปแบบไม่ถูกต้อง")
          .notEmpty().withMessage("ต้องระบุวันเกิดก่อนทำรายการถัดไป")
      ];
    }
    case "bank": {
      return [
        body("bank_id")
          .isInt().withMessage("รูปแบบธนาคารที่ท่านเลือกไม่ถูกต้อง")
          .notEmpty().withMessage("ต้องระบุธนาคารก่อนทำรายการถัดไป"),
        body("account_name").escape().trim()
          .notEmpty().withMessage("ต้องระบุชื่อบัญชีก่อนลงทะเบียน"),
        body("account_number").escape().trim()
          .isInt().withMessage("เลขที่บัญชีต้องเป็นตัวเลขเท่านั้น และต้องมากกว่า 6 หลัก")
      ];
    }

    case "depositInform": {
      return [
        body("bank_id")
          .isInt().withMessage("รูปแบบธนาคารที่ท่านเลือกไม่ถูกต้อง")
          .notEmpty().withMessage("ต้องระบุธนาคารก่อนทำรายการถัดไป"),
        body("amount").escape().trim()
          .isFloat({ min: 100, max: 9999999 }).withMessage("ยอดเงินที่ต้องการเติมไม่ถูกต้อง")
          .notEmpty().withMessage("ต้องระบุยอดเงินที่ต้องการเติม")
      ];
    }
    case "amount": {
      return [
        body("amount").escape().trim()
          .notEmpty().withMessage("ต้องระบุยอดเงินที่ต้องการ")
          .isFloat({ min: 100, max: 9999999 }).withMessage("ยอดเงินที่ต้องการไม่ถูกต้อง")
      ];
    }

    case "email": {
      return [
        body("email").escape().trim().isEmail().withMessage("รูปแบบอีเมล์ใหม่ไม่ถูกต้อง"),
      ];
    }
    case "forgotEmail": {
      return [
        body("email").escape().trim().isEmail().withMessage("รูปแบบอีเมล์ใหม่ไม่ถูกต้อง"),
        body("email").custom((value, { req }) => {
          return db.User.findOne({ where: { email: value } }).then(user => {
            if (!user) {
              throw ("ไม่พบอีเมล์ในระบบ!");
            } else {
              req.user = user;
            }
          });
        }),
      ];
    }
    case "chkEmail": {
      return [
        body("email").escape().trim().isEmail().withMessage("รูปแบบอีเมล์ใหม่ไม่ถูกต้อง"),
        body("email").custom((value, { req }) => {
          return db.User.findOne({ where: { email: value } }).then(user => {
            if (user) {
              throw ("email ไม่สามารถใช้งานได้ เนื่องจากมีผู้ใช้แล้ว!");
            }
          });
        }),
      ];
    }
    case "chkAdmin": {
      return [
        body("username").custom(value => {
          return db.Admin.findOne({ where: { username: value } }).then(admin => {
            if (admin) {
              throw ("Username ไม่สามารถใช้งานได้ เนื่องจากมีผู้ใช้แล้ว!");
            }
          });
        }),
      ];
    }
    case "chkMobile": {
      return [
        body("mobile").escape().trim()
          .isInt().withMessage("รูปแบบเบอร์มือถือไม่ถูกต้อง")
          .isLength({ min: 10, max: 10 }).withMessage("เบอร์มือถือต้องมี 10 หลัก เช่น 0931234567")
          .custom(value => {
            return db.User.findOne({ where: { mobile: value } }).then(user => {
              if (user) {
                throw ("เบอร์มือถือนี้ ไม่สามารถใช้งานได้ เนื่องจากมีผู้ใช้แล้ว!");
              }
            });
          }),
      ];
    }
    case "hasMobile": {
      return [
        body("mobile").escape().trim()
          .isInt().withMessage("รูปแบบเบอร์มือถือไม่ถูกต้อง")
          .isLength({ min: 10, max: 10 }).withMessage("เบอร์มือถือต้องมี 10 หลัก เช่น 0931234567")
          .custom((value, { req }) => {
            return db.User.findOne({ where: { mobile: value } }).then(user => {
              if (!user) {
                throw ("ไม่พบเบอร์มือถือนี้ในระบบ!");
              } else {
                req.body.user = { id: user.id, name: user.username, login: user.loginAt };
              }
            });
          }),
      ];
    }


    case "userNumberDelete": {
      return [
        param("id").escape().trim()
          .notEmpty().withMessage("ID ต้องไม่เป็นค่าว่าง")
          .isInt().withMessage("ID ต้องเป็นตัวเลขเท่านั้น")
          .custom((value, { req }) => {
            return db.UserNumber.findOne({ where: { id: value }, attributes: ['id', 'user_id', 'name', 'number'] }).then(row => {
              if (!row || row.user_id != req.user.id) {
                throw ("ไม่พบรายการเลขชุดที่ท่านเลือก!");
              } else {
                req.body.row = row;
              }
            });
          }),
      ];
    }

    case "image": {
      return [
        check("image")
          .custom((value, { req }) => {
            if (req.file) {
              if (!req.file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|mp4)$/)) {
                throw ("ไฟล์ประเภท " + req.file.originalname + " ไม่ได้รับอนุญาติให้อัพขึ้นระบบ");
              }
            }
            return true;
          }),
      ];
    }

    case "resume": {
      return [
        check("resume")
          .custom((value, { req }) => {
            if (req.file) {
              if (!req.file.originalname.match(/\.(docx|doc|pdf)$/)) {
                throw ("ไฟล์ " + req.file.originalname + " ไม่ได้รับอนุญาติให้อัพขึ้นระบบ");
              }
            }
            return true;
          }),
      ];
    }
    case "recaptcha": {
      return [
        body("token")
          .custom(async (value, { req }) => {
            if (value == undefined) throw ("ตรวจไม่พบ recaptcha ในการทำรายการ!");
            const axios = require('axios');
            let uri = 'https://www.google.com/recaptcha/api/siteverify?secret=' + process.env.RECAPTCHA_SECRET_KEY + '&response=' + value;
            await axios
              .post(uri).then(function (response) {
                if (response.data.success == false) {
                  throw ("recaptcha ไม่ถูกต้อง!");
                }
              })
            return true;
          }),
      ];
    }





  }
}
const validator = (check) => {
  if (Array.isArray(check)) {
    var ruleArray = [];
    check.forEach(function (val) {
      ruleArray = [...ruleArray, ...rule(val)];
    });
    return ruleArray;
  } else {
    return rule(check);
  }
}

module.exports = validator;
