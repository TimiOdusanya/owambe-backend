const Guest = require("../../admin/models/Guest");
const Event = require("../../admin/models/Event");
const Food = require("../../admin/models/Food");
const Drink = require("../../admin/models/Drink");
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

exports.generateGuestQRCode = async (eventId, guestId) => {
  const guest = await Guest.findOne({ _id: guestId, eventId });
  if (!guest) throw new Error("Guest not found for this event");

  // Generate a unique QR code ID if not exists
  if (!guest.qrCodeId) {
    guest.qrCodeId = uuidv4();
    await guest.save();
  }

  // Generate QR code URL
  const qrCodeUrl = `https://owambe-website.vercel.app/guest/${eventId}/${guest.qrCodeId}`;
  
  // Generate QR code image
  const qrCodeImage = await QRCode.toDataURL(qrCodeUrl);
  
  return {
    qrCodeId: guest.qrCodeId,
    qrCodeUrl,
    qrCodeImage
  };
};

exports.validateQRCode = async (eventId, qrCodeId) => {
  const guest = await Guest.findOne({ eventId, qrCodeId });
  if (!guest) throw new Error("Invalid QR code");

  if (!guest.inviteSent) {
    throw new Error("Invite not sent to this guest");
  }

  if (!guest.claimedInvite) {
    throw new Error("Invite not claimed by this guest");
  }

  return {
    isValid: true,
    guestId: guest._id,
    guestName: guest.name
  };
};

exports.getEventDetailsForQR = async (eventId, qrCodeId) => {
  const guest = await Guest.findOne({ eventId, qrCodeId });
  if (!guest) throw new Error("Invalid QR code");

  if (!guest.inviteSent) {
    throw new Error("Invite not sent to this guest");
  }

  if (!guest.claimedInvite) {
    throw new Error("Invite not claimed by this guest");
  }

  const event = await Event.findById(eventId);
  if (!event) throw new Error("Event not found");

  // Fetch food and drinks for the event
  const food = await Food.find({ eventId });
  const drinks = await Drink.find({ eventId });

  return {
    event: {
      title: event.title,
      venue: event.venue,
      startDateTime: event.startDateTime,
      endDateTime: event.endDateTime,
      timeZone: event.timeZone,
      description: event.description,
      tables: event.tables,
      menu: {
        food: food.map(item => ({
          id: item._id,
          name: item.name,
          category: item.category,
          description: item.description,
          media: item.media
        })),
        drinks: drinks.map(item => ({
          id: item._id,
          name: item.name,
          category: item.category,
          description: item.description,
          media: item.media
        }))
      }
    },
    guest: {
      name: guest.name,
      email: guest.email,
      tableNumber: guest.tableNumber,
      seatNumber: guest.seatNumber
    }
  };
}; 