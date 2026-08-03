const Event = require("../../admin/models/Event");
const flutterwaveService = require("./flutterwave.service");
const walletService = require("./wallet.service");

const createTransferRef = () =>
  `owambe_wd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * Turn a raw Flutterwave error message into a clear, actionable one.
 * Surfaces the IP-whitelisting requirement, since Flutterwave's own message
 * for it ("This request cannot be processed. Please contact your account
 * administrator") never mentions the word "whitelist".
 */
const buildTransferError = (raw) => {
  const message = raw || "Transfer initiation failed";
  const isIpWhitelist =
    /ip\s*whitelisting|whitelist/i.test(message) ||
    /cannot be processed.*contact your account administrator/i.test(message);
  if (isIpWhitelist) {
    return new Error(
      "Flutterwave requires IP whitelisting for transfers. " +
      "To fix: log into your Flutterwave dashboard → Settings → Whitelisted IP addresses, and add your " +
      "production server's outbound IP address (verify via OTP). Transfers will keep failing until this is done."
    );
  }
  return new Error(message);
};

/**
 * Call Flutterwave's Transfer API. Does NOT touch the wallet — callers decide
 * how/when to record the ledger entry based on the outcome.
 */
const callTransfer = async ({ account_bank, account_number, amount, narration, reference, callback_url }) => {
  const response = await flutterwaveService.initiateTransfer({
    account_bank,
    account_number,
    amount: Math.round(amount * 100) / 100,
    narration,
    reference,
    // Do NOT send an empty string: the Flutterwave SDK's Joi schema rejects
    // callback_url: "" and throws synchronously before the transfer is ever attempted.
    ...(callback_url ? { callback_url } : {}),
  });

  if (response.status === "error" || !response.data) {
    throw buildTransferError(response.message);
  }

  return {
    success: true,
    transfer_id: response.data.id,
    reference: response.data.reference || reference,
    amount,
    message: response.message || "Transfer queued",
  };
};

/**
 * Manual, organizer-triggered withdrawal from event wallet to a bank account.
 * Caller must ensure the requesting user is the event organizer.
 * If bankCode, accountNumber (and optionally accountName) are provided, use those for this transfer (organiser's choice of bank).
 * Otherwise use the event's saved payout bank account.
 */
const initiateWithdrawal = async (
  eventId,
  amount,
  { callback_url, bankCode, accountNumber, accountName } = {}
) => {
  const event = await Event.findById(eventId).select(
    "organizerId title payoutBankCode payoutAccountNumber payoutAccountName"
  );
  if (!event) throw new Error("Event not found");

  const useCustomBank = bankCode && accountNumber;
  const account_bank = useCustomBank ? bankCode : event.payoutBankCode;
  const account_number = useCustomBank ? String(accountNumber).replace(/\s/g, "") : event.payoutAccountNumber;
  const account_name = useCustomBank ? accountName : event.payoutAccountName;

  if (!account_bank || !account_number) {
    throw new Error(
      useCustomBank
        ? "bankCode and accountNumber are required for custom bank withdrawal"
        : "Event has no payout bank account. Add bank details in event settings or pass bankCode and accountNumber for this withdrawal."
    );
  }

  const hasBalance = await walletService.getBalance(eventId);
  if (hasBalance.balance < amount) {
    throw new Error("Insufficient wallet balance");
  }

  const reference = createTransferRef();
  const result = await callTransfer({
    account_bank,
    account_number,
    amount,
    narration: `Owambe payout: ${event.title || eventId}`,
    reference,
    callback_url,
  });

  const description = useCustomBank
    ? `Withdrawal to ${account_name || account_number}`
    : `Withdrawal to ${event.payoutAccountName || "bank account"}`;

  await walletService.debitForTransfer(eventId, amount, result.reference, description);

  return result;
};

module.exports = {
  initiateWithdrawal,
  createTransferRef,
};
