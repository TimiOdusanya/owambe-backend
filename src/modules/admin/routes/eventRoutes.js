const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");
const eventBankAccountController = require("../controllers/eventBankAccount.controller");
const { authenticate } = require("../../../middleware/authMiddleware");

router.post("/create-event", authenticate, eventController.createEvent);
router.post("/create-many-events", authenticate, eventController.createMultipleEvents);
router.get("/", authenticate, eventController.getAllEvents);

router.put("/:id/bank-account", authenticate, eventBankAccountController.upsertBankAccount);
router.get("/:id/bank-account", authenticate, eventBankAccountController.getBankAccount);
router.post("/:id/bank-account/resolve", authenticate, eventBankAccountController.resolveAccountName);
router.delete("/:id/bank-account", authenticate, eventBankAccountController.deleteBankAccount);

router.get("/:id", authenticate, eventController.getEvent);
router.patch("/:id", authenticate, eventController.updateEvent);
router.delete("/:id", authenticate, eventController.deleteEvent);
router.delete("/delete-many-events", authenticate, eventController.deleteMultipleEvents);

module.exports = router;
