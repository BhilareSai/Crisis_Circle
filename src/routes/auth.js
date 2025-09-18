const express = require("express");
const router = express.Router();

// Controllers
const authController = require("../controllers/authController");

// Middleware
const { authenticateToken, verifyRefreshToken } = require("../middleware/auth");
const { validate } = require("../utils/validators");
const { userValidation } = require("../utils/validators");
const {
  authLimiter,
  otpLimiter,
  passwordResetLimiter,
  emailLimiter,
} = require("../middleware/rateLimiter");

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post(
  "/register",
  authLimiter,
  validate(userValidation.register),
  authController.register
);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify email with OTP
 * @access  Public
 */
router.post(
  "/verify-otp",
  otpLimiter,
  validate(userValidation.verifyOTP),
  authController.verifyOTP
);

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP for email verification
 * @access  Public
 */
router.post(
  "/resend-otp",
  otpLimiter,
  validate(userValidation.resendOTP),
  authController.resendOTP
);

/**
 * @route   POST /api/auth/login
 * @desc    User login
 * @access  Public
 */
router.post(
  "/login",
  authLimiter,
  validate(userValidation.login),
  authController.login
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refresh access token
 * @access  Public (but requires valid refresh token)
 */
router.post(
  "/refresh-token",
  authLimiter,
  verifyRefreshToken,
  authController.refreshToken
);

/**
 * @route   POST /api/auth/logout
 * @desc    User logout (invalidate refresh token)
 * @access  Private
 */
router.post("/logout", authenticateToken, authController.logout);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all devices
 * @access  Private
 */
router.post("/logout-all", authenticateToken, authController.logoutAll);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset OTP
 * @access  Public
 */
router.post(
  "/forgot-password",
  passwordResetLimiter,
  validate(userValidation.forgotPassword),
  authController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with OTP
 * @access  Public
 */
router.post(
  "/reset-password",
  passwordResetLimiter,
  validate(userValidation.resetPassword),
  authController.resetPassword
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password (authenticated user)
 * @access  Private
 */
router.post(
  "/change-password",
  authenticateToken,
  validate(userValidation.changePassword),
  authController.changePassword
);

/**
 * @route   GET /api/auth/profile
 * @desc    Get current user profile
 * @access  Private
 */
router.get("/profile", authenticateToken, authController.getProfile);

/**
 * @route   GET /api/auth/check
 * @desc    Check authentication status
 * @access  Private
 */
router.get("/check", authenticateToken, authController.checkAuth);

/**
 * @route   GET /api/auth/otp-status
 * @desc    Get OTP status for email
 * @access  Public
 */
router.get("/otp-status", emailLimiter, authController.getOTPStatus);

module.exports = router;
