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
      card_number,
      expiry_month: String(expiry_month).padStart(2, "0"),
      expiry_year: String(expiry_year).length === 2 ? expiry_year : String(expiry_year).slice(-2),
      cvv,
      amount: String(Math.round(totalAmount)),
      currency: "NGN",
      email,
      fullname,
      phone_number: phone_number || "",
      tx_ref: txRef,
      redirect_url: redirect_url || "",
    };
    const response = await flutterwaveService.chargeCard(payload);

    if (response.status === "error") {
      purchase.status = paymentStatus.FAILED;
      await purchase.save();
      throw new Error(response.message || "Card charge failed");
    }

    const meta = response.meta?.authorization || {};
    const data = response.data || {};
    const mode = meta.mode;

    purchase.flwRef = data.flw_ref || null;
    purchase.flwTransactionId = data.id || null;
    purchase.meta = { authorization: meta, processor_response: data.processor_response };
    await purchase.save();

    if (mode === "otp") {
      return {
        success: true,
        next_action: "otp",
        message: response.data?.processor_response || "OTP sent to your phone",
        flw_ref: data.flw_ref,
        tx_ref: txRef,
        purchase_id: purchase._id,
      };
    }
    if (mode === "redirect" && meta.redirect) {
      return {
        success: true,
        next_action: "redirect",
        redirect_url: meta.redirect,
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
    return {
      success: true,
      next_action: "pending",
      message: data.processor_response || "Payment pending",
      flw_ref: data.flw_ref,
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
    throw new Error(verifyRes.message || "Verification failed");
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
 * Handle Flutterwave webhook (charge.completed). Verify and complete purchase by tx_ref.
 */
const handleWebhook = async (payload) => {
  const event = payload.event;
  const data = payload.data || {};

  if (event !== "charge.completed") {
    return { handled: false };
  }

  const txRef = data.tx_ref;
  const transactionId = data.id;
  const amount = data.amount;
  const status = data.status;

  const purchase = await MediaPurchase.findOne({ txRef });
  if (!purchase) return { handled: true, message: "Purchase not found" };

  if (purchase.status === paymentStatus.COMPLETED) {
    return { handled: true, message: "Already completed" };
  }

  if (status !== "successful") {
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

/**
 * Get purchased media ids for a guest (or by email) in an event.
 */
const getPurchasedMediaIds = async (eventId, { guestId, email } = {}) => {
  const query = { eventId, status: paymentStatus.COMPLETED, purpose: paymentPurpose.MEDIA };
  if (guestId) query.guestId = guestId;
  if (email) query.guestEmail = email;
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
  validateOtpAndComplete,
  verifyAndCompletePurchase,
  handleWebhook,
  getPurchasedMediaIds,
};
