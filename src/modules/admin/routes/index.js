const express = require("express");
const router = express.Router();


const eventRoutes = require("./eventRoutes");
const foodRoutes = require("./foodRoutes");
const drinkRoutes = require("./drinkRoutes");
const orderRoutes = require("./orderRoutes");
const guestRoutes = require("./guestRoutes");
const mediaRoutes = require("./mediaRoutes");
const giftRoutes = require("./giftRoutes");


router.use("/events", eventRoutes);
router.use("/food", foodRoutes);
router.use("/drinks", drinkRoutes);
router.use("/orders", orderRoutes); 
router.use("/guests", guestRoutes);
router.use("/media", mediaRoutes);
router.use("/gifts", giftRoutes);

module.exports = router;
