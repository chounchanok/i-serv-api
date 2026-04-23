const nodemailer = require('nodemailer');

// ตั้งค่าบัญชี Gmail ของคุณ
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'iservreport@gmail.com', // ใส่ Gmail ของคุณ
    pass: 'udytmueyfzncdtut' // ใส่รหัสผ่าน Gmail ของคุณ หรือใช้ App Password ถ้ามีการเปิดใช้งาน 2-Step Verification
  }
});

// สร้างตัวเลือกอีเมล (email options)
const mailOptions = {
  from: 'iservreport@gmail.com', // ใส่ Gmail ของคุณ
  to: 'iservreport@gmail.com', // ใส่อีเมลผู้รับ
  subject: 'Testing Nodemailer', // หัวข้ออีเมล
  text: 'This is a test email sent using Nodemailer and Gmail!' // เนื้อหาอีเมล
};

// ส่งอีเมล
transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.log('Error: ' + error);
  } else {
    console.log('Email sent: ' + info.response);
  }
});