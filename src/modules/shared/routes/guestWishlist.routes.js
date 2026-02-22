const express = require("express");
const router = express.Router();
const guestWishlistController = require("../controllers/guestWishlist.controller");

router.get("/:eventId", guestWishlistController.listWishlist);

module.exports = router;
