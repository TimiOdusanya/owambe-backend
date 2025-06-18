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