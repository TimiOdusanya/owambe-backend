const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/payment.controller");
const walletController = require("../controllers/wallet.controller");
const { authenticate } = require("../../../middleware/authMiddleware");

router.get("/banks", paymentController.getBanks);
router.post("/initiate", paymentController.initiatePayment);
router.post("/create-link", paymentController.createPaymentLink);
router.post("/submit-pin", paymentController.submitPin);
router.post("/validate", paymentController.validateCharge);
router.get("/verify/:tx_ref", paymentController.verifyPayment);
router.post("/webhook", paymentController.webhook);
router.get("/purchases/:eventId", paymentController.getPurchases);

router.get("/wallet/summary", authenticate, walletController.getWalletSummary);
router.get("/wallet/transactions", authenticate, walletController.getAllTransactions);
router.get("/wallet/:eventId", authenticate, walletController.getWallet);
router.get("/wallet/:eventId/transactions", authenticate, walletController.getTransactions);
router.post("/wallet/:eventId/topup", authenticate, walletController.topupWallet);
router.post("/wallet/:eventId/withdraw", authenticate, walletController.withdraw);

module.exports = router;
