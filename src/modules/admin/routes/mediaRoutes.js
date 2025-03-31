const express = require("express");
const router = express.Router();
const mediaController = require("../controllers/mediaController");
const { authenticate } = require("../../../middleware/authMiddleware");

router.post("/:eventId", authenticate, mediaController.createMedia);
router.post("/bulk/:eventId", authenticate, mediaController.createMultipleMedia);
router.get("/:eventId/:mediaId", authenticate, mediaController.getMedia);
router.get("/:eventId", authenticate, mediaController.getAllMedia);
router.patch("/:eventId/:mediaId", authenticate, mediaController.updateMedia);
router.delete("/:eventId/:mediaId", authenticate, mediaController.deleteMedia);
router.delete("/:eventId", authenticate, mediaController.deleteMultipleMedia);

module.exports = router;
