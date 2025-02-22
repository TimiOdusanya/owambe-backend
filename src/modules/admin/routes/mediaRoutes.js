const express = require("express");
const router = express.Router();
const mediaController = require("../controllers/mediaController");
const { authenticate } = require("../../../middleware/authMiddleware");

router.post("/:eventId", authenticate, mediaController.createMedia);
router.get("/:eventId/:mediaId", authenticate, mediaController.getMedia);
router.get("/:eventId", authenticate, mediaController.getAllMedia);
router.put("/:eventId/:mediaId", authenticate, mediaController.updateMedia);
router.delete("/:eventId/:mediaId", authenticate, mediaController.deleteMedia);
router.delete("/:eventId", authenticate, mediaController.deleteMultipleMedia);

module.exports = router;
