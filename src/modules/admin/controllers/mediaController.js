const Event = require("../models/Event");
const Media = require("../models/Media");
const mediaService = require("../services/mediaService");

exports.createMedia = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });

    const mediaData = { ...req.body, eventId };
    const media = await mediaService.createMedia(mediaData);
    res.status(201).json(media);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


exports.createMultipleMedia = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const mediaData = req.body.map((media) => ({ ...media, eventId }));
    const media = await mediaService.createMultipleMedia(mediaData);
    res.status(201).json({ success: true, media });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getMedia = async (req, res) => {
  try {
    const { eventId, mediaId } = req.params;
    const media = await mediaService.getMediaById(eventId, mediaId);
    if (!media) return res.status(404).json({ message: "Media not found" });
    res.json(media);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getAllMedia = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { limit = 10, skip = 0 } = req.query;

    const parsedLimit = parseInt(limit);
    const parsedSkip = parseInt(skip);


    const { media, totalCount } = await mediaService.getAllMedia(
      eventId,
      parsedLimit, parsedSkip
    );

    res.json({
      media,
      totalCount,
      currentPage: Math.floor(parsedSkip / parsedLimit) + 1,
      totalPages: Math.ceil(totalCount / parsedLimit),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateMedia = async (req, res) => {
  try {
    const { eventId, mediaId } = req.params;
    const media = await mediaService.updateMedia(eventId, mediaId, req.body);
    if (!media) return res.status(404).json({ message: "Media not found" });
    res.json(media);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteMedia = async (req, res) => {
  try {
    const { eventId, mediaId } = req.params;
    const media = await mediaService.deleteMedia(eventId, mediaId);
    if (!media) return res.status(404).json({ message: "Media not found" });
    res.json({ message: "Media deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteMultipleMedia = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { mediaIds } = req.body;

    const existingMedia = await Media.find({ _id: { $in: mediaIds }, eventId });

    const existingMediaIds = existingMedia.map((media) => media._id.toString());
    const missingMediaIds = mediaIds.filter((id) => !existingMediaIds.includes(id));

    if (missingMediaIds.length > 0) {
      return res.status(404).json({ 
        message: "Some media items were not found", 
        missingMediaIds 
      });
    }

    await mediaService.deleteMultipleMedia(eventId, mediaIds);
    res.json({ message: "Media items deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

