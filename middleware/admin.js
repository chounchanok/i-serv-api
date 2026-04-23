const db = require('../models');
const jwt = require('jsonwebtoken');
const crypt = require('../utilities/crypt');

const isProduction = process.env.APP_PRODUCTION === 'true';

const authenticateJWT = async (req, res, next) => {
  const accessToken = req.cookies._accessToken;
  const refreshToken = req.cookies._refreshToken;

  const token = accessToken ? crypt.decryptWithAES(accessToken) : null;
  const decryptRefreshToken = refreshToken ? crypt.decryptWithAES(refreshToken) : null;

  if (accessToken && refreshToken) {
    let user = null;
    try {
      user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      if (user) {
        // ถ้ามี ACCESS TOKEN แล้วเช็คว่า REFRESH TOKEN ยังใช้งานได้อยู่ไหม
        // หากใช้งานได้อยู่ก็จะทำงานได้ต่อไป แต่ถ้าทำงานไม่ได้ ก็ต้องหลุดออกจากระบบ
        const result = checkRefreshToken(decryptRefreshToken, user);
        if (result.error) {
          // โยนเข้า Catch
          throw result;
        }
      }
      const foundItem = await db.Login.findOne({ where: { mode: 'admin', user_id: user.id } });
      if (foundItem) {
        if (foundItem.token != user.token) {
          setUpCookie(res);
          return res.status(401).send({
            message: 'ออกจากระบบ เนื่องจากมีล็อคอินซ้อน!',
          });
        }
      } else {
        setUpCookie(res);
        return res.status(401).send({
          message: 'ออกจากระบบ เนื่องจากสถานะการล็อคอินหลุด!',
        });
      }

      req.user = user;
    } catch (err) {
      let newToken;
      let isUnauthorized = false;
      // เช็คว่าเป็น error จากการหมดอายุไหม ถ้าใช่ให้สร้าง token ใหม่โดยเอา refresh token มาเช็ค
      if (err.name === 'TokenExpiredError') {
        newToken = await reGenerateAccessToken(decryptRefreshToken, res);
        if (!newToken) {
          isUnauthorized = true;
        }
      } else {
        isUnauthorized = true;
      }
      // ถ้าสร้างไม่ผ่านหรือผิดพลาด ก็หลุดออกจากระบบทันที
      if (isUnauthorized) {
        // set expires cookie
        setUpCookie(res);
        return res.status(401).send({
          message: 'Unauthorized!asdasd',
        });
      } else {
        // console.log('newToken : ', newToken);
        let result = setUpCookie(res, newToken);
        user = jwt.verify(newToken, process.env.ACCESS_TOKEN_SECRET);
        req.user = user;
        if (result.error) {
          return res.status(401).send({
            message: 'Unauthorized!1 ' + result.message,
          });
        }
      }
    }
    next();
  } else if (!accessToken && refreshToken) {
    // ถ้า cookie token หมดอายุให้สร้าง cookie token ใหม่
    let accessToken = await reGenerateAccessToken(decryptRefreshToken, res);

    if (!accessToken) {
      // set expires cookie
      setUpCookie(res);
      return res.status(401).send({ message: 'Unauthorized!2' });
    }
    let result = setUpCookie(res, accessToken);
    if (result.error) {
      return res.status(401).send({ message: 'Unauthorized!3 ' + result.message });
    }
    req.user = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    next();
  } else {
    return res.status(401).send({ message: 'Unauthorized!4' });
  }
};

const getIdentifier = req => {
  let response = {
    error: false,
    message: 'Success',
    user: null,
  };
  const accessToken = req.cookies._accessToken;
  const token = accessToken ? crypt.decryptWithAES(accessToken) : null;
  let user = null;
  try {
    user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    response.user = user;
  } catch (err) {
    response.error = true;
    response.message = err.message;
  }

  return response;
};

const checkRefreshToken = (refreshToken, userAccess) => {
  try {
    let userRefresh = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // ถ้า ID ไม่ตรงกันแปลว่าผิดปรกติ
    // @ts-ignore
    if (userRefresh && userAccess && userRefresh.id !== userAccess.id) {
      let err = {
        name: 'Unauthorized6! ',
        error: true,
      };
      throw err;
    }

    return {
      name: 'Success',
      user: userRefresh,
      error: false,
    };
  } catch (err) {
    return {
      name: err.name,
      error: true,
    };
  }
};

