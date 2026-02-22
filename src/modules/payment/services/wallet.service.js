const Event = require("../../admin/models/Event");
const EventWallet = require("../models/EventWallet");
const WalletTransaction = require("../models/WalletTransaction");
const { transactionType, paymentPurpose } = require("../../../utils/constantEnums");

const purposeDescription = {
  [paymentPurpose.MEDIA]: "Media purchase",
  [paymentPurpose.WISHLIST]: "Wishlist purchase",
  [paymentPurpose.GIFT]: "Gift",
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
  if (existing) return { wallet: await getOrCreateWallet(eventId), transaction: existing };

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
  return { wallet, transaction: tx };
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
    description,
    meta: { transferRef },
  });
  await tx.save();
  return { wallet, transaction: tx };
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
 */
const getTransactions = async (eventId, { limit = 20, skip = 0 } = {}) => {
  const [transactions, totalCount] = await Promise.all([
    WalletTransaction.find({ eventId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    WalletTransaction.countDocuments({ eventId }),
  ]);
  const wallet = await getOrCreateWallet(eventId);
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

module.exports = {
  getOrCreateWallet,
  creditFromPayment,
  debitForTransfer,
  getBalance,
  getTransactions,
  eventHasBankDetails,
};
