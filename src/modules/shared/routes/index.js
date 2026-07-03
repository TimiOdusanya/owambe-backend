const express = require("express");
const router = express.Router();

const inviteRoute = require("./inviteRoutes");
const guestOrderRoute = require("./guestOrder.route");
const qrCodeRoute = require("./qrCode.route");
const guestMediaRoutes = require("./guestMedia.routes");
const guestWishlistRoutes = require("./guestWishlist.routes");

router.use("/qr-code", qrCodeRoute);
router.use("/invite", inviteRoute);
router.use("/guest-order", guestOrderRoute);
router.use("/guest-media", guestMediaRoutes);
router.use("/guest-wishlist", guestWishlistRoutes);

module.exports = router;
