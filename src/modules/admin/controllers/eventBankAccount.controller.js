const Event = require("../models/Event");
const flutterwaveService = require("../../payment/services/flutterwave.service");

/**
 * Ensure the authenticated user is the organizer of the event.
 */
const ensureOrganizer = async (eventId, userId) => {
  const event = await Event.findById(eventId).select("organizerId").lean();
  if (!event) throw new Error("Event not found");
  if (event.organizerId.toString() !== userId.toString()) {
    throw new Error("Only the event organizer can manage bank account details");
  }
};

/**
 * PUT /api/v1/events/:eventId/bank-account
 * Add or update bank account details for an event (organizer only).
 * Body: { bankCode, bankName, accountNumber, accountName?, accountType? }
 * - bankCode: Flutterwave bank code (e.g. "058" for GTBank)
 * - bankName: Display name (e.g. "GTBank")
 * - accountNumber: 10-digit NGN account number
 * - accountName: Optional; can be from resolve or user input
 * - accountType: Optional; e.g. "Savings", "Current"
 */
exports.upsertBankAccount = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user._id;
    await ensureOrganizer(eventId, userId);

    const { bankCode, bankName, accountNumber, accountName, accountType } = req.body;

    if (!bankCode || !bankName || !accountNumber) {
      return res.status(400).json({
        message: "bankCode, bankName, and accountNumber are required",
      });
    }

    const trimmedAccountNumber = String(accountNumber).replace(/\s/g, "");
    if (!/^\d{10}$/.test(trimmedAccountNumber)) {
      return res.status(400).json({
        message: "Account number must be a 10-digit number",
      });
    }

    const event = await Event.findByIdAndUpdate(
      eventId,
      {
        payoutBankCode: bankCode,
        payoutBankName: bankName,
        payoutAccountNumber: trimmedAccountNumber,
        payoutAccountName: accountName || null,
        payoutAccountType: accountType || null,
      },
      { new: true }
    ).select(
      "payoutBankCode payoutBankName payoutAccountNumber payoutAccountName payoutAccountType"
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.status(200).json({
      message: "Bank details saved successfully",
      bankAccount: {
        bankCode: event.payoutBankCode,
        bankName: event.payoutBankName,
        accountNumber: event.payoutAccountNumber,
        accountName: event.payoutAccountName,
        accountType: event.payoutAccountType,
      },
    });
  } catch (error) {
    return res
      .status(400)
      .json({ message: error.message || "Failed to save bank details" });
  }
};

/**
 * GET /api/v1/events/:eventId/bank-account
 * Get bank account details for an event (organizer only). Account number is masked.
 */
exports.getBankAccount = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user._id;
    await ensureOrganizer(eventId, userId);

    const event = await Event.findById(eventId).select(
      "payoutBankCode payoutBankName payoutAccountNumber payoutAccountName payoutAccountType"
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const hasBankAccount = !!(event.payoutAccountNumber && event.payoutBankCode);
    if (!hasBankAccount) {
      return res.status(200).json({ hasBankAccount: false, bankAccount: null });
    }

    const maskedNumber =
      event.payoutAccountNumber &&
      "****" + event.payoutAccountNumber.slice(-4);

    return res.status(200).json({
      hasBankAccount: true,
      bankAccount: {
        bankCode: event.payoutBankCode,
        bankName: event.payoutBankName,
        accountNumberMasked: maskedNumber,
        accountName: event.payoutAccountName,
        accountType: event.payoutAccountType,
      },
    });
  } catch (error) {
    return res
      .status(400)
      .json({ message: error.message || "Failed to get bank details" });
  }
};

/**
 * POST /api/v1/events/:eventId/bank-account/resolve
 * Resolve account number to get account name (Flutterwave name enquiry). Organizer only.
 * Body: { bankCode, accountNumber }
 * Returns: { accountName } for display ("Account name will appear after verification").
 */
exports.resolveAccountName = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user._id;
    await ensureOrganizer(eventId, userId);

    const { bankCode, accountNumber } = req.body;
    if (!bankCode || !accountNumber) {
      return res.status(400).json({
        message: "bankCode and accountNumber are required",
      });
    }

    const trimmedAccountNumber = String(accountNumber).replace(/\s/g, "");
    const response = await flutterwaveService.resolveAccount({
      account_bank: bankCode,
      account_number: trimmedAccountNumber,
      country: "NG",
    });

    if (response.status === "error" || !response.data) {
      return res.status(400).json({
        message: response.message || "Could not resolve account details",
      });
    }

    const accountName = response.data.account_name || null;
    return res.status(200).json({
      accountNumber: trimmedAccountNumber,
      accountName,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ message: error.message || "Account resolution failed" });
  }
};

/**
 * DELETE /api/v1/events/:eventId/bank-account
 * Remove bank account details for an event (organizer only). Clears payout fields.
 */
exports.deleteBankAccount = async (req, res) => {
  try {
    const eventId = req.params.id;
    const userId = req.user._id;
    await ensureOrganizer(eventId, userId);

    const event = await Event.findByIdAndUpdate(
      eventId,
      {
        payoutBankCode: null,
        payoutBankName: null,
        payoutAccountNumber: null,
        payoutAccountName: null,
        payoutAccountType: null,
      },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.status(200).json({
      message: "Bank account removed successfully",
    });
  } catch (error) {
    return res
      .status(400)
      .json({ message: error.message || "Failed to remove bank account" });
  }
};
