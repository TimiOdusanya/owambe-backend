const Media = require("../models/Media");

exports.createMedia = async (mediaData) => {
  const media = new Media(mediaData);
  await media.save();
  return media;
};


exports.createMultipleMedia = async (mediaData) => {
  return await Media.insertMany(mediaData);
};

exports.getMediaById = async (eventId, mediaId) => {
  return await Media.findOne({ _id: mediaId, eventId });
};

exports.getAllMedia = async (eventId, limit = 10, skip = 0) => {
   const [media, totalCount] = await Promise.all([
      Media.find({ eventId }).skip(skip).limit(limit),
      Media.countDocuments({ eventId }),
    ]);
  
    return { media, totalCount };

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
