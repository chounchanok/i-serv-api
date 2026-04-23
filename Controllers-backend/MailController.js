const db = require("../models")
const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op
const nodemailer = require('nodemailer');

const express = require('express');
const cors = require('cors');
const app = express();

async function sendmail (req,res){
    try {
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
            subject: 'Testing Nodemailer I-Serv', // หัวข้ออีเมล
            text: 'This is a test email sent using Nodemailer and Gmail!' // เนื้อหาอีเมล
        };
        
        // ส่งอีเมล
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                res.send({ status: "Error", row: error });
            } else {
                res.send({ status: "Email sent:", row: info.response });
            }
        });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลที่เลือกได้!" });
    }
}
async function send_forgot_email(req, res) {
    function generateRandomString(length = 6) {
        const characters = 'abcdefghijklmnopqrstuvwxyz';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }
    try {
        // ตั้งค่าบัญชี Gmail ของคุณ
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'iservreport@gmail.com', // ใส่ Gmail ของคุณ
                pass: 'udytmueyfzncdtut' // ใส่รหัสผ่าน Gmail ของคุณ หรือใช้ App Password ถ้ามีการเปิดใช้งาน 2-Step Verification
            }
        });
        
        const new_password = generateRandomString();
        var hashed_password = await Bcrypt.hashSync(new_password, 10);

        var data = {
            password: hashed_password,
        };
        const existing = await db.User.findOne({
            where: {
                email: req.body.email
            }
        });
        
        if(existing){
            var row = await db.User.update(data, { where: { email: req.body.email } });
            //console.log(req);
            // สร้างตัวเลือกอีเมล (email options) และใช้ HTML
            const mailOptions = {
                from: 'iservreport@gmail.com', // ใส่ Gmail ของคุณ
                to: req.body.email, // ใส่อีเมลผู้รับ
                subject: 'รีเซ็สรหัสผ่าน I-Serv', // หัวข้ออีเมล
                html: `
                    <html>
                        <body>
                            <table width="100%" align="center" style="border-collapse: collapse; max-width: 544px; margin-right: auto; margin-left: auto; padding: 0; border: 1px solid #e1e4e8;">
                                <tbody>
                                    <tr>
                                        <td style="padding: 24px;">
                                            <center>
                                                <p style="text-align:center; font-size: 24px; font-weight: 600 !important;">
                                                    ระบบทำการรีเซ็ตรหัสผ่านให้คุณเรียบร้อย
                                                </p>
                                                <p style="text-align:center; font-size: 18px; font-weight: 400;">
                                                    รหัสพนักงาน : <u><b>${existing.code}</b></u>
                                                </p>
                                                <p style="text-align:center; font-size: 18px; font-weight: 400;">
                                                    รหัสผ่านใหม่ของคุณ : <u><b>${new_password}</b></u>
                                                </p>
                                                <p style="text-align:center; font-size: 18px; font-weight: 400;">
                                                    กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่ หลังจากที่คุณเข้าสู่ระบบแล้ว กรุณาเปลี่ยนรหัสผ่านใหม่ของคุณทันที
                                                </p>
                                                <p style="text-align:center; font-size: 18px; font-weight: 400;">
                                                    ขอบคุณ<br>
                                                    I-Serv Support Team
                                                </p>
                                            </center>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </body>
                    </html>
                `
            };

            // ส่งอีเมล
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    res.send({ status: "Error", row:"ไม่สามารถส่งเมลได้!" });
                } else {
                    res.send({ status: "Email sent", row: info.response });
                }
            });
        }else{
            res.send({ status: "Error", row: "ไม่อีเมลนี้ในระบบ!" });
        }
        
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลที่เลือกได้!" });
    }
}
module.exports = {
    sendmail,
    send_forgot_email,

}