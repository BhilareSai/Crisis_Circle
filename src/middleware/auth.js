const jwt = require("jsonwebtoken");
const User = require("../models/User");
const jwtConfig = require("../config/jwt");
const { MESSAGES, USER_STATUS } = require("../utils/constants");

/**
 * Middleware to authenticate JWT token
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: MESSAGES.ERROR.UNAUTHORIZED,
      });
    }

    // Verify token
    const decoded = jwtConfig.verifyAccessToken(token);

    // Find user and check if still exists and is active
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: MESSAGES.ERROR.USER_NOT_FOUND,
      });
    }

    // Check if user account is approved
    if (user.status !== USER_STATUS.APPROVED) {
      let message = MESSAGES.ERROR.ACCOUNT_NOT_APPROVED;
      if (user.status === USER_STATUS.REJECTED) {
        message = MESSAGES.ERROR.ACCOUNT_REJECTED;
      }

      return res.status(403).json({
        success: false,
        message,
      });
    }

    // Add user info to request
    req.user = {
      userId: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      status: user.status,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: MESSAGES.ERROR.TOKEN_EXPIRED,
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: MESSAGES.ERROR.INVALID_TOKEN,
      });
    }

    return res.status(401).json({
      success: false,
      message: MESSAGES.ERROR.UNAUTHORIZED,
    });
  }
};

/**
 * Middleware for optional authentication (doesn't fail if no token)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return next(); // No token, continue without auth
    }

    const decoded = jwtConfig.verifyAccessToken(token);
    const user = await User.findById(decoded.userId);

    if (user && user.status === USER_STATUS.APPROVED) {
      req.user = {
        userId: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        status: user.status,
      };
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on token errors
    next();
  }
};

/**
 * Middleware to verify refresh token
 */
const verifyRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    // Verify refresh token
    const decoded = jwtConfig.verifyRefreshToken(refreshToken);

    // Find user and check if refresh token exists
    const user = await User.findById(decoded.userId);
    if (!user || !user.hasValidRefreshToken(refreshToken)) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    req.user = {
      userId: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
      status: user.status,
    };
    req.refreshToken = refreshToken;

    next();
  } catch (error) {
    console.error("Refresh token verification error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired refresh token",
    });
  }
};

/**
 * Middleware to check if user email is verified
 */
const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: MESSAGES.ERROR.UNAUTHORIZED,
    });
  }

  User.findById(req.user.userId)
    .then((user) => {
      if (!user.isEmailVerified) {
        return res.status(403).json({
          success: false,
          message: "Email verification required",
          code: "EMAIL_NOT_VERIFIED",
        });
      }
      next();
    })
    .catch((error) => {
      console.error("Email verification check error:", error);
      return res.status(500).json({
        success: false,
        message: MESSAGES.ERROR.SERVER_ERROR,
      });
    });
};

/**
 * Middleware to check user account status
 */
const checkAccountStatus = (allowedStatuses = [USER_STATUS.APPROVED]) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: MESSAGES.ERROR.UNAUTHORIZED,
      });
    }

    if (!allowedStatuses.includes(req.user.status)) {
      let message = MESSAGES.ERROR.ACCOUNT_NOT_APPROVED;

      if (req.user.status === USER_STATUS.REJECTED) {
        message = MESSAGES.ERROR.ACCOUNT_REJECTED;
      }

      return res.status(403).json({
        success: false,
        message,
        accountStatus: req.user.status,
      });
    }

    next();
  };
};

/**
 * Middleware to extract and validate JWT without strict authentication
 * Useful for rate limiting by user
 */
const extractUser = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token) {
      try {
        const decoded = jwtConfig.verifyAccessToken(token);
        req.tokenInfo = {
          userId: decoded.userId,
          email: decoded.email,
          role: decoded.role,
        };
      } catch (error) {
        // Token invalid, but we don't fail the request
        req.tokenInfo = null;
      }
    }

    next();
  } catch (error) {
    next();
  }
};

/**
 * Middleware to validate request ownership
 * Checks if the authenticated user owns the resource
 */
const validateOwnership = (getResourceOwner) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: MESSAGES.ERROR.UNAUTHORIZED,
        });
      }

      const ownerId = await getResourceOwner(req);

      if (ownerId.toString() !== req.user.userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Access denied: You can only access your own resources",
        });
      }

      next();
    } catch (error) {
      console.error("Ownership validation error:", error);
      return res.status(500).json({
        success: false,
        message: MESSAGES.ERROR.SERVER_ERROR,
      });
    }
  };
};

/**
 * Middleware to check if user can perform action on help request
 */
const validateHelpRequestAccess = (action) => {
  return async (req, res, next) => {
    try {
      const HelpRequest = require("../models/HelpRequest");
      const { requestId } = req.params;

      const helpRequest = await HelpRequest.findById(requestId);
      if (!helpRequest) {
        return res.status(404).json({
          success: false,
          message: MESSAGES.ERROR.HELP_REQUEST_NOT_FOUND,
        });
      }

      const userId = req.user.userId;
      const isOwner = helpRequest.recipientId.toString() === userId.toString();
      const isDonor =
        helpRequest.donorId &&
        helpRequest.donorId.toString() === userId.toString();

      switch (action) {
        case "view":
          // Anyone can view (handled by controller logic)
          break;
        case "edit":
          if (!isOwner) {
            return res.status(403).json({
              success: false,
              message: "You can only edit your own help requests",
            });
          }
          break;
        case "approve":
          if (isOwner) {
            return res.status(403).json({
              success: false,
              message: MESSAGES.ERROR.CANNOT_APPROVE_OWN,
            });
          }
          if (helpRequest.status !== "open") {
            return res.status(400).json({
              success: false,
              message: MESSAGES.ERROR.ALREADY_APPROVED,
            });
          }
          break;
        case "complete":
          if (!isDonor && !isOwner) {
            return res.status(403).json({
              success: false,
              message:
                "Only the recipient or donor can mark this request as complete",
            });
          }
          break;
        default:
          return res.status(400).json({
            success: false,
            message: "Invalid action",
          });
      }

      req.helpRequest = helpRequest;
      next();
    } catch (error) {
      console.error("Help request access validation error:", error);
      return res.status(500).json({
        success: false,
        message: MESSAGES.ERROR.SERVER_ERROR,
      });
    }
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  verifyRefreshToken,
  requireEmailVerification,
  checkAccountStatus,
  extractUser,
  validateOwnership,
  validateHelpRequestAccess,
};
