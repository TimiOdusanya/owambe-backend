const express = require('express');
const router = express.Router();
const guestController = require('../controllers/guestController');
const { authenticate } = require("../../../middleware/authMiddleware");

router.post('/:eventId/guests', authenticate, guestController.createGuest);
router.get('/:eventId/guests/:guestId', authenticate, guestController.getGuest);
router.get('/:eventId/guests', authenticate, guestController.getAllGuests);
router.put('/:eventId/guests/:guestId', authenticate, guestController.updateGuest);
router.delete('/:eventId/guests/:guestId', authenticate, guestController.deleteGuest);
router.delete('/:eventId/guests', authenticate, guestController.deleteMultipleGuests);
router.post('/:eventId/guests/:guestId/send-invite', authenticate, guestController.sendInvite);
router.post('/:eventId/guests/send-invites', authenticate, guestController.sendInvitesToMultiple);
router.post('/:eventId/guests/send-invites-all', authenticate, guestController.sendInvitesToAll);

module.exports = router;