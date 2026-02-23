/**
 * Flutterwave V3 API integration.
 * Handles card charge (with encryption), bank transfer, OTP validation, and transaction verification.
 */

const Flutterwave = require("flutterwave-node-v3");

const getClient = () => {
  const publicKey = process.env.FLW_PUBLIC_KEY;
  const secretKey = process.env.FLW_SECRET_KEY;
  if (!publicKey || !secretKey) {
    throw new Error("FLW_PUBLIC_KEY and FLW_SECRET_KEY must be set");
  }
  const baseUrl = process.env.FLW_BASE_URL;
  return new Flutterwave(publicKey, secretKey, baseUrl || undefined);
};

const getEncryptionKey = () => {
  const key = process.env.FLW_ENCRYPTION_KEY;
  if (!key) throw new Error("FLW_ENCRYPTION_KEY must be set");
  return key;
};

/**
 * Initiate card charge. Payload must include card details; will be encrypted by SDK.
 * @param {Object} payload - { card_number, expiry_month, expiry_year, cvv, amount, currency, email, fullname, phone_number, tx_ref, redirect_url, enckey }
 * @returns {Promise<Object>} Flutterwave charge response (may require OTP, PIN, redirect, or be successful)
 */
const chargeCard = async (payload) => {
  const flw = getClient();
  const enckey = getEncryptionKey();
  const fullPayload = { ...payload, enckey };
  const response = await flw.Charge.card(fullPayload);
  return response;
};

/**
 * Authorize card charge with PIN (second call to charge endpoint with authorization).
 * @param {Object} payload - Original charge payload plus authorization: { ...original, authorization: { mode: 'pin', pin: '...' } }
 */
const chargeCardWithAuthorization = async (payload) => {
  const flw = getClient();
  const enckey = getEncryptionKey();
  const fullPayload = { ...payload, enckey };
  const response = await flw.Charge.card(fullPayload);
  return response;
};

/**
 * Initiate bank transfer charge (NGN). Returns account details for customer to pay into.
 * @param {Object} details - { tx_ref, amount, currency, email, fullname, phone_number }
 */
const chargeBankTransfer = async (details) => {
  const flw = getClient();
  const response = await flw.Charge.bank_transfer(details);
  return response;
};

/**
 * Validate charge (e.g. OTP sent to customer).
 * @param {Object} params - { otp, flw_ref }
 */
const validateCharge = async (params) => {
  const flw = getClient();
  const response = await flw.Charge.validate(params);
  return response;
};

/**
 * Verify transaction by ID (use after validate or redirect).
 * @param {number} transactionId - Flutterwave transaction id (data.id from charge/validate response)
 */
const verifyTransaction = async (transactionId) => {
  const flw = getClient();
  const response = await flw.Transaction.verify({ id: transactionId });
  return response;
};

/**
 * Verify transaction by tx_ref (e.g. for bank transfer or when id not yet stored).
 * @param {string} txRef - Transaction reference (tx_ref)
 */
const verifyTransactionByTxRef = async (txRef) => {
  const flw = getClient();
  const response = await flw.Transaction.verify_by_tx({ tx_ref: txRef });
  return response;
};

/**
 * Get list of banks for a country (e.g. NG for Nigeria). Used for "Select your bank" dropdown.
 * @param {string} country - ISO country code, e.g. "NG"
 * @returns {Promise<Object>} { data: [ { code, name, ... }, ... ] }
 */
const getBanks = async (country = "NG") => {
  const flw = getClient();
  const response = await flw.Bank.country({ country });
  return response;
};

/**
 * Resolve bank account to get account holder name (NGN).
 * @param {Object} params - { account_bank (bank code), account_number, country? }
 * @returns {Promise<Object>} { account_number, account_name, ... }
 */
const resolveAccount = async (params) => {
  const flw = getClient();
  const payload = {
    account_bank: params.account_bank,
    account_number: params.account_number,
    country: params.country || "NG",
  };
  const response = await flw.Misc.verify_Account(payload);
  return response;
};

/**
 * Initiate transfer to a Nigerian bank account (payout to event admin).
 * Money is debited from your Flutterwave balance.
 * @param {Object} params - { account_bank, account_number, amount, narration, reference, callback_url? }
 */
const initiateTransfer = async (params) => {
  const flw = getClient();
  const payload = {
    account_bank: params.account_bank,
    account_number: params.account_number,
    amount: Number(params.amount),
    currency: "NGN",
    narration: params.narration || "Owambe payout",
    reference: params.reference,
    callback_url: params.callback_url || "",
  };
  const response = await flw.Transfer.initiate(payload);
  return response;
};

module.exports = {
  chargeCard,
  chargeCardWithAuthorization,
  chargeBankTransfer,
  validateCharge,
  verifyTransaction,
  verifyTransactionByTxRef,
  getBanks,
  resolveAccount,
  initiateTransfer,
  getEncryptionKey,
};
