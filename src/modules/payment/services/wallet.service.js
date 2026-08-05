const Event = require("../../admin/models/Event");
const EventWallet = require("../models/EventWallet");
const WalletTransaction = require("../models/WalletTransaction");
const { transactionType, paymentPurpose } = require("../../../utils/constantEnums");

const purposeDescription = {
  [paymentPurpose.MEDIA]: "Media purchase",
  [paymentPurpose.WISHLIST]: "Wishlist purchase",
  [paymentPurpose.GIFT]: "Gift",
  [paymentPurpose.TOPUP]: "Wallet top-up",
  [paymentPurpose.WITHDRAWAL]: "Withdrawal",
};

/** Guest earnings only — excludes topups and withdrawals. */
const REVENUE_PURPOSES = [
  paymentPurpose.MEDIA,
  paymentPurpose.WISHLIST,
  paymentPurpose.GIFT,
];

/**
 * Short purpose label for API responses.
 * transfer_out always maps to "withdrawal" (including older rows that defaulted to "media").
 */
const resolveTransactionPurpose = (tx) => {
  if (!tx) return null;
  if (tx.type === transactionType.TRANSFER_OUT) return paymentPurpose.WITHDRAWAL;
  if (tx.type === transactionType.ADJUSTMENT) return "refund";
  return tx.purpose || null;
};

/**
 * Get or create wallet for event; return wallet doc.
 */
const getOrCreateWallet = async (eventId) => {
  let wallet = await EventWallet.findOne({ eventId });
  if (!wallet) {
    wallet = new EventWallet({ eventId, balance: 0, currency: "NGN" });
    await wallet.save();
  }
  return wallet;
};

/**
 * Credit event wallet when a payment completes (guest paid for media).
 * Idempotent: skips if a transaction for this paymentId already exists.
 */
const creditFromPayment = async (opts) => {
  const {
    eventId,
    amount,
    paymentId,
    reference,
    purpose = paymentPurpose.MEDIA,
    guestId = null,
    guestEmail = null,
    guestName = null,
    guestPhone = null,
  } = opts;
  if (!eventId || amount <= 0) return null;
  const existing = await WalletTransaction.findOne({
    eventId,
    type: transactionType.PAYMENT_IN,
    paymentId,
  });
  if (existing) {
    return {
      wallet: await getOrCreateWallet(eventId),
      transaction: existing,
      isNew: false,
    };
  }

  const wallet = await getOrCreateWallet(eventId);
  const previousBalance = wallet.balance;
  const newBalance = previousBalance + amount;
  wallet.balance = newBalance;
  await wallet.save();

  const tx = new WalletTransaction({
    eventId,
    type: transactionType.PAYMENT_IN,
    amount,
    balanceAfter: newBalance,
    reference,
    paymentId,
    purpose,
    guestId,
    guestEmail,
    guestName,
    guestPhone,
    description: purposeDescription[purpose] || purpose,
    meta: { paymentId: paymentId?.toString(), reference },
  });
  await tx.save();
  return { wallet, transaction: tx, isNew: true };
};

/**
 * Debit event wallet when we transfer to admin's bank (withdrawal).
 */
const debitForTransfer = async (eventId, amount, transferRef, description = "Withdrawal") => {
  if (!eventId || amount <= 0) return null;
  const wallet = await getOrCreateWallet(eventId);
  if (wallet.balance < amount) {
    throw new Error("Insufficient wallet balance");
  }
  const previousBalance = wallet.balance;
  const newBalance = previousBalance - amount;
  wallet.balance = newBalance;
  await wallet.save();

  const tx = new WalletTransaction({
    eventId,
    type: transactionType.TRANSFER_OUT,
    amount: -amount,
    balanceAfter: newBalance,
    reference: transferRef,
    transferRef,
    purpose: paymentPurpose.WITHDRAWAL,
    description,
    meta: { transferRef },
  });
  await tx.save();
  return { wallet, transaction: tx };
};

/**
 * Mark a transfer_out transaction as confirmed successful by Flutterwave (transfer.completed webhook).
 * Idempotent: safe to call multiple times.
 */
const markTransferConfirmed = async (transferRef) => {
  const tx = await WalletTransaction.findOne({ transferRef, type: transactionType.TRANSFER_OUT });
  if (!tx) return null;
  tx.meta = { ...(tx.meta || {}), transfer_status: "successful", confirmed_at: new Date() };
  await tx.save();
  return tx;
};

