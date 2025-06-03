const Event = require("../models/Event");

exports.createEvent = async (eventData) => {
  const event = new Event(eventData);
  await event.save();
  return event;
};

exports.createMultipleEvents = async (eventsData) => {
  const events = await Event.insertMany(eventsData);
  return events;
};

exports.getEventById = async (eventId) => {
  return await Event.findById(eventId);
};

exports.getAllEvents = async (limit = 10, skip = 0) => {
  return await Event.find().skip(skip).limit(limit);
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
