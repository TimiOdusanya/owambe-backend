const express = require("express");
const router = express.Router();
const inviteController = require("../controllers/inviteController");
const { authenticate } = require("../../../middleware/authMiddleware");

router.post("/:eventId/:guestId", authenticate, inviteController.inviteGuest);
router.post("/claim-invite/:eventId/:guestId", authenticate, inviteController.claimEvent);
router.get("/isinvite-claimed/:eventId/:guestId", authenticate, inviteController.InviteClaimed);
router.get("/view-event/:eventId/:guestId", authenticate, inviteController.getEventForOneGuest);


module.exports = router;
