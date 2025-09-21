const Joi = require("joi");
const {
  USER_ROLES,
  USER_STATUS,
  HELP_REQUEST_STATUS,
  HELP_CATEGORIES,
  QUANTITY_UNITS,
  EMAIL_TYPES,
} = require("./constants");

// Common validation patterns
const commonValidations = {
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)"))
    .message(
      "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number"
    ),
  name: Joi.string().min(2).max(50).trim().required(),
  phone: Joi.string()
    .pattern(new RegExp("^[\\+]?[1-9][\\d]{0,15}$"))
    .message("Please enter a valid phone number"),
  zipCode: Joi.string().min(5).max(10).trim().required(),
  otp: Joi.string().length(6).pattern(/^\d+$/).required(),
  coordinates: Joi.object({
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
  }).required(),
};

// User validation schemas
const userValidation = {
  register: Joi.object({
    name: commonValidations.name,
    email: commonValidations.email,
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    password: commonValidations.password,
    phone: commonValidations.phone,
    zipCode: commonValidations.zipCode,
    address: Joi.string().max(200).trim().optional(),
  }),

  login: Joi.object({
    email: commonValidations.email,
    password: Joi.string().required(),
  }),

  verifyOTP: Joi.object({
    email: commonValidations.email,
    otp: commonValidations.otp,
  }),

  resendOTP: Joi.object({
    email: commonValidations.email,
    type: Joi.string()
      .valid(...Object.values(EMAIL_TYPES))
      .default(EMAIL_TYPES.VERIFICATION),
  }),

  forgotPassword: Joi.object({
    email: commonValidations.email,
  }),

  resetPassword: Joi.object({
    email: commonValidations.email,
    otp: commonValidations.otp,
    newPassword: commonValidations.password,
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonValidations.password,
  }),

  updateProfile: Joi.object({
    name: commonValidations.name.optional(),
    phone: commonValidations.phone.optional(),
    address: Joi.string().max(200).trim().optional(),
    zipCode: commonValidations.zipCode.optional(),
  }),
};
const userFilters = {
  page: {
    optional: true,
    isInt: {
      options: { min: 1 },
      errorMessage: "Page must be a positive integer",
    },
    toInt: true,
  },
  limit: {
    optional: true,
    isInt: {
      options: { min: 1, max: 100 },
      errorMessage: "Limit must be between 1 and 100",
    },
    toInt: true,
  },
  status: {
    optional: true,
    isIn: {
      options: [Object.values(USER_STATUS)],
      errorMessage: "Invalid status value",
    },
  },
  role: {
    optional: true,
    isIn: {
      options: [Object.values(USER_ROLES)],
      errorMessage: "Invalid role value",
    },
  },
  isEmailVerified: {
    optional: true,
    isBoolean: {
      errorMessage: "isEmailVerified must be a boolean",
    },
  },
  search: {
    optional: true,
    isLength: {
      options: { min: 2, max: 50 },
      errorMessage: "Search term must be between 2 and 50 characters",
    },
    trim: true,
  },
  zipCode: {
    optional: true,
    isLength: {
      options: { min: 3, max: 10 },
      errorMessage: "Zip code must be between 3 and 10 characters",
    },
    trim: true,
  },
  sortBy: {
    optional: true,
    isIn: {
      options: [
        [
          "name",
          "email",
          "createdAt",
          "updatedAt",
          "lastLoginAt",
          "status",
          "zipCode",
          "role",
        ],
      ],
      errorMessage: "Invalid sortBy field",
    },
  },
  sortOrder: {
    optional: true,
    isIn: {
      options: [["asc", "desc"]],
      errorMessage: "Sort order must be 'asc' or 'desc'",
    },
  },
  createdAfter: {
    optional: true,
    isISO8601: {
      errorMessage: "createdAfter must be a valid ISO 8601 date",
    },
    toDate: true,
  },
  createdBefore: {
    optional: true,
    isISO8601: {
      errorMessage: "createdBefore must be a valid ISO 8601 date",
    },
    toDate: true,
  },
  lastLoginAfter: {
    optional: true,
    isISO8601: {
      errorMessage: "lastLoginAfter must be a valid ISO 8601 date",
    },
    toDate: true,
  },
  lastLoginBefore: {
    optional: true,
    isISO8601: {
      errorMessage: "lastLoginBefore must be a valid ISO 8601 date",
    },
    toDate: true,
  },
  hasLoggedIn: {
    optional: true,
    isBoolean: {
      errorMessage: "hasLoggedIn must be a boolean",
    },
  },
  includeDeleted: {
    optional: true,
    isBoolean: {
      errorMessage: "includeDeleted must be a boolean",
    },
  },
};
// Admin validation schemas
const adminValidation = {
  approveUser: Joi.object({
    userId: Joi.string().hex().length(24).required(),
    reason: Joi.string().max(200).trim().optional(),
  }),

  rejectUser: Joi.object({
    userId: Joi.string().hex().length(24).required(),
    reason: Joi.string().max(200).trim().required(),
  }),

  updateUserStatus: Joi.object({
    status: Joi.string()
      .valid(...Object.values(USER_STATUS))
      .required(),
    reason: Joi.string().max(200).trim().optional(),
  }),

  createHelpItem: Joi.object({
    name: Joi.string().min(2).max(50).trim().required(),
    category: Joi.string()
      .valid(...Object.values(HELP_CATEGORIES))
      .required(),
    defaultQuantityUnit: Joi.string()
      .valid(...Object.values(QUANTITY_UNITS))
      .required(),
    description: Joi.string().max(200).trim().optional(),
    icon: Joi.string().trim().optional(),
    tags: Joi.array().items(Joi.string().trim().lowercase()).optional(),
    priority: Joi.number().min(0).max(10).default(0),
  }),

  updateHelpItem: Joi.object({
    name: Joi.string().min(2).max(50).trim().optional(),
    category: Joi.string()
      .valid(...Object.values(HELP_CATEGORIES))
      .optional(),
    defaultQuantityUnit: Joi.string()
      .valid(...Object.values(QUANTITY_UNITS))
      .optional(),
    description: Joi.string().max(200).trim().optional(),
    icon: Joi.string().trim().optional(),
    tags: Joi.array().items(Joi.string().trim().lowercase()).optional(),
    priority: Joi.number().min(0).max(10).optional(),
    isActive: Joi.boolean().optional(),
  }),

  deleteRejectedUsers: Joi.object({
    userIds: Joi.array()
      .items(Joi.string().hex().length(24))
      .optional(),
    deleteAll: Joi.boolean().optional(),
  }).or('userIds', 'deleteAll'),
};

