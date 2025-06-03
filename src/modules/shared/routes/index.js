const express = require("express");
const router = express.Router();

const inviteRoute = require("./inviteRoutes");
const guestOrderRoute = require("./guestOrder.route");

router.use("/invite", inviteRoute);
router.use("/guest-order", guestOrderRoute);

module.exports = router;
