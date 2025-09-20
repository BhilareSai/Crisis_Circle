const express = require("express");
const router = express.Router();

// Controllers
const adminController = require("../controllers/adminController");

// Middleware
const { authenticateToken } = require("../middleware/auth");
const {
  requireAdmin,
  logAdminAction,
  canModifyUser,
  validateBulkOperation,
  logSuccessfulAdminAction,
} = require("../middleware/adminAuth");
const { validate } = require("../utils/validators");
const { adminValidation, queryValidation } = require("../utils/validators");
const { adminLimiter } = require("../middleware/rateLimiter");

// Apply admin authentication and logging to all routes
router.use(authenticateToken);
router.use(requireAdmin);
router.use(adminLimiter);
router.use(logSuccessfulAdminAction);

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get dashboard statistics
 * @access  Admin
 */
router.get(
  "/dashboard",
  logAdminAction("view_dashboard"),
  adminController.getDashboardStats
);

/**
 * @route   GET /api/admin/users/pending
 * @desc    Get pending users for approval
 * @access  Admin
 */
router.get(
  "/users/pending",
  validate(queryValidation.pagination, "query"),
  logAdminAction("view_pending_users"),
  adminController.getPendingUsers
);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users with filtering
 * @access  Admin
 */
// router.get(
//   "/users",
//   validate(queryValidation.pagination, "query"),
//   logAdminAction("view_all_users"),
//   adminController.getAllUsers
// );
router.get(
  "/users/all",
  // validate(queryValidation.userFilters, "query"), // We'll need to create this validation
  logAdminAction("view_all_users_comprehensive"),
  adminController.getAllUsersComprehensive
);

/**
 * @route   PUT /api/admin/users/:userId/approve
 * @desc    Approve user account
 * @access  Admin
 */
router.put(
  "/users/:userId/approve",
  canModifyUser,
  validate(adminValidation.approveUser, "body"),
  logAdminAction("approve_user"),
  adminController.approveUser
);

/**
 * @route   PUT /api/admin/users/:userId/reject
 * @desc    Reject user account
 * @access  Admin
 */
router.put(
  "/users/:userId/reject",
  canModifyUser,
  validate(adminValidation.rejectUser, "body"),
  logAdminAction("reject_user"),
  adminController.rejectUser
);

/**
 * @route   POST /api/admin/users/bulk-update
 * @desc    Bulk approve/reject users
 * @access  Admin
 */
router.post(
  "/users/bulk-update",
  validateBulkOperation(50),
  logAdminAction("bulk_update_users"),
  adminController.bulkUpdateUsers
);

/**
 * @route   GET /api/admin/help-items
 * @desc    Get help items with management capabilities
 * @access  Admin
 */
router.get(
  "/help-items",
  validate(queryValidation.pagination, "query"),
  logAdminAction("view_help_items"),
  adminController.getHelpItems
);

/**
 * @route   POST /api/admin/help-items
 * @desc    Create new help item
 * @access  Admin
 */
router.post(
  "/help-items",
  validate(adminValidation.createHelpItem),
  logAdminAction("create_help_item"),
  adminController.createHelpItem
);

/**
 * @route   PUT /api/admin/help-items/:itemId
 * @desc    Update help item
 * @access  Admin
 */
router.put(
  "/help-items/:itemId",
  validate(adminValidation.updateHelpItem),
  logAdminAction("update_help_item"),
  adminController.updateHelpItem
);

/**
 * @route   DELETE /api/admin/help-items/:itemId
 * @desc    Delete help item
 * @access  Admin
 */
router.delete(
  "/help-items/:itemId",
  logAdminAction("delete_help_item"),
  adminController.deleteHelpItem
);

/**
 * @route   POST /api/admin/help-items/seed
 * @desc    Seed default help items
 * @access  Admin
 */
router.post(
  "/help-items/seed",
  logAdminAction("seed_help_items"),
  adminController.seedHelpItems
);

/**
 * @route   GET /api/admin/location-stats
 * @desc    Get location-based statistics
 * @access  Admin
 */
router.get(
  "/location-stats",
  logAdminAction("view_location_stats"),
  adminController.getLocationStats
);

/**
 * @route   GET /api/admin/system-health
 * @desc    Get system health status
 * @access  Admin
 */
router.get(
  "/system-health",
  logAdminAction("view_system_health"),
  adminController.getSystemHealth
);

/**
 * @route   DELETE /api/admin/users/rejected
 * @desc    Delete rejected users
 * @access  Admin
 */
router.delete(
  "/users/rejected",
  validate(adminValidation.deleteRejectedUsers, "body"),
  logAdminAction("delete_rejected_users"),
  adminController.deleteRejectedUsers
);

module.exports = router;
