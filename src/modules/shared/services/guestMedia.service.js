const Media = require("../../admin/models/Media");
const Event = require("../../admin/models/Event");
const paymentService = require("../../payment/services/payment.service");

/**
 * List media for an event (guest-facing). No auth.
 * If guestId or email is provided, include purchased flag per media.
 * For paid media, do not expose download links unless purchased or price is 0.
 */
const listMediaForGuest = async (eventId, { limit = 50, skip = 0, guestId, email } = {}) => {
  const event = await Event.findById(eventId);
  if (!event) return null;

  const [media, totalCount] = await Promise.all([
    Media.find({ eventId })
      .skip(skip)
      .limit(limit)
      .lean(),
    Media.countDocuments({ eventId }),
  ]);

  let purchasedIds = [];
  if (guestId || email) {
    purchasedIds = await paymentService.getPurchasedMediaIds(eventId, { guestId, email });
  }

  const list = media.map((m) => {
    const idStr = m._id.toString();
    const isFree = (m.price || 0) <= 0;
    const purchased = purchasedIds.includes(idStr);
    const hasAccess = isFree || purchased;
    return {
      _id: m._id,
      title: m.title,
      type: m.type,
      description: m.description,
      price: m.price,
      purchased,
      has_access: hasAccess,
      media: hasAccess ? m.media : [],
      media_count: (m.media || []).length,
    };
  });

  return {
    media: list,
    totalCount,
    currentPage: Math.floor(skip / limit) + 1,
    totalPages: Math.ceil(totalCount / limit),
  };
};

/**
 * Get single media for guest. If price > 0 and guest has not purchased, return metadata only (no links).
 * If guestId or email not provided, only free media returns links.
 */
const getMediaAccessForGuest = async (eventId, mediaId, { guestId, email } = {}) => {
  const event = await Event.findById(eventId);
  if (!event) return null;

  const media = await Media.findOne({ _id: mediaId, eventId }).lean();
  if (!media) return null;

  const isFree = (media.price || 0) <= 0;
  let hasAccess = isFree;
  if (!hasAccess && (guestId || email)) {
    const purchasedIds = await paymentService.getPurchasedMediaIds(eventId, {
      guestId,
      email,
    });
    hasAccess = purchasedIds.includes(mediaId.toString());
  }

  return {
    _id: media._id,
    title: media.title,
    type: media.type,
    description: media.description,
    price: media.price,
    has_access: hasAccess,
    media: hasAccess ? media.media : [],
  };
};

module.exports = {
  listMediaForGuest,
  getMediaAccessForGuest,
};
