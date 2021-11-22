const nodemailer = require("nodemailer");
const { google } = require("googleapis");
const { stringify } = require("query-string");
const https = require("https");
require("dotenv").config();

const contact = async (req, res) => {
    if (!req.body.recaptchaRes) {
        return {
            statusCode: 200,
            body: JSON.stringify(`fail`),
        };
    }

    const query = stringify({
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: req.body.recaptchaRes,
    });

    const verifyURL = `https://google.com/recaptcha/api/siteverify?${query}`;

    //const body = await fetch(verifyURL).then((res) => res.json());
    const body = https.request(verifyURL, (res) => {
        res.json();
    });

    if (body.success === false) {
        return {
            statusCode: 200,
            body: JSON.stringify(`fail`),
        };
    } else {
        const CLIENT_ID = process.env.CLIENT_ID;
        const CLIENT_SECRET = process.env.CLIENT_SECRET;
        const REDIRECT_URI = process.env.REDIRECT_URI;
        const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

        const oAuth2Client = new google.auth.OAuth2(
            CLIENT_ID,
            CLIENT_SECRET,
            REDIRECT_URI
        );

        oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

        const accessToken = await oAuth2Client.getAccessToken();

        const htmlEmail = `
		<h1>Hello!</h1>
		<p><strong>${req.body.name}</strong> is interested. You can reach them at <strong>${req.body.email}</strong>.</p>
		<p><strong>Their message:</strong> ${req.body.message}</p>
		`;

        const mailOptions = {
            from: req.body.email,
            to: "info@fitzgeraldspinesports.com",
            subject: "Client Message",
            html: htmlEmail,
        };

        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                type: "OAuth2",
                user: "dev@webabstract.io",
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: accessToken,
            },
        });

        await new Promise((resolve, reject) => {
            transporter.sendMail(mailOptions, (err, data) => {
                try {
                    resolve();
                    return {
                        statusCode: 200,
                        body: JSON.stringify(`success`),
                    };
                } catch (error) {
                    console.log(error);
                    reject();
                    return {
                        statusCode: 200,
                        body: JSON.stringify("fail"),
                    };
                }
            });
        });
    }

    return {
        statusCode: 200,
        body: JSON.stringify(`success`),
    };
};

module.exports.handler = async (event, context) => {
    return contact({ body: JSON.parse(event.body) });
};
