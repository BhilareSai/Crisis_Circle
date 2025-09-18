const { USER_ROLES, MESSAGES } = require("../utils/constants");

/**
 * Middleware to check if user has admin role
 * Should be used after authenticateToken middleware
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: MESSAGES.ERROR.UNAUTHORIZED,
    });
  }

  if (req.user.role !== USER_ROLES.ADMIN) {
    return res.status(403).json({
      success: false,
      message: MESSAGES.ERROR.ADMIN_REQUIRED,
    });
  }

  next();
};

/**
 * Middleware to check if user is admin or resource owner
 * Useful for endpoints that allow both admin access and self-access
 */
const requireAdminOrOwner = (getOwnerId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: MESSAGES.ERROR.UNAUTHORIZED,
        });
      }

      // Admin can access everything
      if (req.user.role === USER_ROLES.ADMIN) {
        return next();
      }

      // Check if user is the owner
      const ownerId = await getOwnerId(req);
      if (ownerId && ownerId.toString() === req.user.userId.toString()) {
        return next();
      }

      return res.status(403).json({
        success: false,
        message: "Access denied: Admin privileges or ownership required",
      });
    } catch (error) {
      console.error("Admin or owner check error:", error);
      return res.status(500).json({
        success: false,
        message: MESSAGES.ERROR.SERVER_ERROR,
      });
    }
  };
};

/**
 * Middleware to log admin actions for audit purposes
 */
const logAdminAction = (action) => {
  return (req, res, next) => {
    // Store action info for logging after successful response
    req.adminAction = {
      action,
      adminId: req.user.userId,
      adminEmail: req.user.email,
      timestamp: new Date(),
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
      requestData: {
        params: req.params,
        query: req.query,
        body: { ...req.body },
      },
    };

    // Remove sensitive data from logs
    if (req.adminAction.requestData.body.password) {
      req.adminAction.requestData.body.password = "[REDACTED]";
    }

    next();
  };
};

/**
 * Middleware to validate admin permissions for specific operations
 */
const validateAdminPermissions = (requiredPermissions = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: MESSAGES.ERROR.UNAUTHORIZED,
      });
    }

    if (req.user.role !== USER_ROLES.ADMIN) {
      return res.status(403).json({
        success: false,
        message: MESSAGES.ERROR.ADMIN_REQUIRED,
      });
    }

    // In a more complex system, you might have granular permissions
    // For now, all admins have all permissions
    // Future enhancement: implement role-based permissions

    next();
  };
};

/**
 * Middleware to check if admin can modify user
 * Prevents admins from modifying other admins (unless super admin)
 */
const canModifyUser = async (req, res, next) => {
  try {
    const User = require("../models/User");
    const { userId } = req.params;
    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: MESSAGES.ERROR.USER_NOT_FOUND,
      });
    }

    // Prevent admin from modifying another admin
    // In a real system, you might have super admin roles
    if (
      targetUser.role === USER_ROLES.ADMIN &&
      targetUser._id.toString() !== req.user.userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Cannot modify another admin account",
      });
    }

    req.targetUser = targetUser;
    next();
  } catch (error) {
    console.error("Can modify user check error:", error);
    return res.status(500).json({
      success: false,
      message: MESSAGES.ERROR.SERVER_ERROR,
    });
  }
};

/**
 * Middleware to validate bulk operations limits
 */
const validateBulkOperation = (maxItems = 100) => {
  return (req, res, next) => {
    const { items, userIds, requestIds } = req.body;
    const itemsToProcess = items || userIds || requestIds || [];

    if (Array.isArray(itemsToProcess) && itemsToProcess.length > maxItems) {
      return res.status(400).json({
        success: false,
        message: `Bulk operations are limited to ${maxItems} items at a time`,
      });
    }

    next();
  };
};

/**
 * Response middleware to log admin actions after successful operations
 */
const logSuccessfulAdminAction = (req, res, next) => {
  // Override res.json to capture response before sending
  const originalJson = res.json;

  res.json = function (data) {
    // Log admin action if it was successful and adminAction exists
    if (req.adminAction && data && data.success) {
      console.log("🔧 Admin Action:", {
        ...req.adminAction,
        success: true,
        responseData: data.message || "Operation completed",
      });

      // In a real application, you would store this in a database
      // for proper audit logging
    }

    // Call original json method
    return originalJson.call(this, data);
  };

  next();
};

module.exports = {
  requireAdmin,
  requireAdminOrOwner,
  logAdminAction,
  validateAdminPermissions,
  canModifyUser,
  validateBulkOperation,
  logSuccessfulAdminAction,
};
