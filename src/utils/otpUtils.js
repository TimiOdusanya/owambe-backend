// const nodemailer = require("nodemailer");

// // Generate a 6-digit OTP
// exports.generateOTP = () => {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// };

// // Send OTP to email
// exports.sendOTPEmail = async (email, otp) => {
//   const transporter = nodemailer.createTransport({
//     service: "gmail",
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS,
//     },
//   });

//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: email,
//     subject: "OTP for Owambe FRD",
//     text: `Your OTP is ${otp}`,
//   };

//   await transporter.sendMail(mailOptions);
// };


const speakeasy = require("speakeasy");
const qrCode = require("qr-image");
const sgMail = require("@sendgrid/mail");
const Mailjet = require("node-mailjet");
const mailjet = Mailjet.apiConnect(
  process.env.MAILJET_API_KEY,
  process.env.MAILJET_API_SECRET
);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const { renderEmailTemplate } = require("../../src/utils/templateRenderer"); 

// Generate a 6-digit OTP
exports.generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP to email using SendGrid
// exports.sendOTPEmail = async (email, otp) => {
//   const msg = {
//     to: email,
//     from: "owambe.erp@gmail.com",
//     subject: "OTP for Owambe ERP",
//     text: `Your OTP is ${otp}`,
//     html: `<strong>Your OTP is ${otp}</strong>`, // Optional: Add HTML content
//   };

//   try {
//     await sgMail.send(msg);
//     console.log("Email sent successfully");
//   } catch (error) {
//     console.error("Error sending email:", error);
//     throw new Error("Failed to send email");
//   }
// };

// Send email using Mailjet
exports.sendEmail = async (email, templateName, data) => {
  const htmlTemplate = renderEmailTemplate(templateName, data);

  const request = mailjet.post("send", { version: "v3.1" }).request({
    Messages: [
      {
        From: {
          Email: "owambe.erp@gmail.com", // Replace with your verified sender email
          Name: "Owambe ERP",
        },
        To: [
          {
            Email: email,
            Name: "User",
          },
        ],
        Subject: data.subject,
        TextPart: data.text || data.body,
        HTMLPart: htmlTemplate,
      },
    ],
  });

  try {
    const response = await request;
    console.log("Email sent successfully:", response.body);
  } catch (error) {
    console.error("Error sending email:", error.statusCode, error.message);
    throw new Error("Failed to send email");
  }
};


// Generate a secret key for 2FA
exports.generate2FASecret = () => {
  return speakeasy.generateSecret({ name: "Owambe FRD" });
};

// Generate a QR code for the secret key
exports.generateQRCode = (secret) => {
  return qrCode.imageSync(secret.otpauth_url, { type: "png" });
};

// Verify the 2FA code
exports.verify2FACode = (secret, token) => {
  return speakeasy.totp.verify({
    secret: secret.base32,
    encoding: "base32",
    token: token,
  });
};