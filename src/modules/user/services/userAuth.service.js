const User = require("../models/UserProfile.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { generateOTP, sendEmail, generate2FASecret, verify2FACode } = require("../../../utils/otpUtils");


exports.signup = async (userData) => {
  // Check if user already exists
  console.log("service heree", userData)
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    throw new Error("User with this email already exists.");
  }

  // Create new user
  const user = new User(userData);

  // Generate OTP for account verification
  const otp = generateOTP();
  user.verificationOTP = otp;

  await user.save();

  await sendEmail(user.email, "welcomeEmail", {
    subject: "Welcome to Owambe ERP",
    body: "Thank you for signing up! We're excited to have you on board.",
    buttonText: "Get Started",
    buttonLink: "https://owambe-dashboard.vercel.app",
  });

  // Send OTP via email
 await sendEmail(user.email, "accountVerification", {
   subject: "Verify Your Account",
   body: "Your One-Time Password (OTP) to verify your account is:",
   otp: otp,
 });

  return user;
};

// Login a user

exports.login = async (email, password) => {
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password))) {
    throw new Error("Invalid email or password");
  }

  if (user.twoFactorEnabled) {
    // Return partial token for 2FA verification step
    const tempToken = jwt.sign(
      { userId: user._id, requires2FA: true },
      process.env.JWT_SECRET,
      { expiresIn: "5m" }
    );
    return { tempToken, twoFactorRequired: true };
  }

  // Generate final access token
  const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "2d",
  });

  return { user, accessToken };
};


// exports.login = async (email, password) => {
//   const user = await User.findOne({ email });
//   if (!user || !(await user.comparePassword(password))) {
//     throw new Error("Invalid email or password");
//   }
//   return user;
// };

// Forgot password
exports.forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("User with that email not found");

  const otp = generateOTP();
  user.resetPasswordOTP = otp; // Use dedicated field
  await user.save();

  // Send password reset email
  await sendEmail(user.email, "passwordReset", {
    subject: "Password Reset Request",
    body: "Your One-Time Password (OTP) to reset your password is:",
    otp: otp,
  });

  return { message: "Steps to reset password has been sent to email" };
};


//Reset password
exports.resetPassword = async (email, newPassword) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");


  // Check if the new password is the same as the old password
  const isNewPasswordSame = await bcrypt.compare(newPassword, user.password);
  if (isNewPasswordSame) {
    throw new Error("New password cannot be the same as the old password");
  }

  // Hash and save the new password
  user.password = newPassword;
  await user.save();

  return { message: "Password reset successfully" };
};

// Change password
exports.changePassword = async (email, oldPassword, newPassword) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");

  // Check if the old password matches the current password
  const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
  if (!isOldPasswordValid) {
    throw new Error("Old password is incorrect");
  }

  // Check if the new password is the same as the old password
  const isNewPasswordSame = await bcrypt.compare(newPassword, user.password);
  if (isNewPasswordSame) {
    throw new Error("New password cannot be the same as the old password");
  }

  // Hash and save the new password
  user.password = newPassword;
  await user.save();

  return { message: "Password changed successfully" };
};

// Verify account
exports.verifyAccount = async (email, otp) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");

  // Check verificationOTP, not resetPasswordOTP
  if (user.verificationOTP !== otp) throw new Error("Invalid OTP");

  user.isVerified = true;
  user.verificationOTP = undefined; // Clear the OTP
  await user.save();
  
  return { message: "Account verified successfully" };
};

exports.verifyForgotPassword = async (email, otp) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");

  // Check verificationOTP, not resetPasswordOTP
  if (user.resetPasswordOTP !== otp) throw new Error("Invalid OTP");

  user.isVerified = true;
  user.resetPasswordOTP = undefined;
  await user.save();
  
  return { message: "Account verified successfully" };
};

// In userAuth.service.js
exports.resendVerificationOTP = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("User not found");

  // Generate new OTP
  const otp = generateOTP();
  user.verificationOTP = otp;
  await user.save();

  // Resend OTP
  await sendEmail(user.email, "accountVerification", {
    subject: "Verify Your Account",
    body: "Your One-Time Password (OTP) to verify your account is:",
    otp: otp,
  });
  return { message: "New OTP sent to email" };
};

// Enable 2FA for a user
exports.enable2FA = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const secret = generate2FASecret();
  user.twoFactorSecret = secret.base32; // Store the secret key
  user.twoFactorEnabled = true; // Enable 2FA
  await user.save();

  return { secret: secret.base32, otpauthUrl: secret.otpauth_url };
};

// Verify 2FA code during login
exports.verify2FALogin = async (userId, token) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const isValid = verify2FACode(user.twoFactorSecret, token);
  if (!isValid) throw new Error("Invalid 2FA code");

  return { message: "2FA verification successful" };
};


// exports.verify2FALogin = async (userId, token) => {
//   const user = await User.findById(userId);
//   if (!user) throw new Error("User not found");

//   const isValid = verify2FACode(user.twoFactorSecret, token);
//   if (!isValid) throw new Error("Invalid 2FA code");

//   // Generate final access token after successful 2FA verification
//   const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
//     expiresIn: "2d",
//   });

//   return { user, accessToken };
// };

exports.getUserProfile = async (userId) => User.findById(userId);