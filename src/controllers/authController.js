const User = require("../models/User");
const jwtConfig = require("../config/jwt");
const otpService = require("../services/otpService");
const locationService = require("../services/locationService");
const {
  hashPassword,
  comparePassword,
  formatResponse,
} = require("../utils/helpers");
const { MESSAGES, EMAIL_TYPES, USER_STATUS } = require("../utils/constants");

class AuthController {
  /**
   * Register new user
   */
  async register(req, res) {
    try {
      const { name, email, password, phone, zipCode, address, latitude, longitude } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res
          .status(400)
          .json(formatResponse(false, MESSAGES.ERROR.USER_EXISTS));
      }

      // Get coordinates for zip code
      // const coordinatesResult = await locationService.getCoordinates(zipCode);

      if (
        latitude == null ||
        longitude == null ||
        latitude == "" ||
        longitude == "" ||
        latitude == undefined ||
        longitude == undefined
      ) {
        return res
          .status(400)
          .json(
            formatResponse(false, "Please provide valid latitude and longitude")
          );
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const userData = {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        phone: phone.trim(),
        zipCode: zipCode.trim(),
        address: address?.trim(),
        coordinates: coordinatesResult.data,
        status: USER_STATUS.PENDING,
        isEmailVerified: false,
      };

      const user = new User(userData);
      await user.save();

      // Generate and send OTP
      const otpResult = await otpService.generateAndSendOTP(
        email,
        name,
        EMAIL_TYPES.VERIFICATION,
        {
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        }
      );

      console.log(`👤 New user registered: ${email}`);

      res.status(201).json(
        formatResponse(true, MESSAGES.SUCCESS.USER_REGISTERED, {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            status: user.status,
            isEmailVerified: user.isEmailVerified,
          },
          otp: {
            email: otpResult.data.email,
            expiresAt: otpResult.data.expiresAt,
          },
        })
      );
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Verify email with OTP
   */
  async verifyOTP(req, res) {
    try {
      const { email, otp } = req.body;

      // Verify OTP
      const verificationResult = await otpService.verifyOTP(
        email,
        otp,
        EMAIL_TYPES.VERIFICATION
      );

      if (!verificationResult.success) {
        return res
          .status(400)
          .json(
            formatResponse(
              false,
              verificationResult.message || MESSAGES.ERROR.INVALID_OTP
            )
          );
      }

      // Update user email verification status
      const user = await User.findByEmail(email);
      if (!user) {
        return res
          .status(404)
          .json(formatResponse(false, MESSAGES.ERROR.USER_NOT_FOUND));
      }

      user.isEmailVerified = true;
      await user.save();

      console.log(`✅ Email verified for user: ${email}`);

      res.json(
        formatResponse(true, MESSAGES.SUCCESS.OTP_VERIFIED, {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            status: user.status,
            isEmailVerified: user.isEmailVerified,
          },
        })
      );
    } catch (error) {
      console.error("OTP verification error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Resend OTP
   */
  async resendOTP(req, res) {
    try {
      const { email, type = EMAIL_TYPES.VERIFICATION } = req.body;

      // Check if user exists
      const user = await User.findByEmail(email);
      if (!user) {
        return res
          .status(404)
          .json(formatResponse(false, MESSAGES.ERROR.USER_NOT_FOUND));
      }

      // Check if user is already verified (for verification OTP)
      if (type === EMAIL_TYPES.VERIFICATION && user.isEmailVerified) {
        return res
          .status(400)
          .json(formatResponse(false, "Email is already verified"));
      }

      // Resend OTP
      const otpResult = await otpService.resendOTP(email, user.name, type, {
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });

      console.log(`📤 OTP resent to: ${email} (${type})`);

      res.json(
        formatResponse(true, MESSAGES.SUCCESS.OTP_SENT, {
          email: otpResult.data.email,
          type: otpResult.data.type,
          expiresAt: otpResult.data.expiresAt,
        })
      );
    } catch (error) {
      console.error("Resend OTP error:", error);
      res
        .status(400)
        .json(
          formatResponse(false, error.message || MESSAGES.ERROR.SERVER_ERROR)
        );
    }
  }

  /**
   * User login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        return res
          .status(401)
          .json(formatResponse(false, MESSAGES.ERROR.INVALID_CREDENTIALS));
      }

      // Check password
      const isPasswordValid = await comparePassword(password, user.password);
      if (!isPasswordValid) {
        return res
          .status(401)
          .json(formatResponse(false, MESSAGES.ERROR.INVALID_CREDENTIALS));
      }

      // Check if email is verified
      if (!user.isEmailVerified) {
        return res.status(403).json(
          formatResponse(false, "Please verify your email first", null, {
            requiresVerification: true,
            email: user.email,
          })
        );
      }

      // Check account status
      if (user.status === USER_STATUS.REJECTED) {
        return res
          .status(403)
          .json(formatResponse(false, MESSAGES.ERROR.ACCOUNT_REJECTED));
      }

      if (user.status === USER_STATUS.PENDING) {
        return res
          .status(403)
          .json(formatResponse(false, MESSAGES.ERROR.ACCOUNT_NOT_APPROVED));
      }

      // Generate tokens
      const tokens = jwtConfig.generateTokens(user);

      // Save refresh token
      await user.addRefreshToken(tokens.refreshToken);

      // Update last login
      user.lastLoginAt = new Date();
      await user.save();

      console.log(`🔐 User logged in: ${email}`);

      res.json(
        formatResponse(true, MESSAGES.SUCCESS.LOGIN_SUCCESS, {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            zipCode: user.zipCode,
            address: user.address,
            role: user.role,
            status: user.status,
            coordinates: user.coordinates,
            lastLoginAt: user.lastLoginAt,
          },
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          },
        })
      );
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(req, res) {
    try {
      // User and refresh token are validated by middleware
      const user = await User.findById(req.user.userId);

      // Generate new access token
      const tokens = jwtConfig.generateTokens(user);

      // Remove old refresh token and add new one
      await user.removeRefreshToken(req.refreshToken);
      await user.addRefreshToken(tokens.refreshToken);

      console.log(`🔄 Token refreshed for: ${user.email}`);

      res.json(
        formatResponse(true, "Token refreshed successfully", {
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
          },
        })
      );
    } catch (error) {
      console.error("Refresh token error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * User logout
   */
  async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      const user = await User.findById(req.user.userId);

      if (refreshToken && user) {
        await user.removeRefreshToken(refreshToken);
      }

      console.log(`👋 User logged out: ${req.user.email}`);

      res.json(formatResponse(true, MESSAGES.SUCCESS.LOGOUT_SUCCESS));
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Logout from all devices
   */
  async logoutAll(req, res) {
    try {
      const user = await User.findById(req.user.userId);
      await user.removeAllRefreshTokens();

      console.log(`🚪 User logged out from all devices: ${req.user.email}`);

      res.json(
        formatResponse(true, "Logged out from all devices successfully")
      );
    } catch (error) {
      console.error("Logout all error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Forgot password - send reset OTP
   */
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      // Check if user exists
      const user = await User.findByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not for security
        return res.json(
          formatResponse(
            true,
            "If the email exists, you will receive a password reset code"
          )
        );
      }

      // Generate and send password reset OTP
      await otpService.generateAndSendOTP(
        email,
        user.name,
        EMAIL_TYPES.PASSWORD_RESET,
        {
          ipAddress: req.ip,
          userAgent: req.get("User-Agent"),
        }
      );

      console.log(`🔑 Password reset OTP sent to: ${email}`);

      res.json(
        formatResponse(
          true,
          "If the email exists, you will receive a password reset code"
        )
      );
    } catch (error) {
      console.error("Forgot password error:", error);
      // Don't reveal specific error details for security
      res.json(
        formatResponse(
          true,
          "If the email exists, you will receive a password reset code"
        )
      );
    }
  }

  /**
   * Reset password with OTP
   */
  async resetPassword(req, res) {
    try {
      const { email, otp, newPassword } = req.body;

      // Verify OTP
      const verificationResult = await otpService.verifyOTP(
        email,
        otp,
        EMAIL_TYPES.PASSWORD_RESET
      );

      if (!verificationResult.success) {
        return res
          .status(400)
          .json(formatResponse(false, MESSAGES.ERROR.INVALID_OTP));
      }

      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        return res
          .status(404)
          .json(formatResponse(false, MESSAGES.ERROR.USER_NOT_FOUND));
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);
      user.password = hashedPassword;
      await user.save();

      // Invalidate all refresh tokens for security
      await user.removeAllRefreshTokens();

      // Clean up any remaining OTPs for this user
      await otpService.invalidateUserOTPs(email);

      console.log(`🔐 Password reset successfully for: ${email}`);

      res.json(formatResponse(true, MESSAGES.SUCCESS.PASSWORD_RESET));
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Change password (authenticated user)
   */
  async changePassword(req, res) {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.userId);

      // Verify current password
      const isCurrentPasswordValid = await comparePassword(
        currentPassword,
        user.password
      );
      if (!isCurrentPasswordValid) {
        return res
          .status(400)
          .json(formatResponse(false, "Current password is incorrect"));
      }

      // Check if new password is different
      const isSamePassword = await comparePassword(newPassword, user.password);
      if (isSamePassword) {
        return res
          .status(400)
          .json(
            formatResponse(
              false,
              "New password must be different from current password"
            )
          );
      }

      // Hash and update new password
      const hashedPassword = await hashPassword(newPassword);
      user.password = hashedPassword;
      await user.save();

      // Invalidate all refresh tokens except current session
      // In a more sophisticated system, you might keep current session active
      await user.removeAllRefreshTokens();

      console.log(`🔑 Password changed for: ${user.email}`);

      res.json(
        formatResponse(
          true,
          "Password changed successfully. Please login again."
        )
      );
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Get current user profile
   */
  async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.userId).select(
        "-password -refreshTokens"
      );

      if (!user) {
        return res
          .status(404)
          .json(formatResponse(false, MESSAGES.ERROR.USER_NOT_FOUND));
      }

      res.json(
        formatResponse(true, "Profile retrieved successfully", { user })
      );
    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Check authentication status
   */
  async checkAuth(req, res) {
    try {
      const user = await User.findById(req.user.userId).select(
        "name email role status isEmailVerified lastLoginAt"
      );

      res.json(
        formatResponse(true, "Authentication valid", {
          user,
          authenticated: true,
        })
      );
    } catch (error) {
      console.error("Check auth error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Get OTP status for frontend
   */
  async getOTPStatus(req, res) {
    try {
      const { email, type = EMAIL_TYPES.VERIFICATION } = req.query;

      if (!email) {
        return res.status(400).json(formatResponse(false, "Email is required"));
      }

      const status = await otpService.getOTPStatus(email, type);

      res.json(formatResponse(true, "OTP status retrieved", status));
    } catch (error) {
      console.error("Get OTP status error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }
}

module.exports = new AuthController();
