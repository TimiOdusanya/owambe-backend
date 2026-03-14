const Event = require("../../admin/models/Event");
const Media = require("../../admin/models/Media");
const Guest = require("../../admin/models/Guest");
const Gift = require("../../admin/models/Gift");
const MediaPurchase = require("../models/MediaPurchase");
const { paymentStatus, paymentMethod, paymentPurpose } = require("../../../utils/constantEnums");
const flutterwaveService = require("./flutterwave.service");
const walletService = require("./wallet.service");

const createTxRef = () =>
  `owambe_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

/**
 * Ensure the payer is a guest for this event and has accepted (claimed) the invite.
 * Call before allowing payment. Throws if guest not found or invite not claimed.
 * @param {string} eventId
 * @param {{ guestId?: string, email?: string }} identifiers - at least one required
 * @returns {Promise<{ guest: Object }>} the guest document (for optional use)
 */
const ensureGuestHasClaimedInvite = async (eventId, { guestId, email } = {}) => {
  if (!guestId && !email) {
    throw new Error("Guest must be identified by guestId or email to make a payment");
  }
  let guest;
  if (guestId) {
    guest = await Guest.findOne({ _id: guestId, eventId }).lean();
  } else {
    guest = await Guest.findOne({ eventId, email: new RegExp(`^${String(email).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }).lean();
  }
  if (!guest) {
    throw new Error("Guest not found for this event. You must be invited and accept the invite before paying.");
  }
  if (!guest.claimedInvite) {
    throw new Error("You must accept (claim) your invite before making a payment.");
  }
  return { guest };
};

/**
 * Validate event, guest (if provided), and media items; compute total. For purpose=media.
 */
const validateAndComputeTotal = async (eventId, guestId, mediaIds) => {
  const event = await Event.findById(eventId);
  if (!event) throw new Error("Event not found");

  if (guestId) {
    const guest = await Guest.findOne({ _id: guestId, eventId });
    if (!guest) throw new Error("Guest not found for this event");
  }

  const mediaList = await Media.find({ _id: { $in: mediaIds }, eventId });
  if (mediaList.length !== mediaIds.length) {
    throw new Error("One or more media items not found or do not belong to this event");
  }

  const totalAmount = mediaList.reduce((sum, m) => sum + (m.price || 0), 0);
  if (totalAmount <= 0) throw new Error("Total amount must be greater than 0");

  return { event, mediaList, totalAmount };
};

/**
 * Validate event and wishlist item; return totalAmount. For purpose=wishlist.
 */
const validateForWishlist = async (eventId, guestId, wishlistId) => {
  const event = await Event.findById(eventId);
  if (!event) throw new Error("Event not found");
  if (guestId) {
    const guest = await Guest.findOne({ _id: guestId, eventId });
    if (!guest) throw new Error("Guest not found for this event");
  }
  const gift = await Gift.findOne({ _id: wishlistId, eventId, type: "wishlist" });
  if (!gift) throw new Error("Wishlist item not found");
  if (gift.purchased) throw new Error("This wishlist item has already been purchased");
  const totalAmount = gift.price;
  if (!totalAmount || totalAmount <= 0) throw new Error("Invalid wishlist item price");
  return { event, gift, totalAmount };
};

/**
 * Validate event and amount. For purpose=gift.
 */
const validateForGift = async (eventId, amount) => {
  const event = await Event.findById(eventId);
  if (!event) throw new Error("Event not found");
  const totalAmount = Number(amount);
  if (!totalAmount || totalAmount <= 0) throw new Error("Gift amount must be greater than 0");
  return { event, totalAmount };
};

/**
 * Credit wallet and mark wishlist purchased when applicable.
 */
