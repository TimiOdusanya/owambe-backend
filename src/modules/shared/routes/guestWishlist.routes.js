const express = require("express");
const router = express.Router();
const guestWishlistController = require("../controllers/guestWishlist.controller");

router.get("/:eventId/:wishlistId", guestWishlistController.getWishlist);
router.get("/:eventId", guestWishlistController.listWishlist);

module.exports = router;
