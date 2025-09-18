const rateLimit = require("express-rate-limit");

// Create different rate limiters for different endpoints

/**
 * General API rate limiter
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: false,
  // Skip failed requests
  skipFailedRequests: false,
});

/**
 * Strict rate limiter for authentication endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    message: "Too many authentication attempts, please try again later.",
    retryAfter: "15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Don't skip anything for auth
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

/**
 * Very strict rate limiter for OTP endpoints
 */
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // Limit each IP to 3 OTP requests per windowMs
  message: {
    success: false,
    message: "Too many OTP requests, please try again in 10 minutes.",
    retryAfter: "10 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  // Custom key generator to also consider email
  keyGenerator: (req) => {
    const email = req.body.email || req.query.email;
    return email ? `${req.ip}-${email}` : req.ip;
  },
});

/**
 * Rate limiter for password reset attempts
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    message: "Too many password reset attempts, please try again in 1 hour.",
    retryAfter: "1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body.email || req.query.email;
    return email ? `${req.ip}-${email}` : req.ip;
  },
});

/**
 * Rate limiter for help request creation
 */
const helpRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each user to 5 help requests per hour
  message: {
    success: false,
    message: "Too many help requests created, please try again later.",
    retryAfter: "1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user ? `user-${req.user.userId}` : req.ip;
  },
  skip: (req) => {
    // Skip rate limiting for admins
    return req.user && req.user.role === "admin";
  },
});

/**
 * Rate limiter for admin operations
 */
const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Limit each admin to 50 operations per 5 minutes
  message: {
    success: false,
    message: "Too many admin operations, please slow down.",
    retryAfter: "5 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user ? `admin-${req.user.userId}` : req.ip;
  },
});

/**
 * Rate limiter for file uploads
 */
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // Limit each user to 10 uploads per 10 minutes
  message: {
    success: false,
    message: "Too many file uploads, please try again later.",
    retryAfter: "10 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user ? `upload-${req.user.userId}` : req.ip;
  },
});

/**
 * Rate limiter for search operations
 */
const searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 search requests per minute
  message: {
    success: false,
    message: "Too many search requests, please slow down.",
    retryAfter: "1 minute",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful searches against limit
});

/**
 * Rate limiter for email sending operations
 */
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each user to 5 email operations per hour
  message: {
    success: false,
    message: "Too many email requests, please try again later.",
    retryAfter: "1 hour",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body.email || req.query.email;
    return email ? `email-${email}` : req.ip;
  },
});

/**
 * Custom rate limiter that varies by user type
 */
const adaptiveLimiter = (req, res, next) => {
  // Different limits based on user role
  const isAdmin = req.user && req.user.role === "admin";
  const isAuthenticated = req.user && req.user.userId;

  let maxRequests = 50; // Default for unauthenticated

  if (isAdmin) {
    maxRequests = 200;
  } else if (isAuthenticated) {
    maxRequests = 100;
  }

  const dynamicLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: maxRequests,
    message: {
      success: false,
      message: `Too many requests, limit is ${maxRequests} per 15 minutes.`,
      retryAfter: "15 minutes",
    },
    keyGenerator: (req) => {
      if (req.user) {
        return `${req.user.role}-${req.user.userId}`;
      }
      return req.ip;
    },
  });

  return dynamicLimiter(req, res, next);
};

/**
 * Middleware to add rate limit info to response headers
 */
const rateLimitInfo = (req, res, next) => {
  // Add custom headers with rate limit info
  res.set("X-RateLimit-Policy", "Community Help API Rate Limiting");
  next();
};

/**
 * Custom handler for rate limit exceeded
 */
const rateLimitHandler = (req, res) => {
  console.warn(`⚠️  Rate limit exceeded for ${req.ip} on ${req.path}`);

  res.status(429).json({
    success: false,
    message: "Rate limit exceeded",
    error: "TOO_MANY_REQUESTS",
    retryAfter: res.getHeader("Retry-After"),
    limit: res.getHeader("X-RateLimit-Limit"),
    remaining: res.getHeader("X-RateLimit-Remaining"),
    resetTime: new Date(
      Date.now() + parseInt(res.getHeader("X-RateLimit-Reset")) * 1000
    ),
  });
};

/**
 * Apply rate limit handler to all limiters
 */
const applyHandler = (limiter) => {
  limiter.handler = rateLimitHandler;
  return limiter;
};

module.exports = {
  generalLimiter: applyHandler(generalLimiter),
  authLimiter: applyHandler(authLimiter),
  otpLimiter: applyHandler(otpLimiter),
  passwordResetLimiter: applyHandler(passwordResetLimiter),
  helpRequestLimiter: applyHandler(helpRequestLimiter),
  adminLimiter: applyHandler(adminLimiter),
  uploadLimiter: applyHandler(uploadLimiter),
  searchLimiter: applyHandler(searchLimiter),
  emailLimiter: applyHandler(emailLimiter),
  adaptiveLimiter,
  rateLimitInfo,
};