const completePurchase = async (purchase) => {
  await walletService.creditFromPayment({
    eventId: purchase.eventId,
    amount: purchase.totalAmount,
    paymentId: purchase._id,
    reference: purchase.txRef,
    purpose: purchase.purpose || paymentPurpose.MEDIA,
    guestId: purchase.guestId,
    guestEmail: purchase.guestEmail,
    guestName: purchase.guestName,
    guestPhone: purchase.guestPhone,
  });
  if (purchase.purpose === paymentPurpose.WISHLIST && purchase.wishlistId) {
    await Gift.findByIdAndUpdate(purchase.wishlistId, {
      purchased: true,
      purchasedAt: new Date(),
      "purchasedBy.guestId": purchase.guestId,
      "purchasedBy.guestEmail": purchase.guestEmail,
      "purchasedBy.guestName": purchase.guestName,
    });
  }
};

/**
 * Create a pending MediaPurchase and initiate Flutterwave charge (card or bank transfer).
 * purpose: 'media' | 'wishlist' | 'gift'
 * For media: mediaIds required. For wishlist: wishlistId required. For gift: amount required.
 */
const initiatePayment = async ({
  eventId,
  guestId,
  purpose = paymentPurpose.MEDIA,
  mediaIds,
  wishlistId,
  amount: giftAmount,
  email,
  fullname,
  phone_number,
  method,
  card_number,
  expiry_month,
  expiry_year,
  cvv,
  redirect_url,
}) => {
  await ensureGuestHasClaimedInvite(eventId, { guestId: guestId || null, email });

  let totalAmount;
  if (purpose === paymentPurpose.WISHLIST) {
    const result = await validateForWishlist(eventId, guestId, wishlistId);
    totalAmount = result.totalAmount;
  } else if (purpose === paymentPurpose.GIFT) {
    const result = await validateForGift(eventId, giftAmount);
    totalAmount = result.totalAmount;
  } else {
    const result = await validateAndComputeTotal(eventId, guestId, mediaIds || []);
    totalAmount = result.totalAmount;
  }

  const txRef = createTxRef();
  const purchase = new MediaPurchase({
    eventId,
    purpose,
    guestId: guestId || null,
    guestEmail: email,
    guestName: fullname,
    guestPhone: phone_number || null,
    mediaIds: purpose === paymentPurpose.MEDIA ? mediaIds || [] : [],
    wishlistId: purpose === paymentPurpose.WISHLIST ? wishlistId : null,
    totalAmount,
    currency: "NGN",
    paymentMethod: method,
    txRef,
    status: paymentStatus.PENDING,
  });
  await purchase.save();

  if (method === paymentMethod.CARD) {
    const payload = {
      card_number: String(card_number).replace(/\s/g, ""),
      expiry_month: String(expiry_month).padStart(2, "0"),
      expiry_year: String(expiry_year).length === 2 ? String(expiry_year) : String(expiry_year).slice(-2),
      cvv: String(cvv),
      amount: Math.round(Number(totalAmount)),
      currency: "NGN",
      email,
      fullname,
      phone_number: phone_number || "",
      tx_ref: txRef,
      ...(redirect_url && redirect_url.trim() ? { redirect_url: redirect_url.trim() } : {}),
    };
    let response;
    try {
      response = await flutterwaveService.chargeCard(payload);
    } catch (err) {
      purchase.status = paymentStatus.FAILED;
      await purchase.save();
      const cause = err.cause?.message || err.cause?.code;
      const msg =
        err.message ||
        (cause ? `Card charge request failed: ${cause}` : "Card charge request failed. Check network and Flutterwave API availability.");
      throw new Error(msg);
    }

    if (response.status === "error") {
      purchase.status = paymentStatus.FAILED;
      await purchase.save();
      throw new Error(response.message || "Card charge failed");
    }

    // Flutterwave v3: for card, response may have only meta (no data) when mode is "pin".
    // Per Flutterwave docs, PIN flow requires a second Charge.card() with PIN to get flw_ref, then validate with OTP.
    const meta = response.meta?.authorization || response.data?.meta?.authorization || {};
    const data = response.data || {};
    const mode = (meta.mode || "").toLowerCase();
    const flwRefFromApi =
      data?.flw_ref ||
      data?.flwRef ||
      meta?.flw_ref ||
      meta?.flwRef ||
      meta?.reference ||
      (data?.meta?.authorization && (data.meta.authorization.flw_ref || data.meta.authorization.reference)) ||
      null;

    purchase.flwRef = flwRefFromApi;
    purchase.flwTransactionId = data?.id || null;
    purchase.meta = purchase.meta || {};
    purchase.meta.authorization = meta;
    purchase.meta.processor_response = data?.processor_response;

    // When mode is "pin", Flutterwave does not return data/flw_ref until we send PIN in a second charge call.
    if (mode === "pin" && !flwRefFromApi) {
      purchase.meta.chargePayload = {
        card_number: String(card_number).replace(/\s/g, ""),
        expiry_month: String(expiry_month).padStart(2, "0"),
        expiry_year: String(expiry_year).length === 2 ? String(expiry_year) : String(expiry_year).slice(-2),
        cvv: String(cvv),
        amount: Math.round(Number(totalAmount)),
        currency: "NGN",
        email,
        fullname,
        phone_number: phone_number || "",
        tx_ref: txRef,
        ...(redirect_url && redirect_url.trim() ? { redirect_url: redirect_url.trim() } : {}),
      };
      await purchase.save();
      return {
        success: true,
        next_action: "pin",
        message: "Enter your card PIN to continue",
        tx_ref: txRef,
        purchase_id: purchase._id,
      };
    }

    purchase.meta.processor_response = data?.processor_response;
    await purchase.save();

    // OTP: we have flw_ref (from first response or from a previous PIN step)
    if (mode === "otp" || (mode === "pin" && flwRefFromApi)) {
      const flwRef = flwRefFromApi || purchase.flwRef;
      return {
        success: true,
        next_action: "otp",
        message: data?.processor_response || "OTP sent to your phone",
        flw_ref: flwRef || undefined,
        tx_ref: txRef,
        purchase_id: purchase._id,
      };
    }
    const redirectUrl = meta.redirect || meta.redirect_url;
    if (mode === "redirect" && redirectUrl) {
      return {
        success: true,
        next_action: "redirect",
        redirect_url: redirectUrl,
        tx_ref: txRef,
        flw_transaction_id: data.id,
        purchase_id: purchase._id,
      };
    }
    if (data.status === "successful") {
      purchase.status = paymentStatus.COMPLETED;
      await purchase.save();
      return {
        success: true,
        next_action: "completed",
        tx_ref: txRef,
        purchase_id: purchase._id,
      };
    }
    // Pending (e.g. auth mode we don't map, or async completion). Still return flw_ref so frontend can show OTP and call validate.
    const flwRefPending = flwRefFromApi || data.flw_ref || purchase.flwRef;
    return {
      success: true,
      next_action: "pending",
      message: data.processor_response || "Payment pending",
      flw_ref: flwRefPending || undefined,
      tx_ref: txRef,
      purchase_id: purchase._id,
    };
  }

  if (method === paymentMethod.BANK_TRANSFER) {
    const details = {
      tx_ref: txRef,
      amount: String(Math.round(totalAmount)),
      currency: "NGN",
      email,
      fullname,
      phone_number: phone_number || "",
    };
    const response = await flutterwaveService.chargeBankTransfer(details);

    if (response.status === "error") {
      purchase.status = paymentStatus.FAILED;
      await purchase.save();
      throw new Error(response.message || "Bank transfer initiation failed");
    }

    const auth = response.meta?.authorization || {};
    purchase.meta = {
      bank_transfer: {
        transfer_account: auth.transfer_account,
        transfer_bank: auth.transfer_bank,
        transfer_amount: auth.transfer_amount,
        transfer_note: auth.transfer_note,
      },
    };
    await purchase.save();

    return {
      success: true,
      next_action: "bank_transfer",
      tx_ref: txRef,
      purchase_id: purchase._id,
      bank_account: {
        account_number: auth.transfer_account,
        bank_name: auth.transfer_bank,
        amount: auth.transfer_amount,
        note: auth.transfer_note,
      },
    };
  }

  throw new Error("Invalid payment method");
};

