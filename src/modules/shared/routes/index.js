const express = require("express");
const router = express.Router();

const inviteRoute = require("./inviteRoutes");
const guestOrderRoute = require("./guestOrder.route");
const qrCodeRoute = require("./qrCode.route");

router.use("/invite", inviteRoute);
router.use("/guest-order", guestOrderRoute);
router.use("/qr-code", qrCodeRoute);

module.exports = router;
