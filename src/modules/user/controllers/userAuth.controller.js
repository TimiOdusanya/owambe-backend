const authService = require("../services/userAuth.service");

// Signup
exports.signup = async (req, res) => {
  try {
    console.log("gotten here")
    const user = await authService.signup(req.body);
    res.status(201).json({ message: "User created successfully", user });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Login
// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     const user = await authService.login(email, password);
//     res.status(200).json({ message: "Login successful", user });
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    if (result.twoFactorRequired) {
      return res.status(202).json({
        message: "2FA verification required",
        tempToken: result.tempToken,
      });
    }

    // Set HTTP-only cookie
    res.cookie("jwt", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "development",
      // secure: process.env.NODE_ENV === "production",
      maxAge: 2 * 24 * 60 * 60 * 1000, // 2 days
      sameSite: "strict",
    });

    res.status(200).json({
      message: "Login successful",
      user: result.user,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};



// Forgot password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Rest password
exports.resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    const result = await authService.resetPassword(email, newPassword);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
// Change password
// controllers/userAuth.controller.js
exports.changePassword = async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;
    const result = await authService.changePassword(email, oldPassword, newPassword);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Verify account
exports.verifyAccount = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const result = await authService.verifyAccount(email, otp);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// In userAuth.controller.js
exports.resendVerificationOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const result = await authService.resendVerificationOTP(email);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.enable2FA = async (req, res) => {
  try {
    const { userId } = req.body;
    const result = await authService.enable2FA(userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await authService.getUserProfile(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Verify 2FA during login
exports.verify2FALogin = async (req, res) => {
  try {
    const { userId, token } = req.body;
    const result = await authService.verify2FALogin(userId, token);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


// Verify 2FA Login controller
// exports.verify2FALogin = async (req, res) => {
//   try {
//     const { tempToken, token } = req.body;
    
//     // Verify temp token
//     const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
//     if (!decoded.requires2FA) {
//       throw new Error('Invalid verification flow');
//     }

//     const result = await authService.verify2FALogin(decoded.userId, token);

//     // Set final HTTP-only cookie
//     res.cookie('jwt', result.accessToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       maxAge: 2 * 24 * 60 * 60 * 1000, // 2 days
//       sameSite: 'strict'
//     });

//     res.status(200).json({ 
//       message: "2FA verification successful", 
//       user: result.user 
//     });
//   } catch (error) {
//     res.status(400).json({ message: error.message });
//   }
// };


exports.logout = (req, res) => {
  res.clearCookie("jwt");
  res.status(200).json({ message: "Logged out successfully" });
};