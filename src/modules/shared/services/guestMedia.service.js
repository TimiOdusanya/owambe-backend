const Media = require("../../admin/models/Media");
const Event = require("../../admin/models/Event");
const paymentService = require("../../payment/services/payment.service");
const { mediaType } = require("../../../utils/constantEnums");

/**
 * List media for an event (guest-facing). No auth.
 * Query filters: type (photo|video), purchased (true|false), free (true), minPrice, maxPrice
 * Always returns media file metadata/links so the gallery can render previews.
 */
const listMediaForGuest = async (
  eventId,
  { limit = 50, skip = 0, guestId, email, type, purchased, free, minPrice, maxPrice } = {}
) => {
  const event = await Event.findById(eventId);
  if (!event) return null;

  const query = { eventId };
  const validTypes = Object.values(mediaType);
  if (type && validTypes.includes(String(type).toLowerCase())) {
    query.type = String(type).toLowerCase();
  }
  if (free === true || free === "true") {
    query.price = { $lte: 0 };
  } else {
    if (minPrice != null && minPrice !== "" && !Number.isNaN(Number(minPrice))) {
      query.price = { ...(query.price || {}), $gte: Number(minPrice) };
    }
    if (maxPrice != null && maxPrice !== "" && !Number.isNaN(Number(maxPrice))) {
      query.price = { ...(query.price || {}), $lte: Number(maxPrice) };
    }
  }

  // Fetch all matching docs first when purchased filter is needed (flags depend on guest)
  const needsPurchaseFilter =
    purchased === true ||
    purchased === "true" ||
    purchased === false ||
    purchased === "false";

  let purchasedIds = [];
  if (guestId || email) {
    purchasedIds = await paymentService.getPurchasedMediaIds(eventId, { guestId, email });
  }

  let mediaDocs = await Media.find(query).sort({ createdAt: -1 }).lean();

  let list = mediaDocs.map((m) => {
    const idStr = m._id.toString();
    const isFree = (m.price || 0) <= 0;
    const isPurchased = purchasedIds.some((id) => String(id) === idStr);
    const hasAccess = isFree || isPurchased;
    const files = Array.isArray(m.media) ? m.media : [];
    return {
      _id: m._id,
      title: m.title,
      type: m.type,
      description: m.description,
      price: m.price,
      purchased: isPurchased,
      has_access: hasAccess,
      media: files,
      media_count: files.length,
    };
  });

  if (needsPurchaseFilter) {
    const wantPurchased = purchased === true || purchased === "true";
    list = list.filter((m) => m.purchased === wantPurchased);
  }

  const totalCount = list.length;
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 50);
  const parsedSkip = Math.max(0, parseInt(skip, 10) || 0);
  const paged = list.slice(parsedSkip, parsedSkip + parsedLimit);

  return {
    media: paged,
    totalCount,
    currentPage: Math.floor(parsedSkip / parsedLimit) + 1,
    totalPages: Math.ceil(totalCount / parsedLimit) || 0,
  };
};

/**
 * Get single media for guest. If price > 0 and guest has not purchased, return metadata only (no links).
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
      guestId: guestId || null,
      email: email || null,
    });
    const mediaIdStr = (media._id != null ? media._id : mediaId).toString();
    hasAccess = purchasedIds.some((id) => String(id) === mediaIdStr);
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
