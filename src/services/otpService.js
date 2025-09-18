const OTP = require("../models/OTP");
const emailService = require("./emailService");
const { generateOTP, getOTPExpiry } = require("../utils/helpers");
const { OTP_CONFIG, EMAIL_TYPES, MESSAGES } = require("../utils/constants");

class OTPService {
  /**
   * Generate and send OTP to email
   * @param {string} email - Recipient email
   * @param {string} name - Recipient name
   * @param {string} type - OTP type (verification, password_reset)
   * @param {object} metadata - Additional metadata (IP, user agent)
   * @returns {Promise<object>} Result object
   */
  async generateAndSendOTP(
    email,
    name,
    type = EMAIL_TYPES.VERIFICATION,
    metadata = {}
  ) {
    try {
      const emailLower = email.toLowerCase();

      // Check recent OTP requests to prevent spam
      const recentOTPCount = await OTP.getRecentOTPCount(emailLower, type, 5); // 5 minutes
      if (recentOTPCount >= 3) {
        throw new Error(
          "Too many OTP requests. Please wait 5 minutes before requesting again."
        );
      }

      // Generate new OTP
      const otpCode = generateOTP();

      // Delete any existing OTPs for this email and type
      await OTP.deleteUserOTPs(emailLower, type);

      // Create new OTP record
      const otpRecord = await OTP.createOTP(
        emailLower,
        otpCode,
        type,
        metadata
      );

      // Send email based on type
      let emailSent = false;

      switch (type) {
        case EMAIL_TYPES.VERIFICATION:
          emailSent = await emailService.sendOTPVerification(
            emailLower,
            otpCode,
            name
          );
          break;
        case EMAIL_TYPES.PASSWORD_RESET:
          emailSent = await emailService.sendPasswordReset(
            emailLower,
            otpCode,
            name
          );
          break;
        default:
          throw new Error("Invalid OTP type");
      }

      if (!emailSent) {
        // If email failed, delete the OTP record
        await OTP.findByIdAndDelete(otpRecord._id);
        throw new Error(MESSAGES.ERROR.EMAIL_SEND_ERROR);
      }

      console.log(`📱 OTP generated and sent for ${emailLower}: ${type}`);

      return {
        success: true,
        message: MESSAGES.SUCCESS.OTP_SENT,
        data: {
          email: emailLower,
          type,
          expiresAt: otpRecord.expiresAt,
          attemptsRemaining: OTP_CONFIG.MAX_ATTEMPTS,
        },
      };
    } catch (error) {
      console.error("OTP Generation Error:", error.message);
      throw error;
    }
  }

  /**
   * Verify OTP code
   * @param {string} email - Email address
   * @param {string} otp - OTP code to verify
   * @param {string} type - OTP type
   * @returns {Promise<object>} Verification result
   */
  async verifyOTP(email, otp, type = EMAIL_TYPES.VERIFICATION) {
    try {
      const emailLower = email.toLowerCase();

      // Find valid OTP
      const otpRecord = await OTP.findValidOTP(emailLower, otp, type);

      if (!otpRecord) {
        // Try to find any OTP record for this email/type to check attempts
        const anyOTP = await OTP.findOne({
          email: emailLower,
          type,
          isUsed: false,
        }).sort({ createdAt: -1 });

        if (anyOTP) {
          // Increment attempts
          await anyOTP.incrementAttempts();

          const attemptsLeft = OTP_CONFIG.MAX_ATTEMPTS - anyOTP.attempts;

          if (anyOTP.isExpired()) {
            throw new Error(MESSAGES.ERROR.OTP_EXPIRED);
          } else if (attemptsLeft <= 0) {
            throw new Error(MESSAGES.ERROR.OTP_ATTEMPTS_EXCEEDED);
          } else {
            throw new Error(
              `${MESSAGES.ERROR.INVALID_OTP} ${attemptsLeft} attempts remaining.`
            );
          }
        } else {
          throw new Error(MESSAGES.ERROR.INVALID_OTP);
        }
      }

      // Check if OTP can be used
      if (!otpRecord.canAttempt()) {
        if (otpRecord.isExpired()) {
          throw new Error(MESSAGES.ERROR.OTP_EXPIRED);
        } else if (otpRecord.isUsed) {
          throw new Error("OTP has already been used.");
        } else {
          throw new Error(MESSAGES.ERROR.OTP_ATTEMPTS_EXCEEDED);
        }
      }

      // Mark OTP as used
      await otpRecord.markAsUsed();

      console.log(`✅ OTP verified successfully for ${emailLower}: ${type}`);

      return {
        success: true,
        message: MESSAGES.SUCCESS.OTP_VERIFIED,
        data: {
          email: emailLower,
          type,
          verifiedAt: new Date(),
        },
      };
    } catch (error) {
      console.error("OTP Verification Error:", error.message);
      throw error;
    }
  }

