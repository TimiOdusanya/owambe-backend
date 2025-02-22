const mediaService = require("../services/mediaService");

exports.createMedia = async (req, res) => {
  try {
    const { eventId } = req.params;
    const mediaData = { ...req.body, eventId };
    const media = await mediaService.createMedia(mediaData);
    res.status(201).json(media);
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
    const media = await mediaService.getAllMedia(
      eventId,
      parseInt(limit),
      parseInt(skip)
    );
    res.json(media);
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
    await mediaService.deleteMultipleMedia(eventId, mediaIds);
    res.json({ message: "Media items deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