/**
 * Submit card PIN (second step of Flutterwave PIN flow). Returns flw_ref for OTP step.
 * Per Flutterwave docs: first charge returns mode "pin" with no data; second Charge.card with PIN returns flw_ref.
 */
const submitPinAndGetFlwRef = async (purchaseId, pin) => {
  const purchase = await MediaPurchase.findById(purchaseId);
  if (!purchase) throw new Error("Purchase not found");
  if (purchase.status !== paymentStatus.PENDING) {
    throw new Error("Purchase is no longer pending");
  }
  const chargePayload = purchase.meta?.chargePayload;
  if (!chargePayload) throw new Error("No pending PIN step for this purchase");

  // Per Flutterwave v3 docs: same charge card endpoint, add authorization: { mode, pin }
  const payloadWithPin = {
    ...chargePayload,
    authorization: {
      mode: "pin",
      pin: String(pin).trim(),
    },
  };
  const response = await flutterwaveService.chargeCardWithAuthorization(payloadWithPin);

  if (response.status === "error") {
    throw new Error(response.message || "PIN authorization failed");
  }

  const data = response.data || {};
  const meta = response.meta?.authorization || {};
  const flwRef = data.flw_ref || data.flwRef || meta.flw_ref || meta.reference || null;
  if (!flwRef) {
    throw new Error("No reference received from payment provider. Please try again.");
  }

  purchase.flwRef = flwRef;
  purchase.flwTransactionId = data.id || null;
  purchase.meta = purchase.meta || {};
  delete purchase.meta.chargePayload;
  purchase.meta.authorization = meta;
  purchase.meta.processor_response = data.processor_response;
  await purchase.save();

  return {
    success: true,
    next_action: "otp",
    message: data.processor_response || "OTP sent to your phone",
    flw_ref: flwRef,
    tx_ref: purchase.txRef,
    purchase_id: purchase._id,
  };
};

