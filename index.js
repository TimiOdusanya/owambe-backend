const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const db = require("./src/db/db");
const logger = require("./src/lib/log/winston.log");
const httpLogger = require("./src/lib/log/morgan.log");


//routes
const authRoutes = require("./src/modules/user/routes/userAuth.route");
const routes = require('./src/modules/admin/routes');

// Load environment variables first
dotenv.config();

const app = express();
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://owambe-dashboard.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);


// app.use(cors());
app.use(httpLogger);
app.use(helmet());
app.use(cookieParser()); // Fix applied
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({ message: "Hello from server" });
});

console.log("Starting server...");


app.use("/api/v1/auth", authRoutes);
app.use("/api/v1", routes);


const port = process.env.PORT || 8081;

app.listen(port, async () => {
  logger.info(`App running on port ${port}.....`);
  try {
    await db(); // Ensure database connection
  } catch (error) {
    console.error("Database connection failed. Exiting...");
    process.exit(1);
  }
});

// Handle uncaught exceptions and rejections
process.on("uncaughtException", (err) => {
  console.error("There was an uncaught error", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
});
