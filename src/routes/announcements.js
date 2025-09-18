const express = require("express");
const router = express.Router();

// Controllers
const announcementController = require("../controllers/announcementController");

// Middleware
const { authenticateToken, optionalAuth } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/adminAuth");
const { validate } = require("../utils/validators");
const {
  announcementValidation,
  queryValidation,
} = require("../utils/validators");
const { generalLimiter, adminLimiter } = require("../middleware/rateLimiter");

/**
 * @route   GET /api/announcements
 * @desc    Get active announcements
 * @access  Public (filtered by user status if authenticated)
 */
router.get(
  "/",
  optionalAuth, // Optional authentication to determine user status
  validate(queryValidation.pagination, "query"),
  announcementController.getAnnouncements
);

/**
 * @route   GET /api/announcements/:announcementId
 * @desc    Get announcement by ID
 * @access  Public
 */
router.get(
  "/:announcementId",
  optionalAuth, // Optional authentication for tracking reads
  announcementController.getAnnouncement
);

/**
 * @route   POST /api/announcements/:announcementId/read
 * @desc    Mark announcement as read for current user
 * @access  Private
 */
router.post(
  "/:announcementId/read",
  authenticateToken,
  generalLimiter,
  announcementController.markAsRead
);

/**
 * @route   POST /api/announcements/:announcementId/click
 * @desc    Track announcement click
 * @access  Public
 */
router.post(
  "/:announcementId/click",
  generalLimiter,
  announcementController.trackClick
);

// Admin routes - require authentication and admin role
router.use("/admin", authenticateToken);
router.use("/admin", requireAdmin);
router.use("/admin", adminLimiter);

/**
 * @route   GET /api/announcements/admin/all
 * @desc    Get all announcements for admin management
 * @access  Admin
 */
router.get(
  "/admin/all",
  validate(queryValidation.pagination, "query"),
  announcementController.getAllForAdmin
);

/**
 * @route   POST /api/announcements/admin/create
 * @desc    Create announcement (Admin only)
 * @access  Admin
 */
router.post(
  "/admin/create",
  validate(announcementValidation.create),
  announcementController.createAnnouncement
);

/**
 * @route   PUT /api/announcements/admin/:announcementId
 * @desc    Update announcement (Admin only)
 * @access  Admin
 */
router.put(
  "/admin/:announcementId",
  validate(announcementValidation.update),
  announcementController.updateAnnouncement
);

/**
 * @route   DELETE /api/announcements/admin/:announcementId
 * @desc    Delete announcement (Admin only)
 * @access  Admin
 */
router.delete(
  "/admin/:announcementId",
  announcementController.deleteAnnouncement
);

/**
 * @route   PUT /api/announcements/admin/:announcementId/pin
 * @desc    Pin/unpin announcement (Admin only)
 * @access  Admin
 */
router.put("/admin/:announcementId/pin", announcementController.togglePin);

/**
 * @route   PUT /api/announcements/admin/:announcementId/active
 * @desc    Activate/deactivate announcement (Admin only)
 * @access  Admin
 */
router.put(
  "/admin/:announcementId/active",
  announcementController.toggleActive
);

/**
 * @route   GET /api/announcements/admin/statistics
 * @desc    Get announcement statistics (Admin only)
 * @access  Admin
 */
router.get("/admin/statistics", announcementController.getStatistics);

/**
 * @route   POST /api/announcements/admin/cleanup-expired
 * @desc    Clean up expired announcements (Admin only)
 * @access  Admin
 */
router.post("/admin/cleanup-expired", announcementController.cleanupExpired);

module.exports = router;