/**
 * Validate OTP and complete card charge; verify and mark purchase completed.
 */
const validateOtpAndComplete = async (flw_ref, otp) => {
  const response = await flutterwaveService.validateCharge({ otp, flw_ref });

  if (response.status === "error") {
    throw new Error(response.message || "Validation failed");
  }

  const data = response.data || {};
  const transactionId = data.id;
  const txRef = data.tx_ref;

  const purchase = await MediaPurchase.findOne({ txRef });
  if (!purchase) throw new Error("Purchase not found");

  if (purchase.status === paymentStatus.COMPLETED) {
    return { success: true, already_completed: true, purchase };
  }

  const verifyRes = await flutterwaveService.verifyTransaction(transactionId);
  if (verifyRes.status === "error" || verifyRes.data?.status !== "successful") {
    throw new Error(verifyRes.message || "Payment verification failed");
  }

  purchase.flwTransactionId = transactionId;
  purchase.status = paymentStatus.COMPLETED;
  purchase.meta = purchase.meta || {};
  purchase.meta.verified_at = new Date();
  await purchase.save();

  await completePurchase(purchase);

  return { success: true, purchase };
};

/**
 * Verify transaction by id or tx_ref (from webhook, redirect, or polling) and mark purchase completed.
 */
const verifyAndCompletePurchase = async (transactionIdOrTxRef, { byTxRef = false } = {}) => {
  let purchase = byTxRef
    ? await MediaPurchase.findOne({ txRef: transactionIdOrTxRef })
    : await MediaPurchase.findOne({
        $or: [
          { flwTransactionId: transactionIdOrTxRef },
          { txRef: transactionIdOrTxRef },
        ],
      });

  if (!purchase) throw new Error("Purchase not found");

  let verifyRes;
  if (purchase.flwTransactionId) {
    verifyRes = await flutterwaveService.verifyTransaction(purchase.flwTransactionId);
  } else {
    verifyRes = await flutterwaveService.verifyTransactionByTxRef(purchase.txRef);
  }

  if (verifyRes.status === "error") {
    return {
      success: false,
      status: "error",
      message: verifyRes.message || "Payment not yet completed. Complete the OTP step or try again.",
      purchase,
    };
  }

  const data = verifyRes.data || {};
  if (data.status !== "successful") {
    return { success: false, status: data.status, purchase };
  }

  purchase.flwTransactionId = data.id;
  purchase.status = paymentStatus.COMPLETED;
  purchase.meta = purchase.meta || {};
  purchase.meta.verified_at = new Date();
  await purchase.save();

  await completePurchase(purchase);

  return { success: true, purchase };
};

