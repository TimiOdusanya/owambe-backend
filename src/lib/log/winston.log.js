const { createLogger, transports, format } = require('winston')
const chalk = require('chalk')

const logger = createLogger({
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
        format.printf(
            (info) =>
                `${chalk.green(info.timestamp)} ${info.level}: ${chalk.blue(
                    info.message
                )}`
        )
    ),
    transports: [
        new transports.File({
            filename: './logs/all-logs.log',
            json: false,
            maxsize: 5242880,
            maxFiles: 5,
        }),
        new transports.Console(),
    ],
})

module.exports = logger



// const { createLogger, transports, format } = require("winston");

// async function createLoggerInstance() {
//   const chalk = (await import("chalk")).default;

//   return createLogger({
//     format: format.combine(
//       format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
//       format.printf(
//         (info) =>
//           `${chalk.green(info.timestamp)} ${info.level}: ${chalk.blue(
//             info.message
//           )}`
//       )
//     ),
//     transports: [
//       new transports.File({
//         filename: "./logs/all-logs.log",
//         json: false,
//         maxsize: 5242880,
//         maxFiles: 5,
//       }),
//       new transports.Console(),
//     ],
//   });
// }

// const logger = createLoggerInstance();

// module.exports = logger;
