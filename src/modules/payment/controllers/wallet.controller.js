const Event = require("../../admin/models/Event");
const walletService = require("../services/wallet.service");
const withdrawService = require("../services/withdraw.service");
const paymentService = require("../services/payment.service");

/**
 * Ensure the authenticated user is the organizer of the event.
 */
const ensureOrganizer = async (eventId, userId) => {
  const event = await Event.findById(eventId).select("organizerId").lean();
  if (!event) throw new Error("Event not found");
  if (event.organizerId.toString() !== userId.toString()) {
    throw new Error("Only the event organizer can perform this action");
  }
  return event;
};

/**
 * GET /api/v1/payment/wallet/:eventId
 * Get wallet balance for an event (organizer only).
 */
exports.getWallet = async (req, res) => {
  try {
    const { eventId } = req.params;
    await ensureOrganizer(eventId, req.user._id);
    const result = await walletService.getBalance(eventId);
    const hasBankDetails = await walletService.eventHasBankDetails(eventId);
    return res.status(200).json({ ...result, can_withdraw: hasBankDetails });
  } catch (error) {
    return res
      .status(400)
      .json({ message: error.message || "Failed to get wallet" });
  }
};

/**
 * GET /api/v1/payment/wallet/:eventId/transactions
 * List wallet transactions for an event (organizer only).
 * Query: limit?, skip?, purpose? (media|wishlist|gift – omit for all).
 */
exports.getTransactions = async (req, res) => {
  try {
    const { eventId } = req.params;
    await ensureOrganizer(eventId, req.user._id);
    const { limit = 20, skip = 0, purpose } = req.query;
    const result = await walletService.getTransactions(eventId, {
      limit: parseInt(limit, 10) || 20,
      skip: parseInt(skip, 10) || 0,
      purpose: purpose || undefined,
    });
    return res.status(200).json(result);
  } catch (error) {
    return res
      .status(400)
      .json({ message: error.message || "Failed to get transactions" });
  }
};

/**
 * GET /api/v1/payment/wallet/summary
 * Get total wallet balance across all events for the logged-in organizer.
 */
exports.getWalletSummary = async (req, res) => {
  try {
    const result = await walletService.getOrganizerWalletSummary(req.user._id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Failed to get wallet summary" });
  }
};

/**
 * POST /api/v1/payment/wallet/:eventId/topup
 * Creates a Flutterwave Standard payment link for the organizer to top up their event wallet.
 * Body: { amount, redirect_url }
 */
exports.topupWallet = async (req, res) => {
  try {
    const { eventId } = req.params;
    await ensureOrganizer(eventId, req.user._id);

    const amount = parseFloat(req.body.amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid amount is required" });
    }
    if (!req.body.redirect_url) {
      return res.status(400).json({ message: "redirect_url is required" });
    }

    const event = await Event.findById(eventId).select("title organizerId").lean();
    const organizer = req.user;

    const result = await paymentService.createTopupPaymentLink({
      eventId,
      amount,
      email: organizer.email,
      fullname: `${organizer.firstName || ""} ${organizer.surname || organizer.lastName || ""}`.trim() || "Organizer",
      redirect_url: req.body.redirect_url,
    });

    return res.status(200).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Wallet top-up failed" });
  }
};

/**
 * POST /api/v1/payment/wallet/:eventId/withdraw
 * Body: { amount, callback_url?, bankCode?, accountNumber?, accountName? }
 * Withdraw from event wallet. Uses event's saved payout bank account unless bankCode and accountNumber
 * are provided (organiser can choose to send to a different bank for this withdrawal).
 */
exports.withdraw = async (req, res) => {
  try {
    const { eventId } = req.params;
    await ensureOrganizer(eventId, req.user._id);
    const amount = parseFloat(req.body.amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid amount is required" });
    }
    const result = await withdrawService.initiateWithdrawal(eventId, amount, {
      callback_url: req.body.callback_url,
      bankCode: req.body.bankCode,
      accountNumber: req.body.accountNumber,
      accountName: req.body.accountName,
    });
    return res.status(200).json(result);
  } catch (error) {
    return res
      .status(400)
      .json({ message: error.message || "Withdrawal failed" });
  }
};