  /**
   * Check OTP status (for frontend to show remaining attempts, expiry, etc.)
   * @param {string} email - Email address
   * @param {string} type - OTP type
   * @returns {Promise<object>} OTP status
   */
  async getOTPStatus(email, type = EMAIL_TYPES.VERIFICATION) {
    try {
      const emailLower = email.toLowerCase();

      const otpRecord = await OTP.findOne({
        email: emailLower,
        type,
        isUsed: false,
      }).sort({ createdAt: -1 });

      if (!otpRecord) {
        return {
          exists: false,
          canRequest: true,
        };
      }

      const now = new Date();
      const isExpired = otpRecord.isExpired();
      const attemptsLeft = OTP_CONFIG.MAX_ATTEMPTS - otpRecord.attempts;
      const canAttempt = attemptsLeft > 0 && !isExpired && !otpRecord.isUsed;

      return {
        exists: true,
        canAttempt,
        attemptsLeft,
        isExpired,
        isUsed: otpRecord.isUsed,
        expiresAt: otpRecord.expiresAt,
        createdAt: otpRecord.createdAt,
        canRequest: isExpired || otpRecord.isUsed || attemptsLeft <= 0,
      };
    } catch (error) {
      console.error("Get OTP Status Error:", error.message);
      throw error;
    }
  }

  /**
   * Resend OTP (if allowed)
   * @param {string} email - Email address
   * @param {string} name - Recipient name
   * @param {string} type - OTP type
   * @param {object} metadata - Additional metadata
   * @returns {Promise<object>} Result object
   */
  async resendOTP(email, name, type = EMAIL_TYPES.VERIFICATION, metadata = {}) {
    try {
      const status = await this.getOTPStatus(email, type);

      if (status.exists && !status.canRequest) {
        const timeLeft = Math.ceil(
          (status.expiresAt - new Date()) / (1000 * 60)
        );
        throw new Error(
          `Please wait ${timeLeft} minutes before requesting a new OTP.`
        );
      }

      // Generate and send new OTP
      return await this.generateAndSendOTP(email, name, type, metadata);
    } catch (error) {
      console.error("Resend OTP Error:", error.message);
      throw error;
    }
  }

  /**
   * Clean up expired OTPs (should be called periodically)
   * @returns {Promise<object>} Cleanup result
   */
  async cleanupExpiredOTPs() {
    try {
      const result = await OTP.deleteExpiredOTPs();

      if (result.deletedCount > 0) {
        console.log(`🧹 Cleaned up ${result.deletedCount} expired OTP records`);
      }

      return {
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      console.error("OTP Cleanup Error:", error.message);
      throw error;
    }
  }

  /**
   * Get OTP statistics for admin dashboard
   * @returns {Promise<object>} OTP statistics
   */
  async getOTPStats() {
    try {
      const stats = await OTP.aggregate([
        {
          $group: {
            _id: {
              type: "$type",
              date: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$createdAt",
                },
              },
            },
            count: { $sum: 1 },
            used: { $sum: { $cond: ["$isUsed", 1, 0] } },
            expired: {
              $sum: { $cond: [{ $lt: ["$expiresAt", new Date()] }, 1, 0] },
            },
            avgAttempts: { $avg: "$attempts" },
          },
        },
        {
          $group: {
            _id: "$_id.type",
            totalCount: { $sum: "$count" },
            totalUsed: { $sum: "$used" },
            totalExpired: { $sum: "$expired" },
            avgAttempts: { $avg: "$avgAttempts" },
            dailyStats: {
              $push: {
                date: "$_id.date",
                count: "$count",
                used: "$used",
                expired: "$expired",
              },
            },
          },
        },
      ]);

      // Also get current active OTPs
      const activeOTPs = await OTP.countDocuments({
        isUsed: false,
        expiresAt: { $gt: new Date() },
      });

      return {
        activeOTPs,
        statistics: stats,
        lastUpdated: new Date(),
      };
    } catch (error) {
      console.error("Get OTP Stats Error:", error.message);
      throw error;
    }
  }

  /**
   * Invalidate all OTPs for a user (useful when password is successfully reset)
   * @param {string} email - Email address
   * @param {string} type - OTP type to invalidate (optional)
   * @returns {Promise<object>} Result object
   */
  async invalidateUserOTPs(email, type = null) {
    try {
      const result = await OTP.deleteUserOTPs(email.toLowerCase(), type);

      console.log(`🚫 Invalidated ${result.deletedCount} OTPs for ${email}`);

      return {
        deletedCount: result.deletedCount,
      };
    } catch (error) {
      console.error("Invalidate OTPs Error:", error.message);
      throw error;
    }
  }

  /**
   * Check if user has pending OTP verification
   * @param {string} email - Email address
   * @param {string} type - OTP type
   * @returns {Promise<boolean>} Has pending OTP
   */
  async hasPendingOTP(email, type = EMAIL_TYPES.VERIFICATION) {
    try {
      const status = await this.getOTPStatus(email, type);
      return status.exists && status.canAttempt;
    } catch (error) {
      console.error("Check Pending OTP Error:", error.message);
      return false;
    }
  }
}

// Export singleton instance
module.exports = new OTPService();
