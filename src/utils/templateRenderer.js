// utils/templateRenderer.js
const ejs = require("ejs");
const path = require("path");
const fs = require("fs");

// Load template files
const headerTemplate = fs.readFileSync(
  path.join(__dirname, "../../templates/header.ejs"),
  "utf8"
);
const footerTemplate = fs.readFileSync(
  path.join(__dirname, "../../templates/footer.ejs"),
  "utf8"
);

// Render the full email template
exports.renderEmailTemplate = (templateName, data) => {
  // Load the specific template
  const emailTemplate = fs.readFileSync(
    path.join(__dirname, `../../templates/${templateName}.ejs`),
    "utf8"
  );

  const header = ejs.render(headerTemplate);
  const footer = ejs.render(footerTemplate);
  const body = ejs.render(emailTemplate, data);

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title><%= subject %></title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f4f4f4;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #ffffff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          padding-bottom: 20px;
          border-bottom: 1px solid #eeeeee;
        }
        .header img {
          max-width: 150px;
        }
        .content {
          padding: 20px 0;
        }
        .otp {
          font-size: 24px;
          font-weight: bold;
          color: #007bff;
          text-align: center;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          padding-top: 20px;
          border-top: 1px solid #eeeeee;
          font-size: 12px;
          color: #777777;
        }
      </style>
    </head>
    <body>
      <div class="container">
        ${header}
        ${body}
        ${footer}
      </div>
    </body>
    </html>
  `;
};