/**
 * A withdrawal was accepted by Flutterwave but later failed at the bank (transfer.completed
 * webhook with status FAILED). Reverse the debit so the organizer doesn't lose the funds.
 * Idempotent: only reverses once per transferRef, even if the webhook fires more than once.
 */
const reverseFailedTransfer = async (eventId, amount, transferRef, reason = "Withdrawal failed — funds returned to wallet") => {
  if (!eventId || amount <= 0 || !transferRef) return null;

  const originalTx = await WalletTransaction.findOne({ transferRef, type: transactionType.TRANSFER_OUT });
  if (originalTx) {
    originalTx.meta = { ...(originalTx.meta || {}), transfer_status: "failed", failed_at: new Date() };
    await originalTx.save();
  }

  const reversalRef = `${transferRef}_reversal`;
  const existing = await WalletTransaction.findOne({ reference: reversalRef, type: transactionType.ADJUSTMENT });
  if (existing) {
    return { wallet: await getOrCreateWallet(eventId), transaction: existing, isNew: false };
  }

  const wallet = await getOrCreateWallet(eventId);
  const newBalance = wallet.balance + amount;
  wallet.balance = newBalance;
  await wallet.save();

  const tx = new WalletTransaction({
    eventId,
    type: transactionType.ADJUSTMENT,
    amount,
    balanceAfter: newBalance,
    reference: reversalRef,
    transferRef,
    description: reason,
    meta: { reversalOf: transferRef },
  });
  await tx.save();
  return { wallet, transaction: tx, isNew: true };
};

/**
 * Get current balance for an event.
 */
const getBalance = async (eventId) => {
  const wallet = await getOrCreateWallet(eventId);
  return { eventId, balance: wallet.balance, currency: wallet.currency };
};

/**
 * List transactions for an event (for admin dashboard).
 * Optional filter: purpose = "media" | "wishlist" | "gift" | "topup" | "withdrawal" (omit for all).
 */
const getTransactions = async (eventId, { limit = 20, skip = 0, purpose } = {}) => {
  const query = { eventId };
  const validPurposes = Object.values(paymentPurpose);
  if (purpose && validPurposes.includes(purpose)) {
    if (purpose === paymentPurpose.WITHDRAWAL) {
      query.type = transactionType.TRANSFER_OUT;
    } else {
      query.purpose = purpose;
      query.type = transactionType.PAYMENT_IN;
    }
  }

  const [rows, totalCount] = await Promise.all([
    WalletTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    WalletTransaction.countDocuments(query),
  ]);
  const wallet = await getOrCreateWallet(eventId);
  const transactions = rows.map((tx) => ({
    ...tx,
    purpose: resolveTransactionPurpose(tx),
  }));
  return {
    balance: wallet.balance,
    currency: wallet.currency,
    transactions,
    totalCount,
    currentPage: Math.floor(skip / limit) + 1,
    totalPages: Math.ceil(totalCount / limit),
  };
};

/**
 * Check if event has bank details set (for withdrawals).
 */
const eventHasBankDetails = async (eventId) => {
  const event = await Event.findById(eventId).select("payoutBankCode payoutAccountNumber").lean();
  return !!(
    event &&
    event.payoutBankCode &&
    event.payoutAccountNumber
  );
};

/**
 * Get total wallet balance across all events owned by an organizer.
 */
const getOrganizerWalletSummary = async (organizerId) => {
  const events = await Event.find({ organizerId }).select("_id title").lean();
  if (!events.length) {
    return { total_balance: 0, currency: "NGN", total_events: 0, events: [] };
  }

  const eventIds = events.map((e) => e._id);
  const wallets = await EventWallet.find({ eventId: { $in: eventIds } }).lean();

  const walletMap = {};
  wallets.forEach((w) => { walletMap[w.eventId.toString()] = w.balance; });

  let total = 0;
  const eventSummaries = events.map((e) => {
    const balance = walletMap[e._id.toString()] || 0;
    total += balance;
    return { eventId: e._id, title: e.title, balance, currency: "NGN" };
  });

  return {
    total_balance: total,
    currency: "NGN",
    total_events: events.length,
    events: eventSummaries,
  };
};

/**
 * Transaction history across all events for an organizer.
 * Maps DB types to UI labels: Funding (payment_in) / Withdraw (transfer_out).
 * Optional filter: type = funding|withdraw|payment_in|transfer_out
 */
