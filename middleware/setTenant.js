const jwt = require('jsonwebtoken');
const crypt = require('../utilities/crypt');
const tenantStorage = require('../config/tenantContext');
const db = require('../models');

const setTenant = async (req, res, next) => {
    // 1. ถ้าเป็นการ Login บังคับใช้ Main เสมอ
    if (req.path === '/auth/login' || req.path === '/auth/login/') {
        return tenantStorage.run('main', () => next());
    }

    let tenant = 'main'; // ค่าเริ่มต้น

    try {
        const cookieToken = req.cookies?.accessToken || req.cookies?._accessToken;
        let headerToken = null;
        
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            headerToken = req.headers.authorization.split(' ')[1];
        }

        let tokenRaw = null;
        if (cookieToken) {
            tokenRaw = crypt.decryptWithAES(cookieToken);
        } else if (headerToken) {
            tokenRaw = headerToken;
        }

        if (tokenRaw) {
            const decoded = jwt.decode(tokenRaw); 
            let groupId = null;

            // เช็คว่าถอดรหัส JWT ได้ปกติหรือไม่
            if (decoded && typeof decoded === 'object') {
                groupId = decoded.group_customer_id || decoded.user?.group_customer_id;
            } else {
                // 🌟 [จุดที่แก้ไข] กรณี Token เป็น String ธรรมดา 
                // ต้องค้นหาจากทั้ง 2 ฐานข้อมูล เพื่อแก้ปัญหาไก่กับไข่
                const UserModel = db.User || db.users; 
                
                if (UserModel) {
                    // ค้นหาใน Main ก่อน
                    let user = await new Promise((resolve) => {
                        tenantStorage.run('main', async () => {
                            resolve(await UserModel.findOne({ where: { token: tokenRaw }, attributes: ['group_customer_id'] }));
                        });
                    });

                    // ❗️ ถ้าหาใน Main ไม่เจอ ให้สลับไปค้นหาใน MJ ❗️
                    if (!user) {
                        user = await new Promise((resolve) => {
                            tenantStorage.run('mj', async () => {
                                resolve(await UserModel.findOne({ where: { token: tokenRaw }, attributes: ['group_customer_id'] }));
                            });
                        });
                    }

                    if (user) {
                        groupId = user.group_customer_id;
                    }
                }
            }

            // ถ้าตรวจสอบแล้วรหัสตรงกับ 10 ก็ให้สับรางไป MJ
            if (groupId === 10 || groupId === '10') {
                tenant = 'mj';
            }
        }
    } catch (error) {
        console.log('SetTenant Error:', error.message);
    }

    // console.log(`[API CALL] Path: ${req.path} | Target DB: ${tenant}`);

    // ส่งต่อ Request ให้อยู่ใน Context ของฐานข้อมูลที่ถูกต้อง
    tenantStorage.run(tenant, () => {
        next();
    });
};

module.exports = setTenant;