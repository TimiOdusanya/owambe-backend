const generateEventCode = require("../../../utils/generateCode");
const Event = require("../models/Event");

exports.createEvent = async (eventData) => {
  const eventCode = generateEventCode();

  const event = new Event({
    ...eventData,
    eventCode,
  });

  await event.save();
  return event;
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
  return await Event.findById(eventId);
};

exports.getAllEvents = async (userId, limit, skip) => {

  const [events, totalCount] = await Promise.all([
      Event.find({ organizerId: userId }).skip(skip).limit(limit),
      Event.countDocuments({ organizerId: userId })
      .sort( {createdAt: -1}),
    ]);
  
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