const getOrganizerTransactionHistory = async (
  organizerId,
  { limit = 20, skip = 0, type } = {}
) => {
  const events = await Event.find({ organizerId }).select("_id title").lean();
  if (!events.length) {
    return {
      currency: "NGN",
      transactions: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 0,
    };
  }

  const eventMap = {};
  events.forEach((e) => {
    eventMap[e._id.toString()] = e.title;
  });
  const eventIds = events.map((e) => e._id);

  const query = { eventId: { $in: eventIds } };
  const normalizedType = type ? String(type).toLowerCase().trim() : null;
  if (normalizedType === "funding" || normalizedType === "payment_in") {
    query.type = transactionType.PAYMENT_IN;
  } else if (normalizedType === "withdraw" || normalizedType === "transfer_out") {
    query.type = transactionType.TRANSFER_OUT;
  }

  const [rows, totalCount] = await Promise.all([
    WalletTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    WalletTransaction.countDocuments(query),
  ]);

  const transactions = rows.map((tx) => {
    const isWithdraw = tx.type === transactionType.TRANSFER_OUT;
    const absAmount = Math.abs(Number(tx.amount) || 0);
    return {
      _id: tx._id,
      eventId: tx.eventId,
      eventTitle: eventMap[tx.eventId.toString()] || null,
      type: isWithdraw ? "Withdraw" : "Funding",
      type_raw: tx.type,
      purpose: resolveTransactionPurpose(tx),
      amount: isWithdraw ? -absAmount : absAmount,
      currency: "NGN",
      reference: tx.reference || tx.transferRef || null,
      description: tx.description || null,
      guestName: tx.guestName || null,
      guestEmail: tx.guestEmail || null,
      date: tx.createdAt,
      createdAt: tx.createdAt,
    };
  });

  return {
    currency: "NGN",
    transactions,
    totalCount,
    currentPage: Math.floor(skip / limit) + 1,
    totalPages: Math.ceil(totalCount / limit) || 0,
  };
};

/**
 * Sum guest payment_in amounts (media + wishlist + gift). Excludes topups & withdrawals.
 */
const sumRevenueForEventIds = async (eventIds) => {
  if (!eventIds.length) {
    return { total_revenue: 0, breakdown: { media: 0, wishlist: 0, gift: 0 } };
  }

  const rows = await WalletTransaction.aggregate([
    {
      $match: {
        eventId: { $in: eventIds },
        type: transactionType.PAYMENT_IN,
        purpose: { $in: REVENUE_PURPOSES },
      },
    },
    {
      $group: {
        _id: "$purpose",
        total: { $sum: "$amount" },
      },
    },
  ]);

  const breakdown = { media: 0, wishlist: 0, gift: 0 };
  let total_revenue = 0;
  rows.forEach((row) => {
    const key = row._id;
    const amount = Number(row.total) || 0;
    if (breakdown[key] !== undefined) breakdown[key] = amount;
    total_revenue += amount;
  });

  return { total_revenue, breakdown };
};

/**
 * Revenue for one event + total revenue across all events owned by that organizer.
 */
const getEventAndOrganizerRevenue = async (eventId, organizerId) => {
  const event = await Event.findById(eventId).select("_id title organizerId").lean();
  if (!event) throw new Error("Event not found");
  if (event.organizerId.toString() !== organizerId.toString()) {
    throw new Error("Only the event organizer can view this revenue");
  }

  const organizerEvents = await Event.find({ organizerId }).select("_id").lean();
  const organizerEventIds = organizerEvents.map((e) => e._id);

  const [eventRevenue, organizerRevenue] = await Promise.all([
    sumRevenueForEventIds([event._id]),
    sumRevenueForEventIds(organizerEventIds),
  ]);

  return {
    currency: "NGN",
    event: {
      eventId: event._id,
      title: event.title,
      total_revenue: eventRevenue.total_revenue,
      breakdown: eventRevenue.breakdown,
    },
    organizer: {
      organizerId,
      total_events: organizerEventIds.length,
      total_revenue: organizerRevenue.total_revenue,
      breakdown: organizerRevenue.breakdown,
    },
  };
};

module.exports = {
  getOrCreateWallet,
  creditFromPayment,
  debitForTransfer,
  markTransferConfirmed,
  reverseFailedTransfer,
  getBalance,
  getTransactions,
  eventHasBankDetails,
  getOrganizerWalletSummary,
  getOrganizerTransactionHistory,
  getEventAndOrganizerRevenue,
};
