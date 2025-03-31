const express = require('express');
const router = express.Router();
const guestController = require('../controllers/guestController');
const { authenticate } = require("../../../middleware/authMiddleware");

router.post('/:eventId', authenticate, guestController.createGuest);
router.post('/bulk/:eventId', authenticate, guestController.createMultipleGuests);
router.get('/:eventId/:guestId', authenticate, guestController.getGuest);
router.get('/:eventId', authenticate, guestController.getAllGuests);
router.patch('/:eventId/:guestId', authenticate, guestController.updateGuest);
router.delete('/:eventId/:guestId', authenticate, guestController.deleteGuest);
router.delete('/:eventId', authenticate, guestController.deleteMultipleGuests);
router.post('/:eventId/:guestId/send-invite', authenticate, guestController.sendInvite);
router.post('/:eventId/send-invites', authenticate, guestController.sendInvitesToMultiple);
router.post('/:eventId/send-invites-all', authenticate, guestController.sendInvitesToAll);

module.exports = router;