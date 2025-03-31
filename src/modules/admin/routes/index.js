const express = require("express");
const router = express.Router();


const eventRoutes = require("./eventRoutes");
const foodRoutes = require("./foodRoutes");
const drinkRoutes = require("./drinkRoutes");
const orderRoutes = require("./orderRoutes");
const guestRoutes = require("./guestRoutes");
const mediaRoutes = require("./mediaRoutes");
const giftRoutes = require("./giftRoutes");
const uploadRoutes = require("./uploadMedia");


router.use("/events", eventRoutes);
router.use("/food", foodRoutes);
router.use("/drinks", drinkRoutes);
router.use("/orders", orderRoutes); 
router.use("/guests", guestRoutes);
router.use("/media", mediaRoutes);
router.use("/gifts", giftRoutes);
router.use("/upload-media", uploadRoutes);

module.exports = router;
