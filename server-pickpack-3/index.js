require('dotenv').config({ path: '.env.env' })
const express = require('express');
const session = require('express-session')
const cookieParser = require('cookie-parser');
const rateLimit = require("express-rate-limit");
const fileUpload = require('express-fileupload');
const cors = require('cors');

const app = express();

app.use(cors())

app.use('/avatars', express.static(__dirname + '/avatars'));
app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
    //cookie: { secure: true }
}))
app.use(fileUpload({
    createParentPath: true
}));

// แปลงรูปแบบข้อมูลจาก request ที่ส่งมาให้อยู่ในรูปแบบ json
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// ปิดการ caching ของระบบกับ browser กับ server
app.disable('etag');
app.disable('x-powered-by');


const backenRouter = require('./routes/backend');
// const frontendRouter = require('./routes/frontend');

app.get('/', (req, res) => {

    console.log(req);

    res.send('Hello World!');
});

// app.use('/api', frontendRouter);
app.use('/api/backend', backenRouter);


// ส่วนจัดการ error
app.use(function (err, req, res, next) {
    console.error(err.stack)
    console.error(err.message)
    console.error(err.status)
    res.status(500).send('Something broke!')
})

app.listen(process.env.NODE_PORT || 3003, process.env.NODE_HOST || '0.0.0.0', () => {
    console.log(`Server running at http://${process.env.NODE_HOST}:${process.env.NODE_PORT}/`);
});