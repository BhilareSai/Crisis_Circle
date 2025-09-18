const mongoose = require("mongoose");
const { HELP_REQUEST_STATUS } = require("../utils/constants");

const helpRequestSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recipient ID is required"],
    },
    title: {
      type: String,
      required: [true, "Request title is required"],
      trim: true,
      minlength: [10, "Title must be at least 10 characters long"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Request description is required"],
      trim: true,
      minlength: [20, "Description must be at least 20 characters long"],
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    items: [
      {
        itemId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "HelpItem",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [1, "Quantity must be at least 1"],
        },
        unit: {
          type: String,
          required: true,
          trim: true,
        },
        description: {
          type: String,
          trim: true,
          maxlength: [200, "Item description cannot exceed 200 characters"],
        },
        urgency: {
          type: String,
          enum: ["low", "medium", "high", "critical"],
          default: "medium",
        },
      },
    ],
    status: {
      type: String,
      enum: Object.values(HELP_REQUEST_STATUS),
      default: HELP_REQUEST_STATUS.OPEN,
    },
    donorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    preferredContactMethod: {
      type: String,
      enum: ["phone", "email", "both"],
      default: "both",
    },
    pickupLocation: {
      address: {
        type: String,
        required: true,
        trim: true,
        maxlength: [200, "Address cannot exceed 200 characters"],
      },
      coordinates: {
        latitude: {
          type: Number,
          required: true,
          min: [-90, "Latitude must be between -90 and 90"],
          max: [90, "Latitude must be between -90 and 90"],
        },
        longitude: {
          type: Number,
          required: true,
          min: [-180, "Longitude must be between -180 and 180"],
          max: [180, "Longitude must be between -180 and 180"],
        },
      },
      zipCode: {
        type: String,
        required: true,
        trim: true,
      },
    },
    availabilityWindow: {
      startDate: {
        type: Date,
        required: true,
        default: Date.now,
      },
      endDate: {
        type: Date,
        required: true,
        default: function () {
          // Default to 30 days from now
          return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        },
      },
      timeSlots: [
        {
          day: {
            type: String,
            enum: [
              "monday",
              "tuesday",
              "wednesday",
              "thursday",
              "friday",
              "saturday",
              "sunday",
            ],
          },
          startTime: String, // Format: "HH:MM"
          endTime: String, // Format: "HH:MM"
        },
      ],
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        caption: {
          type: String,
          trim: true,
          maxlength: [100, "Caption cannot exceed 100 characters"],
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    approvedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    notes: [
      {
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        content: {
          type: String,
          required: true,
          trim: true,
          maxlength: [300, "Note cannot exceed 300 characters"],
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    rating: {
      recipientRating: {
        stars: {
          type: Number,
          min: 1,
          max: 5,
        },
        comment: {
          type: String,
          trim: true,
          maxlength: [200, "Comment cannot exceed 200 characters"],
        },
        createdAt: Date,
      },
      donorRating: {
        stars: {
          type: Number,
          min: 1,
          max: 5,
        },
        comment: {
          type: String,
          trim: true,
          maxlength: [200, "Comment cannot exceed 200 characters"],
        },
        createdAt: Date,
      },
    },
    metadata: {
      views: {
        type: Number,
        default: 0,
      },
      interested: [
        {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          interestedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      flagged: {
        isFlagged: {
          type: Boolean,
          default: false,
        },
        reason: String,
        flaggedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        flaggedAt: Date,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
helpRequestSchema.index({ recipientId: 1 });
helpRequestSchema.index({ donorId: 1 });
helpRequestSchema.index({ status: 1 });
helpRequestSchema.index({ category: 1 });
helpRequestSchema.index({ priority: -1 });
helpRequestSchema.index({
  "pickupLocation.coordinates.latitude": 1,
  "pickupLocation.coordinates.longitude": 1,
});
helpRequestSchema.index({ "pickupLocation.zipCode": 1 });
helpRequestSchema.index({ createdAt: -1 });
helpRequestSchema.index({ approvedAt: -1 });
helpRequestSchema.index({ "availabilityWindow.endDate": 1 });

// Text search index
helpRequestSchema.index(
  {
    title: "text",
    description: "text",
    category: "text",
  },
  {
    weights: {
      title: 10,
      category: 5,
      description: 1,
    },
  }
);

// Compound indexes for complex queries
helpRequestSchema.index({ status: 1, priority: -1, createdAt: -1 });
helpRequestSchema.index({ status: 1, category: 1, createdAt: -1 });

// Virtual fields
helpRequestSchema.virtual("isExpired").get(function () {
  return new Date() > this.availabilityWindow.endDate;
});

helpRequestSchema.virtual("daysRemaining").get(function () {
  const now = new Date();
  const endDate = this.availabilityWindow.endDate;
  const diffTime = endDate - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

helpRequestSchema.virtual("totalItems").get(function () {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Instance methods
helpRequestSchema.methods.approve = function (donorId) {
  this.status = HELP_REQUEST_STATUS.APPROVED;
  this.donorId = donorId;
  this.approvedAt = new Date();
  return this.save();
};

helpRequestSchema.methods.complete = function () {
  this.status = HELP_REQUEST_STATUS.COMPLETED;
  this.completedAt = new Date();
  return this.save();
};

helpRequestSchema.methods.addNote = function (authorId, content) {
  this.notes.push({
    author: authorId,
    content: content,
  });
  return this.save();
};

helpRequestSchema.methods.incrementViews = function () {
  this.metadata.views += 1;
  return this.save({ validateBeforeSave: false });
};

helpRequestSchema.methods.markInterested = function (userId) {
  const alreadyInterested = this.metadata.interested.some(
    (interest) => interest.userId.toString() === userId.toString()
  );

  if (!alreadyInterested) {
    this.metadata.interested.push({ userId });
    return this.save({ validateBeforeSave: false });
  }
  return Promise.resolve(this);
};

helpRequestSchema.methods.flag = function (reason, flaggedBy) {
  this.metadata.flagged = {
    isFlagged: true,
    reason,
    flaggedBy,
    flaggedAt: new Date(),
  };
  return this.save();
};

helpRequestSchema.methods.unflag = function () {
  this.metadata.flagged = {
    isFlagged: false,
    reason: undefined,
    flaggedBy: undefined,
    flaggedAt: undefined,
  };
  return this.save();
};

// Static methods
helpRequestSchema.statics.findOpenRequests = function (
  filters = {},
  limit = 20,
  skip = 0
) {
  const query = {
    status: HELP_REQUEST_STATUS.OPEN,
    "availabilityWindow.endDate": { $gt: new Date() },
    ...filters,
  };

  return this.find(query)
    .populate("recipientId", "name email phone zipCode")
    .populate("items.itemId", "name category defaultQuantityUnit")
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

helpRequestSchema.statics.findNearbyRequests = function (
  latitude,
  longitude,
  radiusKm = 10,
  limit = 20
) {
  const radiusRadians = radiusKm / 6371; // Earth's radius in km

  return this.find({
    status: HELP_REQUEST_STATUS.OPEN,
    "availabilityWindow.endDate": { $gt: new Date() },
    "pickupLocation.coordinates": {
      $geoWithin: {
        $centerSphere: [[longitude, latitude], radiusRadians],
      },
    },
  })
    .populate("recipientId", "name email phone zipCode")
    .populate("items.itemId", "name category defaultQuantityUnit")
    .sort({ priority: -1, createdAt: -1 })
    .limit(limit);
};

helpRequestSchema.statics.findUserRequests = function (
  userId,
  status = null,
  limit = 20,
  skip = 0
) {
  const query = { recipientId: userId };
  if (status) {
    query.status = status;
  }

  return this.find(query)
    .populate("donorId", "name email phone")
    .populate("items.itemId", "name category defaultQuantityUnit")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

helpRequestSchema.statics.findDonorRequests = function (
  donorId,
  limit = 20,
  skip = 0
) {
  return this.find({ donorId })
    .populate("recipientId", "name email phone zipCode")
    .populate("items.itemId", "name category defaultQuantityUnit")
    .sort({ approvedAt: -1 })
    .limit(limit)
    .skip(skip);
};

helpRequestSchema.statics.getRequestStats = function () {
  return this.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        categories: { $addToSet: "$category" },
      },
    },
    {
      $group: {
        _id: null,
        statusBreakdown: {
          $push: {
            status: "$_id",
            count: "$count",
            categories: "$categories",
          },
        },
        totalRequests: { $sum: "$count" },
      },
    },
  ]);
};

helpRequestSchema.statics.getExpiringRequests = function (daysFromNow = 3) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysFromNow);

  return this.find({
    status: HELP_REQUEST_STATUS.OPEN,
    "availabilityWindow.endDate": {
      $gte: new Date(),
      $lte: futureDate,
    },
  })
    .populate("recipientId", "name email")
    .sort({ "availabilityWindow.endDate": 1 });
};

// Pre-save middleware
helpRequestSchema.pre("save", function (next) {
  // Set category based on items
  if (this.isModified("items") && this.items.length > 0) {
    // You might want to populate the items to get their categories
    // For now, we'll keep the category as is
  }

  // Ensure availability window is valid
  if (this.availabilityWindow.startDate >= this.availabilityWindow.endDate) {
    return next(new Error("End date must be after start date"));
  }

  next();
});

// Post-save middleware for notifications (if needed)
helpRequestSchema.post("save", function (doc, next) {
  // Here you can add logic to send notifications
  // when status changes, new requests are created, etc.
  next();
});

module.exports = mongoose.model("HelpRequest", helpRequestSchema);
