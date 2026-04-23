require('dotenv').config({ path: '.env.env' })
const express = require('express');
const session = require('express-session')
const cookieParser = require('cookie-parser');
const rateLimit = require("express-rate-limit");
const fileUpload = require('express-fileupload');
const cors = require('cors');

const app = express();
const path = require('path');

app.use(cors({
    origin: 'http://localhost:5173', // ระบุ URL ของฝั่ง Frontend
    credentials: true // อนุญาตให้รับ Cookie (สำคัญมาก)
}));
app.use(express.json({ limit: '1000mb' }));
app.use(express.urlencoded({ limit: '1000mb', extended: true }));
  
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/images/picture', express.static(path.join(__dirname, 'images/picture')));

// test commit git
app.use('/avatars', express.static(__dirname + '/avatars'));
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
}))
app.use(fileUpload({
    createParentPath: true
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
    windowMs: 1 * 60 * 100000, // 1 minutes
    max: 1000 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// ปิดการ caching ของระบบกับ browser กับ server
app.disable('etag');
app.disable('x-powered-by');


const backenRouter = require('./routes/backend');

app.get('/', (req, res) => {

    console.log(req);

    res.send('Hello World!');
});

app.use('/api/backend', backenRouter);

app.use(function (err, req, res, next) {
    console.error(err.stack)
    console.error(err.message)
    console.error(err.status)
    res.status(500).json({
	    message: err.stack,
	    error: err.message, // ส่งข้อความของ error กลับไป (อาจจะปิดใน Production)
	    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined // ส่ง stack trace ถ้าอยู่ในโหมด development
	});
})

app.get('/view-images', (req, res) => {
    // ดึงรายชื่อไฟล์จาก URL query string
    const filesQuery = req.query.files;

    if (!filesQuery) {
        return res.status(400).send('<h1>ไม่พบข้อมูลรูปภาพ</h1>');
    }

    // แยกชื่อไฟล์ออกจากกันด้วย ','
    const filenames = filesQuery.split(',');

    // URL พื้นฐานที่เก็บรูปภาพ (ต้องตรงกับ imageBaseUrl ในโค้ดสร้าง Excel)
    const imageBaseUrl = 'https://api-test.iservreport.com/';

    // สร้าง HTML เพื่อแสดงรูปภาพทั้งหมด
    let imagesHtml = filenames.map(filename => {
        // สร้าง <img> tag สำหรับแต่ละรูป
        return `<img src="${imageBaseUrl}${filename.trim()}" alt="${filename}" style="max-width: 400px; margin: 10px; border: 1px solid #ccc; border-radius: 5px;">`;
    }).join('');

    // สร้างหน้า HTML ทั้งหมด
    const pageHtml = `
        <!DOCTYPE html>
        <html lang="th">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>แกลเลอรีรูปภาพ</title>
            <style>
                body { font-family: sans-serif; text-align: center; }
                h1 { margin-top: 20px; }
                div.gallery { display: flex; flex-wrap: wrap; justify-content: center; padding: 20px; }
            </style>
        </head>
        <body>
            <h1>รูปภาพทั้งหมด</h1>
            <div class="gallery">
                ${imagesHtml}
            </div>
        </body>
        </html>
    `;

    res.send(pageHtml);
});

app.listen(process.env.NODE_PORT || 3003, process.env.NODE_HOST || '0.0.0.0', () => {
    console.log(`Server running at http://${process.env.NODE_HOST}:${process.env.NODE_PORT}/`);
});