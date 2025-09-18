// User roles
const USER_ROLES = {
  USER: "user",
  ADMIN: "admin",
};

// User status
const USER_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

// Help request status
const HELP_REQUEST_STATUS = {
  OPEN: "open",
  APPROVED: "approved",
  COMPLETED: "completed",
};

// Common help categories
const HELP_CATEGORIES = {
  FOOD: "food",
  CLOTHING: "clothing",
  MEDICAL: "medical",
  EDUCATION: "education",
  HOUSEHOLD: "household",
  TRANSPORTATION: "transportation",
  OTHER: "other",
};

// Quantity units
const QUANTITY_UNITS = {
  PIECES: "pieces",
  KG: "kg",
  LITERS: "liters",
  PACKETS: "packets",
  BOXES: "boxes",
  BOTTLES: "bottles",
  SETS: "sets",
};

// OTP configuration
const OTP_CONFIG = {
  EXPIRY_MINUTES: parseInt(process.env.OTP_EXPIRY_MINUTES) || 10,
  MAX_ATTEMPTS: parseInt(process.env.MAX_OTP_ATTEMPTS) || 3,
  LENGTH: 6,
};

// Email types
const EMAIL_TYPES = {
  VERIFICATION: "verification",
  PASSWORD_RESET: "password_reset",
  ACCOUNT_APPROVED: "account_approved",
  ACCOUNT_REJECTED: "account_rejected",
};

// Response messages
const MESSAGES = {
  SUCCESS: {
    USER_REGISTERED:
      "User registered successfully. Please check your email for OTP.",
    OTP_VERIFIED: "Email verified successfully.",
    LOGIN_SUCCESS: "Login successful.",
    LOGOUT_SUCCESS: "Logout successful.",
    OTP_SENT: "OTP sent to your email.",
    PASSWORD_RESET: "Password reset successfully.",
    PROFILE_UPDATED: "Profile updated successfully.",
    HELP_REQUEST_CREATED: "Help request created successfully.",
    HELP_REQUEST_APPROVED: "Help request approved successfully.",
    USER_APPROVED: "User approved successfully.",
    USER_REJECTED: "User rejected successfully.",
    ANNOUNCEMENT_CREATED: "Announcement created successfully.",
  },
  ERROR: {
    USER_EXISTS: "User already exists with this email.",
    INVALID_CREDENTIALS: "Invalid email or password.",
    USER_NOT_FOUND: "User not found.",
    INVALID_OTP: "Invalid OTP.",
    OTP_EXPIRED: "OTP has expired.",
    OTP_ATTEMPTS_EXCEEDED: "Maximum OTP attempts exceeded.",
    ACCOUNT_NOT_APPROVED: "Your account is not approved yet.",
    ACCOUNT_REJECTED: "Your account has been rejected.",
    UNAUTHORIZED: "Unauthorized access.",
    ADMIN_REQUIRED: "Admin access required.",
    TOKEN_EXPIRED: "Token has expired.",
    INVALID_TOKEN: "Invalid token.",
    HELP_REQUEST_NOT_FOUND: "Help request not found.",
    ALREADY_APPROVED: "Help request already approved.",
    CANNOT_APPROVE_OWN: "You cannot approve your own help request.",
    VALIDATION_ERROR: "Validation error.",
    SERVER_ERROR: "Internal server error.",
    EMAIL_SEND_ERROR: "Failed to send email.",
  },
};

// Default help items for seeding
const DEFAULT_HELP_ITEMS = [
  {
    name: "Rice",
    category: HELP_CATEGORIES.FOOD,
    defaultQuantityUnit: QUANTITY_UNITS.KG,
  },
  {
    name: "Wheat Flour",
    category: HELP_CATEGORIES.FOOD,
    defaultQuantityUnit: QUANTITY_UNITS.KG,
  },
  {
    name: "Cooking Oil",
    category: HELP_CATEGORIES.FOOD,
    defaultQuantityUnit: QUANTITY_UNITS.LITERS,
  },
  {
    name: "Dal/Lentils",
    category: HELP_CATEGORIES.FOOD,
    defaultQuantityUnit: QUANTITY_UNITS.KG,
  },
  {
    name: "Vegetables",
    category: HELP_CATEGORIES.FOOD,
    defaultQuantityUnit: QUANTITY_UNITS.KG,
  },
  {
    name: "Men's Clothing",
    category: HELP_CATEGORIES.CLOTHING,
    defaultQuantityUnit: QUANTITY_UNITS.PIECES,
  },
  {
    name: "Women's Clothing",
    category: HELP_CATEGORIES.CLOTHING,
    defaultQuantityUnit: QUANTITY_UNITS.PIECES,
  },
  {
    name: "Children's Clothing",
    category: HELP_CATEGORIES.CLOTHING,
    defaultQuantityUnit: QUANTITY_UNITS.PIECES,
  },
  {
    name: "Blankets",
    category: HELP_CATEGORIES.CLOTHING,
    defaultQuantityUnit: QUANTITY_UNITS.PIECES,
  },
  {
    name: "Medicine",
    category: HELP_CATEGORIES.MEDICAL,
    defaultQuantityUnit: QUANTITY_UNITS.BOXES,
  },
  {
    name: "First Aid Kit",
    category: HELP_CATEGORIES.MEDICAL,
    defaultQuantityUnit: QUANTITY_UNITS.PIECES,
  },
  {
    name: "School Books",
    category: HELP_CATEGORIES.EDUCATION,
    defaultQuantityUnit: QUANTITY_UNITS.PIECES,
  },
  {
    name: "Notebooks",
    category: HELP_CATEGORIES.EDUCATION,
    defaultQuantityUnit: QUANTITY_UNITS.PIECES,
  },
  {
    name: "Stationery Items",
    category: HELP_CATEGORIES.EDUCATION,
    defaultQuantityUnit: QUANTITY_UNITS.SETS,
  },
  {
    name: "Household Items",
    category: HELP_CATEGORIES.HOUSEHOLD,
    defaultQuantityUnit: QUANTITY_UNITS.PIECES,
  },
];

module.exports = {
  USER_ROLES,
  USER_STATUS,
  HELP_REQUEST_STATUS,
  HELP_CATEGORIES,
  QUANTITY_UNITS,
  OTP_CONFIG,
  EMAIL_TYPES,
  MESSAGES,
  DEFAULT_HELP_ITEMS,
};
