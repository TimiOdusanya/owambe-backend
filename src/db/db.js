const mongoose = require("mongoose");
const dotenv = require("dotenv");
// const { currentEnv } = require('../utils/envHandler')
dotenv.config();

module.exports = async () => {
  const Db = process.env.MONGO_URI;
  // currentEnv() === 'production'
  //     ? process.env.REMOTE_DATABASE
  //     : process.env.LOCAL_DATABASE
  if (!Db) {
    throw new Error(
      "❌ MONGO_URI is not defined in the environment variables!"
    );
  }
  await mongoose
    .connect(Db)
    .then(() => {
      console.log("Successfully connected to database");
    })
    .catch((err) => {
      console.error(
        "ERROR - MONGODB CONNECTION ERROR",
        "connecting to database failed",
        err
      );
    });
};
