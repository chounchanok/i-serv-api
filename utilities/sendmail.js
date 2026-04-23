const ejs = require('ejs');
const nodemailer = require('nodemailer');
const Email = require('email-templates');
const db = require("../models");

async function sendSMTP(to, subject, html, text) {
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: 'email-smtp.' + process.env.AWS_SES_REGION + '.amazonaws.com',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.AWS_SES_ACCESS_KEY,
            pass: process.env.AWS_SES_SECRET_KEY,
        }
    });

    let mailOptions = {
        from: '"No-Reply" <admin@kbtginspire.com>', // sender address
        to: to, // list of receivers
        subject: subject, // Mail subject
        text: text, // plain text body
        html: html // HTML body
    };

    // let info = await transporter.sendMail(mailOptions, function (err, info) {
    //     if (err) {
    //         console.log(err)
    //     } else {
    //         console.log(info);
    //         console.log("Message sent: %s", info.messageId);
    //         console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    //     }
    // });
    let info = await transporter.sendMail(mailOptions);
    return info;
}

async function sendEmail(key, to, body) {

    const email = new Email({
        // message: {
        //   from: 'niftylettuce@gmail.com',
        // },
        render: (key, to, body) => {
            return new Promise((resolve, reject) => {
                // this example assumes that `template` returned
                // is an ejs-based template string
                // view = `${template}/html` or `${template}/subject` or `${template}/text`

                db.EmailTemplate.findOne({ where: { key: key } })
                    .then(async template => {
                        if (!template) return reject(new Error('Template not found'));
                        //let html = ejs.render(template.body, { title: "I just code IT [Youtube Channel]", detail: "Hello EJS module from I just code IT." });
                        let html = ejs.render(template.body, body);
                        html = await email.juiceResources(html);
                        console.log(html);
                        let mail = sendSMTP(to, template.subject, html, null);
                        resolve(mail);
                    })
                    .catch(err => {
                        if (err) return reject(err);
                    });
            });
        }
    });
    email
        .render(key, to, body)
        .then(console.log)
        .catch(console.error);
}
module.exports = sendEmail