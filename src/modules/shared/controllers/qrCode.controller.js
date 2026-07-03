const qrCodeService = require("../services/qrCode.service");

exports.generateGuestQRCode = async (req, res) => {
  try {
    const { eventId, guestId } = req.params;
    const qrCodeData = await qrCodeService.generateGuestQRCode(eventId, guestId);
    res.json(qrCodeData);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.validateQRCode = async (req, res) => {
  try {
    const { eventId, qrCodeId } = req.params;
    const validationResult = await qrCodeService.validateQRCode(eventId, qrCodeId);
    res.json(validationResult);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getEventDetailsForQR = async (req, res) => {
  try {
    const { eventId, qrCodeId } = req.params;
    const eventDetails = await qrCodeService.getEventDetailsForQR(eventId, qrCodeId);
    res.json(eventDetails);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}; 


exports.generateEventQRCode = async (req, res) => {
  try {
    const { eventId } = req.params;
    const qrCodeData = await qrCodeService.generateEventQRCode(eventId);
    res.json(qrCodeData);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


exports.verifyEmailForGuestId = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const guest = await qrCodeService.findGuestByEmail(eventId, email.toLowerCase());

    if (!guest) {
      return res.status(404).json({ message: "Guest not found with that email for this event" });
    }

    if (!guest.claimedInvite) {
      return res.status(403).json({ message: "Invite not claimed yet" });
    }



    res.json({ guestId: guest._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