// Help request validation schemas
const helpRequestValidation = {
  create: Joi.object({
    title: Joi.string().min(10).max(100).trim().required(),
    description: Joi.string().min(20).max(500).trim().required(),
    items: Joi.array()
      .items(
        Joi.object({
          itemId: Joi.string().hex().length(24).required(),
          quantity: Joi.number().min(1).required(),
          unit: Joi.string().trim().required(),
          description: Joi.string().max(200).trim().optional(),
          urgency: Joi.string()
            .valid("low", "medium", "high", "critical")
            .default("medium"),
        })
      )
      .min(1)
      .required(),
    priority: Joi.string()
      .valid("low", "medium", "high", "critical")
      .default("medium"),
    category: Joi.string().trim().required(),
    preferredContactMethod: Joi.string()
      .valid("phone", "email", "both")
      .default("both"),
    
    availabilityWindow: Joi.object({
      startDate: Joi.date().min("now").required(),
      endDate: Joi.date().greater(Joi.ref("startDate")).required(),
      timeSlots: Joi.array()
        .items(
          Joi.object({
            day: Joi.string()
              .valid(
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday"
              )
              .required(),
            startTime: Joi.string()
              .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
              .required(),
            endTime: Joi.string()
              .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
              .required(),
          })
        )
        .optional(),
    }).required(),
    images: Joi.array()
      .items(
        Joi.object({
          url: Joi.string().uri().required(),
          caption: Joi.string().max(100).trim().optional(),
        })
      )
      .optional(),
  }),

  update: Joi.object({
    title: Joi.string().min(10).max(100).trim().optional(),
    description: Joi.string().min(20).max(500).trim().optional(),
    items: Joi.array()
      .items(
        Joi.object({
          itemId: Joi.string().hex().length(24).required(),
          quantity: Joi.number().min(1).required(),
          unit: Joi.string().trim().required(),
          description: Joi.string().max(200).trim().optional(),
          urgency: Joi.string()
            .valid("low", "medium", "high", "critical")
            .default("medium"),
        })
      )
      .min(1)
      .optional(),
    priority: Joi.string()
      .valid("low", "medium", "high", "critical")
      .optional(),
    preferredContactMethod: Joi.string()
      .valid("phone", "email", "both")
      .optional(),
    availabilityWindow: Joi.object({
      startDate: Joi.date().min("now").optional(),
      endDate: Joi.date().greater(Joi.ref("startDate")).optional(),
      timeSlots: Joi.array()
        .items(
          Joi.object({
            day: Joi.string()
              .valid(
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
                "sunday"
              )
              .required(),
            startTime: Joi.string()
              .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
              .required(),
            endTime: Joi.string()
              .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
              .required(),
          })
        )
        .optional(),
    }).optional(),
  }),

  addNote: Joi.object({
    content: Joi.string().min(5).max(300).trim().required(),
  }),

  rate: Joi.object({
    stars: Joi.number().min(1).max(5).required(),
    comment: Joi.string().max(200).trim().optional(),
  }),

  flag: Joi.object({
    reason: Joi.string().min(10).max(200).trim().required(),
  }),
};