const reGenerateAccessToken = async (decryptRefreshToken, res) => {
  let decode;
  try {
    decode = jwt.verify(decryptRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    if (decode) {

      const foundItem = await db.Login.findOne({ where: { mode: 'admin', user_id: decode.id } });
      if (foundItem) {
        if (foundItem.token != decode.token) {
          setUpCookie(res);
          return res.status(401).send({
            message: 'ออกจากระบบ เนื่องจากมีล็อคอินซ้อน!',
          });
        }
      } else {
        setUpCookie(res);
        return res.status(401).send({
          message: 'ออกจากระบบ เนื่องจากสถานะการล็อคอินหลุด!',
        });
      }

      // @ts-ignore
      let payload = await db.Admin.scope("withPublic").findByPk(decode.id);
      let accessToken = null
      if (payload) {
        await db.Admin.update({ refreshAt: Date() }, { where: { id: decode.id } });
        accessToken = jwt.sign(payload.toJSON(), process.env.ACCESS_TOKEN_SECRET, {
          algorithm: 'HS256',
          //expiresIn: process.env.ACCESS_TOKEN_EXPIRES + sTime, // jwt มีอายุ 30 นาที
          expiresIn: process.env.ACCESS_TOKEN_EXPIRES + 's', // jwt มีอายุ x นาที
        })
      }
      return accessToken;
    }
    return null;
  } catch (err) {
    return null;
  }
};

const setUpCookie = (res, accessToken = null, user = null) => {
  const sDate = new Date();
  try {
    if (accessToken && !user) {
      const encryptToken = crypt.encryptWithAES(accessToken);

      res.cookie('_accessToken', encryptToken, {
        httpOnly: true, // ปิดการเข้าถึงจาก client
        sameSite: true, // ใช้ได้ในกรณีจากโดเมนเดียวกัน
        secure: isProduction, // ใช้กับ https เท่านั้น (ถ้าเป็นโหมด Develop ให้เป็น false)
        // @ts-ignore
        expires: new Date(sDate.getTime() + (process.env.ACCESS_TOKEN_COOKIE * 1000)), // cookie มีอายุ x นาที
      });
    } else if (user) {
      // Reset Assign Token
      const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        algorithm: 'HS256',
        //expiresIn: process.env.ACCESS_TOKEN_EXPIRES, // jwt มีอายุ x นาที
        expiresIn: process.env.ACCESS_TOKEN_EXPIRES + 's', // jwt มีอายุ x นาที
      });

      // REFRESH TOKEN
      const REFRESH_TOKEN = process.env.REFRESH_TOKEN_SECRET;

      const refreshToken = jwt.sign(user, REFRESH_TOKEN, {
        algorithm: 'HS256',
        //expiresIn: process.env.REFRESH_TOKEN_EXPIRES, // refresh token มีอายุ x ชั่วโมง
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES + 's', // jwt มีอายุ x นาที
      });

      const encryptToken = crypt.encryptWithAES(accessToken);

      res.cookie('_accessToken', encryptToken, {
        httpOnly: true, // ปิดการเข้าถึงจาก client
        sameSite: true, // ใช้ได้ในกรณีจากโดเมนเดียวกัน
        secure: isProduction, // ใช้กับ https เท่านั้น (ถ้าเป็นโหมด Develop ให้เป็น false)
        // @ts-ignore
        expires: new Date(sDate.getTime() + (process.env.ACCESS_TOKEN_COOKIE * 1000)), // cookie มีอายุ x นาที
      });

      const encryptRefreshToken = crypt.encryptWithAES(refreshToken);
      res.cookie('_refreshToken', encryptRefreshToken, {
        httpOnly: true, // ปิดการเข้าถึงจาก client
        sameSite: true, // ใช้ได้ในกรณีจากโดเมนเดียวกัน
        secure: isProduction, // ใช้กับ https เท่านั้น (ถ้าเป็นโหมด Develop ให้เป็น false)
        // @ts-ignore
        expires: new Date(sDate.getTime() + (process.env.REFRESH_TOKEN_COOKIE * 1000)), // cookie มีอายุ x นาที
      });
    } else {
      // ถ้าไม่มีการ set อะไรมาแปลว่าต้องหลุดออกจากระบบ
      res.cookie('_accessToken', null, { expires: new Date(Date.now()) });
      res.cookie('_refreshToken', null, { expires: new Date(Date.now()) });
    }
    return {
      error: false,
      message: 'Success',
    };
  } catch (err) {
    return {
      error: true,
      message: err,
    };
  }
};

const azureJWT = async (req, res, next) => {
  const accessToken = req.cookies._accessToken;
  const token = accessToken ? crypt.decryptWithAES(accessToken) : null;

  if (accessToken) {
    let user = null;
    user = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    if (user) {
      return res.send({
        status: "success",
        user: user,
        token: user.token,
        message: "เข้าระบบเรียบร้อย"
      });
    }
    next();
  } else if (req.body.username) {
    next();
  } else {
    return res.status(401).send({ status: "error", message: "ไม่สามารถเข้าระบบได้" })
  }
};

const isAdmin = async (req, res, next) => {
  if (req.user.role == 'Admin') {
    next();
  } else {
    return res.status(401).send({
      message: 'ท่านไม่มีสิทธิ์ใช้งานส่วนนี้!',
    });
  }
};


module.exports = {
  isAdmin,
  azureJWT,
  authenticateJWT,
  setUpCookie,
  getIdentifier,
};