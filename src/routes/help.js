const express = require("express");
const router = express.Router();

// Controllers
const helpController = require("../controllers/helpController");

// Middleware
const {
  authenticateToken,
  validateHelpRequestAccess,
} = require("../middleware/auth");
const { validate } = require("../utils/validators");
const {
  helpRequestValidation,
  queryValidation,
} = require("../utils/validators");
const {
  generalLimiter,
  helpRequestLimiter,
  searchLimiter,
} = require("../middleware/rateLimiter");

// Apply authentication to protected routes
const requireAuth = authenticateToken;

/**
 * @route   GET /api/help/items
 * @desc    Get all available help items
 * @access  Public
 */
router.get("/items", searchLimiter, helpController.getHelpItems);

/**
 * @route   GET /api/help/categories
 * @desc    Get help item categories
 * @access  Public
 */
router.get("/categories", helpController.getCategories);

/**
 * @route   POST /api/help/requests
 * @desc    Create help request
 * @access  Private
 */
router.post(
  "/requests",
  requireAuth,
  helpRequestLimiter,
  validate(helpRequestValidation.create),
  helpController.createHelpRequest
);

/**
 * @route   GET /api/help/requests
 * @desc    Get all help requests with filtering
 * @access  Public
 */
router.get(
  "/requests",
  requireAuth,
  searchLimiter,
  validate(queryValidation.helpRequestFilters, "query"),
  helpController.getHelpRequests
);

/**
 * @route   GET /api/help/requests/:requestId
 * @desc    Get help request by ID
 * @access  Private
 */
router.get("/requests/:requestId", requireAuth, helpController.getHelpRequest);

/**
 * @route   PUT /api/help/requests/:requestId
 * @desc    Update help request
 * @access  Private (Owner only)
 */
router.put(
  "/requests/:requestId",
  requireAuth,
  validateHelpRequestAccess("edit"),
  validate(helpRequestValidation.update),
  helpController.updateHelpRequest
);

/**
 * @route   POST /api/help/requests/:requestId/approve
 * @desc    Approve help request (donor accepting to help)
 * @access  Private
 */
router.post(
  "/requests/:requestId/approve",
  requireAuth,
  validateHelpRequestAccess("approve"),
  helpController.approveHelpRequest
);

/**
 * @route   POST /api/help/requests/:requestId/complete
 * @desc    Complete help request
 * @access  Private (Recipient or Donor only)
 */
router.post(
  "/requests/:requestId/complete",
  requireAuth,
  validateHelpRequestAccess("complete"),
  helpController.completeHelpRequest
);

/**
 * @route   DELETE /api/help/requests/:requestId
 * @desc    Delete help request
 * @access  Private (Owner only)
 */
router.delete(
  "/requests/:requestId",
  requireAuth,
  validateHelpRequestAccess("edit"),
  helpController.deleteHelpRequest
);

/**
 * @route   POST /api/help/requests/:requestId/notes
 * @desc    Add note to help request
 * @access  Private (Recipient or Donor only)
 */
router.post(
  "/requests/:requestId/notes",
  requireAuth,
  validate(helpRequestValidation.addNote),
  helpController.addNote
);

/**
 * @route   POST /api/help/requests/:requestId/interest
 * @desc    Mark interest in help request
 * @access  Private
 */
router.post(
  "/requests/:requestId/interest",
  requireAuth,
  generalLimiter,
  helpController.markInterest
);

/**
 * @route   POST /api/help/requests/:requestId/rate
 * @desc    Rate help request (recipient rates donor or donor rates recipient)
 * @access  Private (Recipient or Donor only)
 */
router.post(
  "/requests/:requestId/rate",
  requireAuth,
  validate(helpRequestValidation.rate),
  helpController.rateHelpRequest
);

/**
 * @route   POST /api/help/requests/:requestId/flag
 * @desc    Flag help request for admin review
 * @access  Private
 */
router.post(
  "/requests/:requestId/flag",
  requireAuth,
  validate(helpRequestValidation.flag),
  generalLimiter,
  helpController.flagHelpRequest
);

/**
 * @route   GET /api/help/statistics
 * @desc    Get help request statistics
 * @access  Public
 */
router.get("/statistics", helpController.getStatistics);

module.exports = router;
