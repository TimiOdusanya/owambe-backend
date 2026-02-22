const Event = require("../../admin/models/Event");
const flutterwaveService = require("./flutterwave.service");
const walletService = require("./wallet.service");

const createTransferRef = () =>
  `owambe_wd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * Initiate withdrawal: transfer from event wallet to a bank account.
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
  const response = await flutterwaveService.initiateTransfer({
    account_bank,
    account_number,
    amount: Math.round(amount * 100) / 100,
    narration: `Owambe payout: ${event.title || eventId}`,
    reference,
    callback_url: callback_url || "",
  });

  if (response.status === "error" || !response.data) {
    throw new Error(response.message || "Transfer initiation failed");
  }

  const transferId = response.data.id;
  const transferRef = response.data.reference || reference;

  const description = useCustomBank
    ? `Withdrawal to ${account_name || account_number}`
    : `Withdrawal to ${event.payoutAccountName || "bank account"}`;

  await walletService.debitForTransfer(eventId, amount, transferRef, description);

  return {
    success: true,
    transfer_id: transferId,
    reference: transferRef,
    amount,
    message: response.message || "Transfer queued",
  };
};

module.exports = {
  initiateWithdrawal,
  createTransferRef,
};
