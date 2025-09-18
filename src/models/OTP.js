const mongoose = require("mongoose");
const { OTP_CONFIG, EMAIL_TYPES } = require("../utils/constants");

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email"],
    },
    otp: {
      type: String,
      required: [true, "OTP is required"],
      length: [OTP_CONFIG.LENGTH, `OTP must be ${OTP_CONFIG.LENGTH} digits`],
    },
    type: {
      type: String,
      enum: Object.values(EMAIL_TYPES),
      required: [true, "OTP type is required"],
      default: EMAIL_TYPES.VERIFICATION,
    },
    expiresAt: {
      type: Date,
      required: true,
      default: function () {
        return new Date(Date.now() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000);
      },
    },
    attempts: {
      type: Number,
      default: 0,
      max: [
        OTP_CONFIG.MAX_ATTEMPTS,
        `Maximum ${OTP_CONFIG.MAX_ATTEMPTS} attempts allowed`,
      ],
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
otpSchema.index({ email: 1, type: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
otpSchema.index({ createdAt: -1 });

// Instance methods
otpSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

otpSchema.methods.incrementAttempts = function () {
  this.attempts += 1;
  return this.save();
};

otpSchema.methods.markAsUsed = function () {
  this.isUsed = true;
  return this.save();
};

otpSchema.methods.canAttempt = function () {
  return (
    this.attempts < OTP_CONFIG.MAX_ATTEMPTS && !this.isUsed && !this.isExpired()
  );
};

// Static methods
otpSchema.statics.findValidOTP = function (
  email,
  otp,
  type = EMAIL_TYPES.VERIFICATION
) {
  return this.findOne({
    email: email.toLowerCase(),
    otp,
    type,
    isUsed: false,
    expiresAt: { $gt: new Date() },
    attempts: { $lt: OTP_CONFIG.MAX_ATTEMPTS },
  });
};

otpSchema.statics.createOTP = function (
  email,
  otp,
  type = EMAIL_TYPES.VERIFICATION,
  metadata = {}
) {
  return this.create({
    email: email.toLowerCase(),
    otp,
    type,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
  });
};

otpSchema.statics.deleteExpiredOTPs = function () {
  return this.deleteMany({
    $or: [
      { expiresAt: { $lt: new Date() } },
      { isUsed: true },
      { attempts: { $gte: OTP_CONFIG.MAX_ATTEMPTS } },
    ],
  });
};

otpSchema.statics.deleteUserOTPs = function (email, type) {
  const query = { email: email.toLowerCase() };
  if (type) {
    query.type = type;
  }
  return this.deleteMany(query);
};

otpSchema.statics.getRecentOTPCount = function (email, type, timeWindow = 5) {
  const timeLimit = new Date(Date.now() - timeWindow * 60 * 1000);
  return this.countDocuments({
    email: email.toLowerCase(),
    type,
    createdAt: { $gte: timeLimit },
  });
};

// Pre-save middleware to ensure only one active OTP per email/type
otpSchema.pre("save", async function (next) {
  if (this.isNew) {
    // Delete any existing OTPs for this email and type
    await this.constructor.deleteMany({
      email: this.email,
      type: this.type,
      _id: { $ne: this._id },
    });
  }
  next();
});

module.exports = mongoose.model("OTP", otpSchema);
