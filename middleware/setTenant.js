const jwt = require('jsonwebtoken');
const crypt = require('../utilities/crypt');
const tenantStorage = require('../config/tenantContext');
const db = require('../models');

const setTenant = async (req, res, next) => {
    // 🌟 1. ดักการ Login: ถ้าเป็น path login ให้บังคับใช้ Main DB เสมอ
    if (req.path === '/auth/login' || req.path === '/auth/login/') {
        console.log(`[API CALL] Path: ${req.path} | Target DB: main (Forced for Login)`);
        return tenantStorage.run('main', () => {
            next();
        });
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

            if (decoded) {
                groupId = decoded?.group_customer_id || decoded?.user?.group_customer_id;
            } else {
                const UserModel = db.User || db.users; 
                if (UserModel) {
                    const user = await UserModel.findOne({
                        where: { token: tokenRaw },
                        attributes: ['group_customer_id'] 
                    });
                    if (user) {
                        groupId = user.group_customer_id;
                    }
                }
            }

            if (groupId === 10 || groupId === '10') {
                tenant = 'mj';
            }
        }
    } catch (error) {
        console.log('SetTenant Error:', error.message);
    }

    console.log(`[API CALL] Path: ${req.path} | Target DB: ${tenant}`);

    tenantStorage.run(tenant, () => {
        next();
    });
};

module.exports = setTenant;