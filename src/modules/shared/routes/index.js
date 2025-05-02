const express = require("express");
const router = express.Router();


const inviteRoute = require("./inviteRoutes");


router.use("/invite", inviteRoute);

module.exports = router;
