const Event = require("../../admin/models/Event");
const Media = require("../../admin/models/Media");
const Guest = require("../../admin/models/Guest");
const Gift = require("../../admin/models/Gift");
const User = require("../../user/models/UserProfile.model");
const MediaPurchase = require("../models/MediaPurchase");
const WalletTransaction = require("../models/WalletTransaction");
const { paymentStatus, paymentMethod, paymentPurpose } = require("../../../utils/constantEnums");
const flutterwaveService = require("./flutterwave.service");
const walletService = require("./wallet.service");
const { sendEmail } = require("../../../utils/otpUtils");
const { getFrontendUrl, getDashboardUrl } = require("../../../utils/urlConfig");

const purposeLabels = {
  [paymentPurpose.MEDIA]: "Media purchase",
  [paymentPurpose.WISHLIST]: "Wishlist purchase",
  [paymentPurpose.GIFT]: "Cash gift",
  [paymentPurpose.TOPUP]: "Wallet top-up",
};

const formatNaira = (amount) =>
  Number(amount || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 });

const createTxRef = () =>
  `owambe_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

/**
 * Atomically set specific keys under MediaPurchase.meta (a Mixed field) without
 * touching the rest of it, and without needing an in-memory copy to be up to date.
 *
 * Several independent flows can race to update the same purchase's meta (webhook,
 * manual verify, reconcile, the payout retry sweep). A full-document `purchase.save()`
 * would silently clobber whatever another flow wrote in between fetch and save — this
 * uses MongoDB's dot-notation update instead, so each caller only ever touches its own
 * keys. Safe even when meta is currently null (the schema default).
 */
const patchPurchaseMeta = async (purchaseId, patch) => {
  const keys = Object.keys(patch || {});
  if (!keys.length) return;
  await MediaPurchase.updateOne({ _id: purchaseId, meta: null }, { $set: { meta: {} } });
  const setOps = {};
  keys.forEach((key) => {
    setOps[`meta.${key}`] = patch[key];
  });
  await MediaPurchase.updateOne({ _id: purchaseId }, { $set: setOps });
};

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
 * Email purchased media download links to the guest (once per purchase).
 */
const sendMediaPurchaseEmail = async (purchase) => {
  if (purchase.purpose !== paymentPurpose.MEDIA) return;
  if (!purchase.guestEmail) return;
  if (purchase.meta?.media_email_sent) return;
  if (!purchase.mediaIds?.length) return;

  const mediaDocs = await Media.find({
    _id: { $in: purchase.mediaIds },
    eventId: purchase.eventId,
  }).lean();
  if (!mediaDocs.length) return;

  const mediaItems = mediaDocs.map((m) => ({
    title: m.title || "Media",
    links: (Array.isArray(m.media) ? m.media : [])
      .filter((f) => f?.link)
      .map((f, idx) => ({
        url: f.link,
        label: f.name || `File ${idx + 1}`,
      })),
  }));

  const event = await Event.findById(purchase.eventId).select("title").lean();
  const eventTitle = event?.title || "your event";
  const guestSite = getFrontendUrl();
  const buttonLink = guestSite
    ? `${guestSite}/${purchase.eventId}?email=${encodeURIComponent(purchase.guestEmail)}`
    : null;

  await sendEmail(purchase.guestEmail, "mediaPurchase", {
    subject: `Your media from ${eventTitle}`,
    guestName: purchase.guestName || "Guest",
    body: `Thanks for your purchase. Here are your media file(s) from <strong>${eventTitle}</strong>:`,
    mediaItems,
    buttonLink,
    buttonText: "Open event media",
    text: `Thanks for your purchase. Open your media for ${eventTitle}: ${buttonLink || ""}`,
  });

  await patchPurchaseMeta(purchase._id, { media_email_sent: true, media_email_sent_at: new Date() });
};

/**
 * Email organizer when wallet is newly credited (payment alert).
 */
const sendOrganizerPaymentAlert = async (purchase, wallet, note) => {
  if (purchase.meta?.organizer_alert_sent) return;
  if (purchase.purpose === paymentPurpose.TOPUP) return;

  const event = await Event.findById(purchase.eventId)
    .select("title organizerId")
    .lean();
  if (!event?.organizerId) return;

  const organizer = await User.findById(event.organizerId)
    .select("email firstName surname fullName")
    .lean();
  if (!organizer?.email) return;

  const purpose = purchase.purpose || paymentPurpose.MEDIA;
  const purposeLabel = purposeLabels[purpose] || purpose;
  const organizerName =
    organizer.firstName ||
    organizer.fullName ||
    `${organizer.firstName || ""} ${organizer.surname || ""}`.trim() ||
    "Organizer";
  const dashboard = getDashboardUrl();
  const buttonLink = dashboard || null;
  const balance = wallet?.balance ?? 0;

  await sendEmail(organizer.email, "paymentReceived", {
    subject: `₦${formatNaira(purchase.totalAmount)} received — ${event.title || "your event"}`,
    organizerName,
    eventTitle: event.title || "Your event",
    purposeLabel,
    amountFormatted: formatNaira(purchase.totalAmount),
    balanceFormatted: formatNaira(balance),
    guestName: purchase.guestName || "Guest",
    guestEmail: purchase.guestEmail || "",
    body:
      note ||
      `You received a <strong>${purposeLabel.toLowerCase()}</strong> payment. It has been added to your event wallet balance and transaction history.`,
    buttonLink,
    buttonText: "Open dashboard",
    text: `You received ₦${formatNaira(purchase.totalAmount)} (${purposeLabel}) for ${event.title}. New wallet balance: ₦${formatNaira(balance)}.`,
  });

  await patchPurchaseMeta(purchase._id, { organizer_alert_sent: true, organizer_alert_sent_at: new Date() });
};

/**
 * Credit wallet, mark wishlist purchased, email guest media + organizer alert.
 * Guest payments (media/wishlist/gift) and organizer top-ups both land in the event's
 * Owambe wallet the same way — it's the organizer's own decision when (and how much)
 * to withdraw from there to their bank account via the manual withdraw endpoint.
 */
const completePurchase = async (purchase) => {
  const creditResult = await walletService.creditFromPayment({
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

  // Notifications must not fail payment completion.
  // Also runs on heal/verify so guests/organisers still get emails if webhook was late.
  try {
    await sendMediaPurchaseEmail(purchase);
  } catch (err) {
    console.error("Media purchase email failed:", err.message);
  }

  try {
    await sendOrganizerPaymentAlert(purchase, creditResult?.wallet);
  } catch (err) {
    console.error("Organizer payment alert failed:", err.message);
  }

  return creditResult;
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
  // Always round to whole naira so stored amount matches what Flutterwave is charged
  const roundedAmount = Math.round(Number(totalAmount));
  const purchase = new MediaPurchase({
    eventId,
    purpose,
    guestId: guestId || null,
    guestEmail: email,
    guestName: fullname,
    guestPhone: phone_number || null,
    mediaIds: purpose === paymentPurpose.MEDIA ? mediaIds || [] : [],
    wishlistId: purpose === paymentPurpose.WISHLIST ? wishlistId : null,
    totalAmount: roundedAmount,
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
      amount: roundedAmount,
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
      purchase.flwTransactionId = data.id || purchase.flwTransactionId;
      purchase.status = paymentStatus.COMPLETED;
      purchase.meta = purchase.meta || {};
      purchase.meta.completed_at = new Date();
      await purchase.save();
      // Must credit wallet / mark wishlist — same as webhook & verify
      await completePurchase(purchase);
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
    await completePurchase(purchase);
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
 * If purchase is already COMPLETED locally, always attempt wallet credit (heal missed credits).
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

  // Heal path: already marked completed but wallet may never have been credited
  if (purchase.status === paymentStatus.COMPLETED) {
    await completePurchase(purchase);
    return { success: true, already_completed: true, purchase };
  }

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
 * Email organizer when an accepted withdrawal fails at the bank and funds are returned to wallet.
 */
const sendWithdrawalFailedAlert = async (eventId, amount, wallet, reason) => {
  const event = await Event.findById(eventId).select("title organizerId").lean();
  if (!event?.organizerId) return;

  const organizer = await User.findById(event.organizerId)
    .select("email firstName surname fullName")
    .lean();
  if (!organizer?.email) return;

  const organizerName =
    organizer.firstName ||
    organizer.fullName ||
    `${organizer.firstName || ""} ${organizer.surname || ""}`.trim() ||
    "Organizer";
  const dashboard = getDashboardUrl();
  const balance = wallet?.balance ?? 0;

  await sendEmail(organizer.email, "withdrawalFailed", {
    subject: `Withdrawal failed — funds returned to your wallet`,
    organizerName,
    eventTitle: event.title || "Your event",
    amountFormatted: formatNaira(amount),
    balanceFormatted: formatNaira(balance),
    body: `Your withdrawal could not be completed${reason ? ` (${reason})` : ""}. The amount has been added back to your event wallet.`,
    buttonLink: dashboard || null,
    buttonText: "Open dashboard",
    text: `Your ₦${formatNaira(amount)} withdrawal for ${event.title} failed and has been returned to your wallet. New balance: ₦${formatNaira(balance)}.`,
  });
};

/**
 * Handle Flutterwave transfer.completed webhook (payout status callback).
 * On FAILED, reverse the wallet debit so the organizer doesn't lose the funds.
 */
const handleTransferWebhook = async (data) => {
  const transferRef = data.reference;
  const status = String(data.status || "").toUpperCase();
  if (!transferRef) return { handled: true, message: "No reference on transfer webhook" };

  if (status === "SUCCESSFUL") {
    await walletService.markTransferConfirmed(transferRef);
    return { handled: true, status: "successful" };
  }

  if (status === "FAILED") {
    const tx = await WalletTransaction.findOne({ transferRef });
    if (!tx) return { handled: true, message: "Transfer record not found for reference" };

    const amount = Math.abs(tx.amount);
    const result = await walletService.reverseFailedTransfer(
      tx.eventId,
      amount,
      transferRef,
      data.complete_message || "Transfer failed at the bank"
    );

    if (result?.isNew) {
      try {
        await sendWithdrawalFailedAlert(tx.eventId, amount, result.wallet, data.complete_message);
      } catch (err) {
        console.error("Withdrawal-failed alert email failed:", err.message);
      }
    }
    return { handled: true, status: "failed", reversed: !!result?.isNew };
  }

  // NEW / PENDING or other in-progress statuses — nothing to do yet.
  return { handled: true, status: status.toLowerCase() || "unknown" };
};

/**
 * Handle Flutterwave webhook (charge.completed for payments, transfer.completed for payouts).
 * Supports both v3 (event, tx_ref, successful) and v4 (type, reference, succeeded) payload shapes.
 */
const handleWebhook = async (payload) => {
  const eventType = payload.event || payload.type;
  const data = payload.data || {};

  if (eventType === "transfer.completed") {
    return handleTransferWebhook(data);
  }

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

  if (!isSuccess) {
    return { handled: true, message: "Charge not successful" };
  }

  // Use a 1-naira tolerance to account for rounding differences
  if (Math.abs(amount - Math.round(purchase.totalAmount)) > 1) {
    return { handled: true, message: "Amount mismatch" };
  }

  // Idempotent: even if already COMPLETED, still run completePurchase
  // (covers cases where status was set without wallet credit)
  if (purchase.status !== paymentStatus.COMPLETED) {
    purchase.flwTransactionId = transactionId;
    purchase.status = paymentStatus.COMPLETED;
    purchase.meta = purchase.meta || {};
    purchase.meta.webhook_at = new Date();
    await purchase.save();
  } else if (transactionId && !purchase.flwTransactionId) {
    purchase.flwTransactionId = transactionId;
    await purchase.save();
  }

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

/**
 * Flutterwave Standard: create a payment link so the guest pays on Flutterwave's UI.
 * Use for media, wishlist, or gift. No card capture on your side; frontend just redirects to link.
 * Completion is handled by webhook (charge.completed) or GET /payment/verify/:tx_ref after redirect.
 */
const createPaymentLink = async ({
  eventId,
  guestId,
  purpose = paymentPurpose.MEDIA,
  mediaIds,
  wishlistId,
  amount: giftAmount,
  email,
  fullname,
  phone_number,
  redirect_url,
}) => {
  if (!redirect_url || !String(redirect_url).trim()) {
    throw new Error("redirect_url is required for payment link (where to send the guest after payment)");
  }
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
  const roundedTotalAmount = Math.round(Number(totalAmount));
  const purchase = new MediaPurchase({
    eventId,
    purpose,
    guestId: guestId || null,
    guestEmail: email,
    guestName: fullname,
    guestPhone: phone_number || null,
    mediaIds: purpose === paymentPurpose.MEDIA ? mediaIds || [] : [],
    wishlistId: purpose === paymentPurpose.WISHLIST ? wishlistId : null,
    totalAmount: roundedTotalAmount,
    currency: "NGN",
    paymentMethod: paymentMethod.PAYMENT_LINK,
    txRef,
    status: paymentStatus.PENDING,
  });
  await purchase.save();

  const flwResponse = await flutterwaveService.createPaymentLink({
    tx_ref: txRef,
    amount: roundedTotalAmount,
    currency: "NGN",
    redirect_url: redirect_url.trim(),
    customer: {
      email,
      name: fullname,
      phonenumber: phone_number || "",
    },
    meta: {
      purchase_id: purchase._id.toString(),
      event_id: eventId,
      purpose,
    },
  });

  if (flwResponse.status === "error") {
    purchase.status = paymentStatus.FAILED;
    await purchase.save();
    throw new Error(flwResponse.message || "Failed to create payment link");
  }

  const link = flwResponse.data?.link;
  if (!link) {
    purchase.status = paymentStatus.FAILED;
    await purchase.save();
    throw new Error("No payment link returned from Flutterwave");
  }

  return {
    link,
    tx_ref: txRef,
    purchase_id: purchase._id,
    amount: roundedTotalAmount,
  };
};

/**
 * Create a Flutterwave Standard payment link for an organizer to top up their event wallet.
 * On completion (webhook/verify), the event wallet is credited via creditFromPayment.
 */
const createTopupPaymentLink = async ({ eventId, amount, email, fullname, redirect_url }) => {
  if (!redirect_url) throw new Error("redirect_url is required");
  const event = await Event.findById(eventId);
  if (!event) throw new Error("Event not found");

  const roundedAmount = Math.round(Number(amount));
  if (!roundedAmount || roundedAmount <= 0) throw new Error("Amount must be greater than 0");

  const txRef = createTxRef();
  const purchase = new MediaPurchase({
    eventId,
    purpose: paymentPurpose.TOPUP,
    guestId: null,
    guestEmail: email,
    guestName: fullname,
    guestPhone: null,
    mediaIds: [],
    wishlistId: null,
    totalAmount: roundedAmount,
    currency: "NGN",
    paymentMethod: paymentMethod.PAYMENT_LINK,
    txRef,
    status: paymentStatus.PENDING,
    meta: { topup: true },
  });
  await purchase.save();

  const flwResponse = await flutterwaveService.createPaymentLink({
    tx_ref: txRef,
    amount: roundedAmount,
    currency: "NGN",
    redirect_url: redirect_url.trim(),
    customer: { email, name: fullname },
    meta: { purchase_id: purchase._id.toString(), event_id: eventId, topup: true },
  });

  if (flwResponse.status === "error") {
    purchase.status = paymentStatus.FAILED;
    await purchase.save();
    throw new Error(flwResponse.message || "Failed to create top-up payment link");
  }

  const link = flwResponse.data?.link;
  if (!link) {
    purchase.status = paymentStatus.FAILED;
    await purchase.save();
    throw new Error("No payment link returned from Flutterwave");
  }

  return { link, tx_ref: txRef, purchase_id: purchase._id, amount: roundedAmount };
};

/**
 * Backfill wallet credits for an event:
 * 1) PENDING purchases — verify with Flutterwave; if successful, complete + credit
 * 2) COMPLETED purchases missing a wallet row — credit (missed webhook/verify)
 * Idempotent. Safe for organizers to re-run.
 */
const reconcileEventPayments = async (eventId) => {
  const WalletTransaction = require("../models/WalletTransaction");
  const { transactionType } = require("../../../utils/constantEnums");

  let verifiedFromPending = 0;
  let pendingStillOpen = 0;
  const pendingDetails = [];

  const pendingPurchases = await MediaPurchase.find({
    eventId,
    status: paymentStatus.PENDING,
  });

  for (const purchase of pendingPurchases) {
    try {
      const result = await verifyAndCompletePurchase(purchase.txRef, { byTxRef: true });
      if (result.success) {
        verifiedFromPending += 1;
        pendingDetails.push({
          purchase_id: purchase._id,
          tx_ref: purchase.txRef,
          amount: purchase.totalAmount,
          purpose: purchase.purpose,
          source: "pending_verified",
        });
      } else {
        pendingStillOpen += 1;
      }
    } catch (err) {
      // Not found on Flutterwave / network — leave pending
      pendingStillOpen += 1;
    }
  }

  const purchases = await MediaPurchase.find({
    eventId,
    status: paymentStatus.COMPLETED,
  });

  let credited = 0;
  let alreadyCredited = 0;
  const details = [...pendingDetails];

  for (const purchase of purchases) {
    const existing = await WalletTransaction.findOne({
      eventId: purchase.eventId,
      type: transactionType.PAYMENT_IN,
      paymentId: purchase._id,
    });
    // Always run completePurchase: wallet credit is idempotent; also sends
    // missing guest media / organizer alert emails on heal.
    await completePurchase(purchase);
    if (existing) {
      alreadyCredited += 1;
      continue;
    }
    credited += 1;
    details.push({
      purchase_id: purchase._id,
      tx_ref: purchase.txRef,
      amount: purchase.totalAmount,
      purpose: purchase.purpose,
      source: "completed_missing_wallet",
    });
  }

  const wallet = await walletService.getOrCreateWallet(eventId);
  return {
    eventId,
    total_completed_purchases: purchases.length,
    pending_checked: pendingPurchases.length,
    verified_from_pending: verifiedFromPending,
    pending_still_open: pendingStillOpen,
    credited: credited + verifiedFromPending,
    already_credited: alreadyCredited,
    balance: wallet.balance,
    currency: wallet.currency,
    newly_credited: details,
  };
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
  createPaymentLink,
  createTopupPaymentLink,
  reconcileEventPayments,
};
