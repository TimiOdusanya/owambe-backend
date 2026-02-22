const guestMediaService = require("../services/guestMedia.service");

/**
 * GET /api/v1/guest-media/:eventId
 * Query: limit, skip, guestId?, email?
 * List media for event (guest view). Optional guestId/email to show purchased and access.
 */
exports.listMedia = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { limit = 10, skip = 0, guestId, email } = req.query;

    const result = await guestMediaService.listMediaForGuest(eventId, {
      limit: parseInt(limit, 10) || 10,
      skip: parseInt(skip, 10) || 0,
      guestId: guestId || null,
      email: email || null,
    });

    if (!result) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

/**
 * GET /api/v1/guest-media/:eventId/:mediaId
 * Query: guestId?, email?
 * Get one media. If paid and not purchased, returns metadata without download links (has_access: false).
 */
exports.getMedia = async (req, res) => {
  try {
    const { eventId, mediaId } = req.params;
    const { guestId, email } = req.query;

    const result = await guestMediaService.getMediaAccessForGuest(eventId, mediaId, {
      guestId: guestId || null,
      email: email || null,
    });

    if (!result) {
      return res.status(404).json({ message: "Media or event not found" });
    }

    if (!result.has_access) {
      return res.status(402).json({
        message: "Payment required to view or download this media",
        media: {
          _id: result._id,
          title: result.title,
          type: result.type,
          description: result.description,
          price: result.price,
          has_access: false,
        },
      });
    }

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};
