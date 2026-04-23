const db = require("../models");
const { validation, getPagingData, getPagination } = require("../utilities/function");
const Bcrypt = require("bcrypt");
const Op = db.Sequelize.Op;

const ExcelJS = require('exceljs');

// ฟังก์ชันสำหรับ Export Excel
async function exportExcel(req, res) {
    try {
        // ดึงข้อมูลจาก database (ระบุฟิลด์ที่ต้องการ) ใช้ Sequelize ในการดึงข้อมูล
        const users = await db.User.findAll({
            attributes: ['id', 'name', 'email', 'createdAt'],
        });

        // สร้าง Workbook และ Worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Users Data');

        // สร้างหัวตาราง (header)
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Created At', key: 'createdAt', width: 20 }
        ];

        // เพิ่มข้อมูลลงใน Worksheet
        users.forEach(user => {
            worksheet.addRow({
                id: user.id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt ? user.createdAt.toISOString().split('T')[0] : ''
            });
        });

        // ตั้งค่าการตอบกลับเป็น Excel ไฟล์
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=' + 'users-data.xlsx'
        );

        // เขียนข้อมูลลงใน stream และส่งกลับไปยังผู้ใช้
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error exporting Excel:', error);
        res.status(500).send('Error exporting Excel');
    }
}

module.exports = {
    exportExcel,
};