const Media = require("../models/Media");
const Event = require("../models/Event");

exports.createMedia = async (mediaData) => {
  const event = await Event.findById(mediaData.eventId);
  if (!event) throw new Error("Event not found");
  const media = new Media(mediaData);
  await media.save();
  return media;
};

exports.getMediaById = async (eventId, mediaId) => {
  return await Media.findOne({ _id: mediaId, eventId });
};

exports.getAllMedia = async (eventId, limit = 10, skip = 0) => {
  return await Media.find({ eventId }).skip(skip).limit(limit);
};

exports.updateMedia = async (eventId, mediaId, updateData) => {
  return await Media.findOneAndUpdate({ _id: mediaId, eventId }, updateData, {
    new: true,
  });
};

exports.deleteMedia = async (eventId, mediaId) => {
  return await Media.findOneAndDelete({ _id: mediaId, eventId });
};

exports.deleteMultipleMedia = async (eventId, mediaIds) => {
  return await Media.deleteMany({ eventId, _id: { $in: mediaIds } });
};
