const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { userGender } = require("../../../utils/constantEnums");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    middleName: {
      type: String,
      default: "",
    },
    fullName: {
      type: String,
    },
    surname: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      required: true,
      enum: Object.values(userGender),
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      default: "",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      default: "",
    },
    verificationOTP: { 
      type: String 
    },
    resetPasswordOTP: { 
      type: String 
    },
    profilePicture: [
      {
        name: { type: String },
        size: { type: Number },
        type: { type: String },
        link: { type: String },
      },
    ],

  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