// Announcement validation schemas
const announcementValidation = {
  create: Joi.object({
    title: Joi.string().min(5).max(100).trim().required(),
    message: Joi.string().min(10).max(1000).trim().required(),
    type: Joi.string()
      .valid("info", "warning", "success", "urgent")
      .default("info"),
    category: Joi.string()
      .valid("general", "system", "policy", "event", "maintenance", "community")
      .default("general"),
    isPinned: Joi.boolean().default(false),
    targetAudience: Joi.string()
      .valid("all", "recipients", "donors", "pending_users", "approved_users")
      .default("all"),
    displaySettings: Joi.object({
      showOnDashboard: Joi.boolean().default(true),
      showInNotifications: Joi.boolean().default(false),
      autoHide: Joi.boolean().default(false),
      hideAfterDays: Joi.number()
        .min(1)
        .max(365)
        .when("autoHide", { is: true, then: Joi.required() }),
    }).optional(),
    scheduling: Joi.object({
      publishAt: Joi.date().min("now").default(new Date()),
      expireAt: Joi.date().greater(Joi.ref("publishAt")).optional(),
    }).optional(),
    links: Joi.array()
      .items(
        Joi.object({
          title: Joi.string().max(50).trim().required(),
          url: Joi.string().uri().required(),
          openInNewTab: Joi.boolean().default(true),
        })
      )
      .optional(),
  }),

  update: Joi.object({
    title: Joi.string().min(5).max(100).trim().optional(),
    message: Joi.string().min(10).max(1000).trim().optional(),
    type: Joi.string().valid("info", "warning", "success", "urgent").optional(),
    category: Joi.string()
      .valid("general", "system", "policy", "event", "maintenance", "community")
      .optional(),
    isPinned: Joi.boolean().optional(),
    isActive: Joi.boolean().optional(),
    targetAudience: Joi.string()
      .valid("all", "recipients", "donors", "pending_users", "approved_users")
      .optional(),
    displaySettings: Joi.object({
      showOnDashboard: Joi.boolean().optional(),
      showInNotifications: Joi.boolean().optional(),
      autoHide: Joi.boolean().optional(),
      hideAfterDays: Joi.number().min(1).max(365).optional(),
    }).optional(),
    scheduling: Joi.object({
      publishAt: Joi.date().optional(),
      expireAt: Joi.date().optional(),
    }).optional(),
    links: Joi.array()
      .items(
        Joi.object({
          title: Joi.string().max(50).trim().required(),
          url: Joi.string().uri().required(),
          openInNewTab: Joi.boolean().default(true),
        })
      )
      .optional(),
  }),
};

