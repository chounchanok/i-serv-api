// server/sendSMS.js
const twilio = require('twilio');

// ตั้งค่าข้อมูลรับรอง Twilio (ใส่ Account SID และ Auth Token ของคุณ)
const accountSid = 'ACe7c44590496bde2caac61ff95b19abd4';
const authToken = '942664b4efc899354cb88f42f7254527';
const client = new twilio(accountSid, authToken);


exports.sendSMS = function (to, message) {
  return client.messages.create({
    body: message,          // เนื้อหาข้อความ
    to: to,                 // หมายเลขโทรศัพท์ผู้รับ (ในรูปแบบ +66 สำหรับประเทศไทย)
    from: '+66988318291' // หมายเลขโทรศัพท์ที่คุณใช้ส่ง
  });
};