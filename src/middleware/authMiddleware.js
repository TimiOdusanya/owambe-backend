const jwt = require("jsonwebtoken");
const User = require("../modules/user/models/UserProfile.model")

exports.authenticate = async (req, res, next) => {
  try {
    // Get token from cookies or Authorization header
    const token = req.cookies?.jwt || req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - Please log in" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ message: "Unauthorized - Invalid token" });
  }
};

exports.check2FA = (req, res, next) => {
  if (req.user.twoFactorEnabled && !req.session.twoFactorVerified) {
    return res.status(403).json({
      message: "2FA verification required",
      twoFactorRequired: true,
    });
  }
  next();
};
