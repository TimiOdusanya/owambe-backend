const express = require("express");
const {
  signup,
  login,
  forgotPassword,
  changePassword,
  resetPassword,
  verifyAccount,
  enable2FA,
  verify2FALogin,
  resendVerificationOTP,
  logout,
  getUserProfile,
  verifyForgotPassword,
  updateProfile,
} = require("../controllers/userAuth.controller");
const { authenticate, check2FA } = require("../../../middleware/authMiddleware");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
// router.put("/change-password", changePassword);
// router.post("/two-factor-auth", enable2FA);
router.put("/reset-password", resetPassword);
router.post("/verify", verifyAccount);
router.post("/verify-forgot-password", verifyForgotPassword);
router.post("/resend-verification", resendVerificationOTP);
router.post("/verify-2fa", verify2FALogin);
router.post("/logout", logout);


// Protected routes
router.put('/change-password', authenticate, check2FA, changePassword);
router.patch('/update-profile', authenticate, check2FA, updateProfile);
router.post('/two-factor-auth', authenticate, check2FA, enable2FA);
router.get('/user-profile', authenticate, check2FA, getUserProfile);



module.exports = router;
