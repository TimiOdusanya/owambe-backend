const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");
const { authenticate } = require("../../../middleware/authMiddleware");

router.post("/create-event", authenticate, eventController.createEvent);
router.post("/create-many-events", authenticate, eventController.createMultipleEvents);
router.get("/:id", authenticate, eventController.getEvent);
router.get("/", authenticate, eventController.getAllEvents);
router.patch("/:id", authenticate, eventController.updateEvent);
router.delete("/:id", authenticate, eventController.deleteEvent);
router.delete("/delete-many-events", authenticate, eventController.deleteMultipleEvents);

module.exports = router;
