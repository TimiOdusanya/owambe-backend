const generateEventCode = require("../../../utils/generateCode");
const Event = require("../models/Event");
const qrCodeService = require("../../shared/services/qrCode.service");
const { isBrokenFrontendUrl } = require("../../../utils/urlConfig");

exports.createEvent = async (eventData) => {
  const eventCode = generateEventCode();

  const event = new Event({
    ...eventData,
    eventCode,
  });

  await event.save();
  await qrCodeService.generateEventQRCode(event._id);
  return Event.findById(event._id);
};

exports.createMultipleEvents = async (eventsData) => {
  const eventsWithCodes = eventsData.map(event => ({
    ...event,
    eventCode: generateEventCode(),
  }));

  const events = await Event.insertMany(eventsWithCodes);
  return events;
};

exports.getEventById = async (eventId) => {
  const event = await Event.findById(eventId);
  if (!event) return null;
  if (!event.qrCode?.qrCodeUrl || isBrokenFrontendUrl(event.qrCode.qrCodeUrl)) {
    event.qrCode = await qrCodeService.generateEventQRCode(eventId);
  }
  return event;
};

exports.getAllEvents = async (userId, limit, skip) => {
  const [events, totalCount] = await Promise.all([
    Event.find({ organizerId: userId }).skip(skip).limit(limit).sort({ createdAt: -1 }),
    Event.countDocuments({ organizerId: userId }),
  ]);

  await Promise.all(
    events.map(async (event) => {
      if (!event.qrCode?.qrCodeUrl || isBrokenFrontendUrl(event.qrCode.qrCodeUrl)) {
        event.qrCode = await qrCodeService.generateEventQRCode(event._id);
      }
    })
  );

  return { events, totalCount };
};


exports.updateEvent = async (eventId, updateData) => {
  return await Event.findByIdAndUpdate(eventId, updateData, { new: true });
};

exports.deleteEvent = async (eventId) => {
  return await Event.findByIdAndDelete(eventId);
};

exports.deleteMultipleEvents = async (eventIds) => {
  return await Event.deleteMany({ _id: { $in: eventIds } });
};
