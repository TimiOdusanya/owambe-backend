const paymentService = require("../services/payment.service");
const flutterwaveService = require("../services/flutterwave.service");

/**
 * GET /api/v1/payment/banks?country=NG
 * List banks for a country (for payout bank dropdown). Returns Flutterwave-supported banks with code and name.
 */
exports.getBanks = async (req, res) => {
  try {
    const country = req.query.country || "NG";
    const response = await flutterwaveService.getBanks(country);
    if (response.status === "error") {
      return res.status(400).json({ message: response.message || "Failed to fetch banks" });
    }
    return res.status(200).json(response.data || []);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to fetch banks" });
  }
};

/**
 * POST /api/v1/payment/initiate
 * Body: eventId, purpose (media|wishlist|gift), guestId?, email, fullname, phone_number?, method (card|bank_transfer), redirect_url?
 * For media: mediaIds[] required. For wishlist: wishlistId required. For gift: amount required.
 * For card: card_number, expiry_month, expiry_year, cvv
 */
exports.initiatePayment = async (req, res) => {
  try {
    const {
      eventId,
      guestId,
      purpose = "media",
      mediaIds,
      wishlistId,
      amount: giftAmount,
      email,
      fullname,
      phone_number,
      method,
      redirect_url,
      card_number,
      expiry_month,
      expiry_year,
      cvv,
    } = req.body;

    if (!eventId) {
      return res.status(400).json({ message: "eventId is required" });
    }
    if (!["media", "wishlist", "gift"].includes(purpose)) {
      return res.status(400).json({ message: "purpose must be 'media', 'wishlist', or 'gift'" });
    }
    if (purpose === "media" && (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0)) {
      return res.status(400).json({ message: "mediaIds array is required for media purchase" });
    }
    if (purpose === "wishlist" && !wishlistId) {
      return res.status(400).json({ message: "wishlistId is required for wishlist purchase" });
    }
    if (purpose === "gift" && (giftAmount == null || Number(giftAmount) <= 0)) {
      return res.status(400).json({ message: "amount (positive number) is required for gift" });
    }
    if (!email || !fullname) {
      return res.status(400).json({ message: "email and fullname are required" });
    }
    if (!method || !["card", "bank_transfer"].includes(method)) {
      return res.status(400).json({ message: "method must be 'card' or 'bank_transfer'" });
    }
    if (method === "card") {
      if (!card_number || !expiry_month || !expiry_year || !cvv) {
        return res
          .status(400)
          .json({ message: "card_number, expiry_month, expiry_year, and cvv are required for card" });
      }
    }

    const result = await paymentService.initiatePayment({
      eventId,
      guestId: guestId || null,
      purpose,
      mediaIds: purpose === "media" ? mediaIds : undefined,
      wishlistId: purpose === "wishlist" ? wishlistId : undefined,
      amount: purpose === "gift" ? giftAmount : undefined,
      email,
      fullname,
      phone_number: phone_number || null,
      method,
      redirect_url: redirect_url || null,
      card_number,
      expiry_month,
      expiry_year,
      cvv,
    });

    return res.status(200).json(result);
  } catch (error) {
    return res
      .status(400)
      .json({ message: error.message || "Failed to initiate payment" });
  }
};

/**
 * POST /api/v1/payment/create-link
 * Flutterwave Standard: create a payment link; guest pays on Flutterwave's page. No card capture.
 * Body: eventId, purpose (media|wishlist|gift), guestId?, email, fullname, phone_number?, redirect_url (required).
 * For media: mediaIds[] required. For wishlist: wishlistId required. For gift: amount required.
 * Returns: { link, tx_ref, purchase_id, amount }. Frontend redirects user to link.
 */
