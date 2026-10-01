const { AsyncLocalStorage } = require('async_hooks');

// สร้าง Store สำหรับจดจำ Context ของแต่ละ Request ที่เข้ามา
const tenantStorage = new AsyncLocalStorage();

module.exports = tenantStorage;