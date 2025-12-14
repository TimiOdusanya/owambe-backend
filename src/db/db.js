const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { isProduction } = require("../utils/urlConfig");
dotenv.config();

module.exports = async () => {
  const Db = isProduction
    ? process.env.PROD_MONGO_URI
    : process.env.MONGO_URI;

  if (!Db) {
    const envType = isProduction ? "PROD_MONGO_URI" : "MONGO_URI";
    throw new Error(
      `❌ ${envType} is not defined in the environment variables!`
    );
  }

  await mongoose
    .connect(Db)
    .then(() => {
      const envType = isProduction ? "production" : "development";
      console.log(`Successfully connected to ${envType} database`);
    })
    .catch((err) => {
      console.error(
        "ERROR - MONGODB CONNECTION ERROR",
        "connecting to database failed",
        err
      );
    });
};