// Query parameter validation schemas
const queryValidation = {
  pagination: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
    sort: Joi.string().optional(),
    status: Joi.string().optional(),
    order: Joi.string().valid("asc", "desc").default("desc"),
  }),

  search: Joi.object({
    q: Joi.string().min(2).max(100).trim().optional(),
    category: Joi.string().optional(),
    status: Joi.string().optional(),
    zipCode: Joi.string().optional(),
    radius: Joi.number().min(1).max(100).default(10),
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
  }),

  dateRange: Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().min(Joi.ref("startDate")).optional(),
  }),

  helpRequestFilters: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
    status: Joi.string()
      .valid(...Object.values(HELP_REQUEST_STATUS))
      .optional(),
    category: Joi.string()
      .valid(...Object.values(HELP_CATEGORIES))
      .optional(),
    priority: Joi.string()
      .valid("low", "medium", "high", "critical")
      .optional(),
    search: Joi.string().min(2).max(100).trim().optional(),
    zipCode: Joi.string().min(3).max(10).trim().optional(),
    radius: Joi.number().min(1).max(100).default(10),
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    urgency: Joi.string().valid("low", "medium", "high", "critical").optional(),
  }),
  userFilters: {
    page: {
      optional: true,
      isInt: {
        options: { min: 1 },
        errorMessage: "Page must be a positive integer"
      },
      toInt: true
    },
    limit: {
      optional: true,
      isInt: {
        options: { min: 1, max: 100 },
        errorMessage: "Limit must be between 1 and 100"
      },
      toInt: true
    },
    status: {
      optional: true,
      isIn: {
        options: [Object.values(USER_STATUS)],
        errorMessage: "Invalid status value"
      }
    },
    role: {
      optional: true,
      isIn: {
        options: [Object.values(USER_ROLES)],
        errorMessage: "Invalid role value"
      }
    },
    isEmailVerified: {
      optional: true,
      isBoolean: {
        errorMessage: "isEmailVerified must be a boolean"
      }
    },
    search: {
      optional: true,
      isLength: {
        options: { min: 2, max: 50 },
        errorMessage: "Search term must be between 2 and 50 characters"
      },
      trim: true
    },
    zipCode: {
      optional: true,
      isLength: {
        options: { min: 3, max: 10 },
        errorMessage: "Zip code must be between 3 and 10 characters"
      },
      trim: true
    },
    sortBy: {
      optional: true,
      isIn: {
        options: [['name', 'email', 'createdAt', 'updatedAt', 'lastLoginAt', 'status', 'zipCode', 'role']],
        errorMessage: "Invalid sortBy field"
      }
    },
    sortOrder: {
      optional: true,
      isIn: {
        options: [['asc', 'desc']],
        errorMessage: "Sort order must be 'asc' or 'desc'"
      }
    },
    createdAfter: {
      optional: true,
      isISO8601: {
        errorMessage: "createdAfter must be a valid ISO 8601 date"
      },
      toDate: true
    },
    createdBefore: {
      optional: true,
      isISO8601: {
        errorMessage: "createdBefore must be a valid ISO 8601 date"
      },
      toDate: true
    },
    lastLoginAfter: {
      optional: true,
      isISO8601: {
        errorMessage: "lastLoginAfter must be a valid ISO 8601 date"
      },
      toDate: true
    },
    lastLoginBefore: {
      optional: true,
      isISO8601: {
        errorMessage: "lastLoginBefore must be a valid ISO 8601 date"
      },
      toDate: true
    },
    hasLoggedIn: {
      optional: true,
      isBoolean: {
        errorMessage: "hasLoggedIn must be a boolean"
      }
    },
    includeDeleted: {
      optional: true,
      isBoolean: {
        errorMessage: "includeDeleted must be a boolean"
      }
    }
  }
};

// Validation middleware factory
const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation Error",
        errors,
      });
    }

    req[property] = value;
    next();
  };
};

// Custom validation functions
const customValidations = {
  // Validate if user can modify help request
  canModifyRequest: (userId, request) => {
    return (
      request.recipientId.toString() === userId.toString() &&
      request.status === HELP_REQUEST_STATUS.OPEN
    );
  },

  // Validate if user can approve help request
  canApproveRequest: (userId, request) => {
    return (
      request.recipientId.toString() !== userId.toString() &&
      request.status === HELP_REQUEST_STATUS.OPEN
    );
  },

  // Validate if coordinates are within reasonable bounds for the application
  isValidLocation: (latitude, longitude) => {
    // Add any specific geographic constraints for your application area
    return (
      latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180
    );
  },

  // Validate if time slot is valid
  isValidTimeSlot: (startTime, endTime) => {
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    return start < end;
  },

  // Validate if availability window is reasonable
  isValidAvailabilityWindow: (startDate, endDate) => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    const maxFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 year

    return start >= now && end > start && end <= maxFuture;
  },
};

module.exports = {
  userValidation,
  adminValidation,
  helpRequestValidation,
  announcementValidation,
  queryValidation,
  validate,
  userFilters,
  customValidations,
  commonValidations,
};
