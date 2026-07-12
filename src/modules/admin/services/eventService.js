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
  let event = await Event.findById(eventId);
  if (!event) return null;
  try {
    if (!event.eventCode || !event.qrCode?.qrCodeUrl || isBrokenFrontendUrl(event.qrCode.qrCodeUrl)) {
      await qrCodeService.generateEventQRCode(eventId);
      event = await Event.findById(eventId);
    }
  } catch (err) {
    console.error(`QR refresh failed for event ${eventId}:`, err.message);
  }
  return event;
};

/**
 * List organizer events. Never runs QR/eventCode repair here —
 * that used to throw "eventCode is required" and break the whole list.
 * Repair runs on create, get-by-id, and GET /qr-code/generate/event/:id.
 */
exports.getAllEvents = async (userId, limit, skip) => {
  const [events, totalCount] = await Promise.all([
    Event.find({ organizerId: userId })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean(),
    Event.countDocuments({ organizerId: userId }),
  ]);

  // Best-effort: backfill missing eventCode without failing the list
  await Promise.all(
    events.map(async (event, index) => {
      if (event.eventCode) return;
      try {
        const code = generateEventCode();
        await Event.updateOne(
          { _id: event._id, $or: [{ eventCode: null }, { eventCode: { $exists: false } }, { eventCode: "" }] },
          { $set: { eventCode: code } }
        );
        events[index] = { ...event, eventCode: code };
      } catch (err) {
        console.error(`eventCode backfill failed for ${event._id}:`, err.message);
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