/**
 * Handle Flutterwave webhook (charge.completed).
 * Supports both v3 (event, tx_ref, successful) and v4 (type, reference, succeeded) payload shapes.
 */
const handleWebhook = async (payload) => {
  const eventType = payload.event || payload.type;
  const data = payload.data || {};

  if (eventType !== "charge.completed") {
    return { handled: false };
  }

  const txRef = data.tx_ref || data.reference;
  const transactionId = data.id;
  const amount = data.amount;
  const status = data.status;
  const isSuccess =
    status === "successful" || status === "succeeded";

  const purchase = await MediaPurchase.findOne({ txRef });
  if (!purchase) return { handled: true, message: "Purchase not found" };

  if (purchase.status === paymentStatus.COMPLETED) {
    return { handled: true, message: "Already completed" };
  }

  if (!isSuccess) {
    return { handled: true, message: "Charge not successful" };
  }

  if (Math.abs(amount - purchase.totalAmount) > 0.01) {
    return { handled: true, message: "Amount mismatch" };
  }

  purchase.flwTransactionId = transactionId;
  purchase.status = paymentStatus.COMPLETED;
  purchase.meta = purchase.meta || {};
  purchase.meta.webhook_at = new Date();
  await purchase.save();

  await completePurchase(purchase);

  return { handled: true, purchase };
};

const emailRegex = (email) =>
  new RegExp(`^${String(email).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");

/**
 * Get purchased media ids for a guest (or by email) in an event.
 * Resolves guest so that guestId and email return the same set (e.g. purchases
 * made with email-only have guestId null but are found when querying by guestId).
 */
const getPurchasedMediaIds = async (eventId, { guestId, email } = {}) => {
  const hasId = guestId && String(guestId).trim() && String(guestId) !== "null" && String(guestId) !== "undefined";
  const hasEmail = email && String(email).trim() && String(email) !== "null" && String(email) !== "undefined";
  if (!hasId && !hasEmail) return [];

  const normalizedEmail = hasEmail ? String(email).trim().toLowerCase() : null;
  let guestDoc = null;
  if (hasId) {
    guestDoc = await Guest.findOne({ _id: guestId, eventId }).select("email").lean();
  } else {
    guestDoc = await Guest.findOne({
      eventId,
      email: emailRegex(normalizedEmail),
    })
      .select("_id email")
      .lean();
  }

  const resolvedId = (hasId && guestId) || (guestDoc && guestDoc._id);
  const resolvedEmail = normalizedEmail || (guestDoc && guestDoc.email && String(guestDoc.email).trim());

  const base = { eventId, status: paymentStatus.COMPLETED, purpose: paymentPurpose.MEDIA };
  const orConditions = [];
  if (resolvedId) orConditions.push({ guestId: resolvedId });
  if (resolvedEmail) orConditions.push({ guestEmail: emailRegex(resolvedEmail) });
  const query = orConditions.length > 0 ? { ...base, $or: orConditions } : base;

  const purchases = await MediaPurchase.find(query);
  const ids = new Set();
  purchases.forEach((p) => {
    if (p.mediaIds && Array.isArray(p.mediaIds)) {
      p.mediaIds.forEach((id) => ids.add(id.toString()));
    }
  });
  return Array.from(ids);
};

module.exports = {
  createTxRef,
  validateAndComputeTotal,
  validateForWishlist,
  validateForGift,
  initiatePayment,
  submitPinAndGetFlwRef,
  validateOtpAndComplete,
  verifyAndCompletePurchase,
  handleWebhook,
  getPurchasedMediaIds,
};
