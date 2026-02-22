const express = require("express");
const router = express.Router();
const guestMediaController = require("../controllers/guestMedia.controller");

router.get("/:eventId", guestMediaController.listMedia);
router.get("/:eventId/:mediaId", guestMediaController.getMedia);

module.exports = router;
