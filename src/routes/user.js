const express = require("express");
const router = express.Router();

// Controllers
const userController = require("../controllers/userController");

// Middleware
const { authenticateToken } = require("../middleware/auth");
const { validate } = require("../utils/validators");
const { userValidation, queryValidation } = require("../utils/validators");
const { generalLimiter, searchLimiter } = require("../middleware/rateLimiter");

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/user/dashboard
 * @desc    Get user dashboard with personalized content
 * @access  Private
 */
router.get("/dashboard", userController.getDashboard);

/**
 * @route   PUT /api/user/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  "/profile",
  validate(userValidation.updateProfile),
  userController.updateProfile
);

/**
 * @route   GET /api/user/requests
 * @desc    Get user's help requests
 * @access  Private
 */
router.get(
  "/requests",
  validate(queryValidation.pagination, "query"),
  userController.getMyRequests
);

/**
 * @route   GET /api/user/donations
 * @desc    Get user's donations (requests they've approved)
 * @access  Private
 */
router.get(
  "/donations",
  validate(queryValidation.pagination, "query"),
  userController.getMyDonations
);

/**
 * @route   GET /api/user/nearby-requests
 * @desc    Get nearby help requests for user
 * @access  Private
 */
router.get(
  "/nearby-requests",
  searchLimiter,
  validate(queryValidation.search, "query"),
  userController.getNearbyRequests
);

/**
 * @route   GET /api/user/notifications
 * @desc    Get user notifications (unread announcements)
 * @access  Private
 */
router.get(
  "/notifications",
  validate(queryValidation.pagination, "query"),
  userController.getNotifications
);

/**
 * @route   PUT /api/user/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put(
  "/notifications/:notificationId/read",
  userController.markNotificationRead
);

/**
 * @route   PUT /api/user/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put("/notifications/read-all", userController.markAllNotificationsRead);

/**
 * @route   GET /api/user/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get("/stats", userController.getUserStats);

/**
 * @route   DELETE /api/user/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete("/account", generalLimiter, userController.deleteAccount);

/**
 * @route   GET /api/user/activity
 * @desc    Get user activity feed
 * @access  Private
 */
router.get(
  "/activity",
  validate(queryValidation.pagination, "query"),
  userController.getActivityFeed
);

module.exports = router;
