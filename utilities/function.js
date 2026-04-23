const { validationResult } = require("express-validator");

const validation = (req, body) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return {
      status: "error",
      errors: errors.array().map(err => { delete err.location; delete err.value; return err })
    };
  }
  if (body && body.length) {
    for (var key in req.body) {
      if (body.includes(key) == false) {
        delete req.body[key];
      }
    }
    if (Object.keys(req.body).length == 0) {
      return {
        status: "error",
        errors: [{ status: "error", msg: "ข้อมูลที่ส่งมาทำรายการไม่ถูกต้อง" }]
      }
    }
  }
}

const getPagingData = (data, page, limit) => {
  const { count: total, rows: rows } = data;
  const currentPage = page ? +page : 0;
  const totalPages = Math.ceil(total / limit);
  return { total, rows, totalPages, currentPage };
};

const getPagination = (page, size) => {
  const limit = size ? +size : 3;
  const offset = page ? (page - 1) * limit : 0;
  return { limit, offset };
};


module.exports = {
  validation,
  getPagingData,
  getPagination
}