exports.createPaymentLink = async (req, res) => {
  try {
    const {
      eventId,
      guestId,
      purpose = "media",
      mediaIds,
      wishlistId,
      amount: giftAmount,
      email,
      fullname,
      phone_number,
      redirect_url,
    } = req.body;

    if (!eventId) {
      return res.status(400).json({ message: "eventId is required" });
    }
    if (!["media", "wishlist", "gift"].includes(purpose)) {
      return res.status(400).json({ message: "purpose must be 'media', 'wishlist', or 'gift'" });
    }
    if (purpose === "media" && (!mediaIds || !Array.isArray(mediaIds) || mediaIds.length === 0)) {
      return res.status(400).json({ message: "mediaIds array is required for media purchase" });
    }
    if (purpose === "wishlist" && !wishlistId) {
      return res.status(400).json({ message: "wishlistId is required for wishlist purchase" });
    }
    if (purpose === "gift" && (giftAmount == null || Number(giftAmount) <= 0)) {
      return res.status(400).json({ message: "amount (positive number) is required for gift" });
    }
    if (!email || !fullname) {
      return res.status(400).json({ message: "email and fullname are required" });
    }
    if (!redirect_url || !String(redirect_url).trim()) {
      return res.status(400).json({ message: "redirect_url is required (where to send the guest after payment)" });
    }

    const result = await paymentService.createPaymentLink({
      eventId,
      guestId: guestId || null,
      purpose,
      mediaIds: purpose === "media" ? mediaIds : undefined,
      wishlistId: purpose === "wishlist" ? wishlistId : undefined,
      amount: purpose === "gift" ? giftAmount : undefined,
      email,
      fullname,
      phone_number: phone_number || null,
      redirect_url: redirect_url.trim(),
    });

    return res.status(200).json(result);
  } catch (error) {
    return res
      .status(400)
      .json({ message: error.message || "Failed to create payment link" });
  }
};

/**
 * POST /api/v1/payment/submit-pin
 * Body: purchase_id, pin (required when initiate returned next_action "pin")
 */
exports.submitPin = async (req, res) => {
  try {
    const { purchase_id, pin } = req.body;
    if (!purchase_id || pin === undefined || pin === null) {
      return res.status(400).json({ message: "purchase_id and pin are required" });
    }

    const result = await paymentService.submitPinAndGetFlwRef(purchase_id, pin);
    return res.status(200).json(result);
  } catch (error) {
    return res
      .status(400)
      .json({ message: error.message || "PIN submission failed" });
  }
};

/**
 * POST /api/v1/payment/validate
 * Body: flw_ref, otp
 */
exports.validateCharge = async (req, res) => {
  try {
    const { flw_ref, otp } = req.body;
    if (!flw_ref || !otp) {
      return res.status(400).json({ message: "flw_ref and otp are required" });
    }

    const result = await paymentService.validateOtpAndComplete(flw_ref, otp);
    return res.status(200).json({
      success: true,
      message: "Payment successful",
      purchase_id: result.purchase._id,
      media_ids: result.purchase.mediaIds,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ message: error.message || "Validation failed" });
  }
};

/**
 * GET /api/v1/payment/verify/:tx_ref
 * Verify by transaction reference (e.g. after redirect or polling).
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { tx_ref } = req.params;
    if (!tx_ref) {
      return res.status(400).json({ message: "tx_ref is required" });
    }

    const result = await paymentService.verifyAndCompletePurchase(tx_ref, { byTxRef: true });
    if (!result.success) {
      return res.status(200).json({
        success: false,
        status: result.status,
        message: result.message || "Payment not yet successful",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Payment verified",
      purchase_id: result.purchase._id,
      media_ids: result.purchase.mediaIds,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ message: error.message || "Verification failed" });
  }
};

/**
 * POST /api/v1/payment/webhook
 * Flutterwave webhook (charge.completed). No auth; verifies flutterwave-signature when FLW_SECRET_HASH is set.
 */
exports.webhook = async (req, res) => {
  try {
    const secretHash = process.env.FLW_SECRET_HASH;
    if (secretHash) {
      const signature = req.headers["flutterwave-signature"];
      const rawBody = req.rawBody;
      if (!signature || !rawBody) {
        return res.status(401).send("Invalid webhook: missing signature or body");
      }
      const crypto = require("crypto");
      const hash = crypto
        .createHmac("sha256", secretHash)
        .update(rawBody)
        .digest("base64");
      if (hash !== signature) {
        return res.status(401).send("Invalid webhook signature");
      }
    }
    const payload = req.body;
    const result = await paymentService.handleWebhook(payload);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ message: "Webhook error" });
  }
};

/**
 * GET /api/v1/payment/purchases/:eventId
 * Query: guestId or email – list completed purchases for a guest in an event.
 */
exports.getPurchases = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { guestId, email } = req.query;
    if (!guestId && !email) {
      return res.status(400).json({ message: "guestId or email query is required" });
    }

    const purchasedIds = await paymentService.getPurchasedMediaIds(eventId, {
      guestId: guestId || null,
      email: email || null,
    });
    return res.status(200).json({ eventId, purchased_media_ids: purchasedIds });
  } catch (error) {
    return res
      .status(400)
      .json({ message: error.message || "Failed to get purchases" });
  }
};
