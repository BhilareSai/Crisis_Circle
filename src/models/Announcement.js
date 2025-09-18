const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Announcement title is required"],
      trim: true,
      minlength: [5, "Title must be at least 5 characters long"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    message: {
      type: String,
      required: [true, "Announcement message is required"],
      trim: true,
      minlength: [10, "Message must be at least 10 characters long"],
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    type: {
      type: String,
      enum: ["info", "warning", "success", "urgent"],
      default: "info",
    },
    category: {
      type: String,
      enum: [
        "general",
        "system",
        "policy",
        "event",
        "maintenance",
        "community",
      ],
      default: "general",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    targetAudience: {
      type: String,
      enum: ["all", "recipients", "donors", "pending_users", "approved_users"],
      default: "all",
    },
    displaySettings: {
      showOnDashboard: {
        type: Boolean,
        default: true,
      },
      showInNotifications: {
        type: Boolean,
        default: false,
      },
      autoHide: {
        type: Boolean,
        default: false,
      },
      hideAfterDays: {
        type: Number,
        min: 1,
        max: 365,
      },
    },
    scheduling: {
      publishAt: {
        type: Date,
        default: Date.now,
      },
      expireAt: {
        type: Date,
      },
    },
    attachments: [
      {
        filename: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        fileType: {
          type: String,
          required: true,
        },
        fileSize: {
          type: Number, // in bytes
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    links: [
      {
        title: {
          type: String,
          required: true,
          trim: true,
          maxlength: [50, "Link title cannot exceed 50 characters"],
        },
        url: {
          type: String,
          required: true,
          trim: true,
        },
        openInNewTab: {
          type: Boolean,
          default: true,
        },
      },
    ],
    readBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    statistics: {
      views: {
        type: Number,
        default: 0,
      },
      clicks: {
        type: Number,
        default: 0,
      },
      shares: {
        type: Number,
        default: 0,
      },
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
announcementSchema.index({ isActive: 1, isPinned: -1, createdAt: -1 });
announcementSchema.index({ createdBy: 1 });
announcementSchema.index({ category: 1 });
announcementSchema.index({ type: 1 });
announcementSchema.index({ targetAudience: 1 });
announcementSchema.index({ "scheduling.publishAt": 1 });
announcementSchema.index({ "scheduling.expireAt": 1 });

// Text search index
announcementSchema.index(
  {
    title: "text",
    message: "text",
  },
  {
    weights: {
      title: 10,
      message: 1,
    },
  }
);

// Virtual fields
announcementSchema.virtual("isPublished").get(function () {
  return this.scheduling.publishAt <= new Date();
});

announcementSchema.virtual("isExpired").get(function () {
  return this.scheduling.expireAt && this.scheduling.expireAt <= new Date();
});

announcementSchema.virtual("shouldDisplay").get(function () {
  const now = new Date();
  const isPublished = this.scheduling.publishAt <= now;
  const isNotExpired =
    !this.scheduling.expireAt || this.scheduling.expireAt > now;
  return this.isActive && isPublished && isNotExpired;
});

announcementSchema.virtual("readCount").get(function () {
  return this.readBy.length;
});

// Instance methods
announcementSchema.methods.markAsRead = function (userId) {
  const alreadyRead = this.readBy.some(
    (read) => read.userId.toString() === userId.toString()
  );

  if (!alreadyRead) {
    this.readBy.push({ userId });
    return this.save({ validateBeforeSave: false });
  }
  return Promise.resolve(this);
};

announcementSchema.methods.isReadBy = function (userId) {
  return this.readBy.some(
    (read) => read.userId.toString() === userId.toString()
  );
};

announcementSchema.methods.incrementViews = function () {
  this.statistics.views += 1;
  return this.save({ validateBeforeSave: false });
};

announcementSchema.methods.incrementClicks = function () {
  this.statistics.clicks += 1;
  return this.save({ validateBeforeSave: false });
};

announcementSchema.methods.incrementShares = function () {
  this.statistics.shares += 1;
  return this.save({ validateBeforeSave: false });
};

announcementSchema.methods.pin = function () {
  this.isPinned = true;
  return this.save();
};

announcementSchema.methods.unpin = function () {
  this.isPinned = false;
  return this.save();
};

announcementSchema.methods.activate = function () {
  this.isActive = true;
  return this.save();
};

announcementSchema.methods.deactivate = function () {
  this.isActive = false;
  return this.save();
};

announcementSchema.methods.updateModifiedBy = function (userId) {
  this.lastModifiedBy = userId;
  return this.save();
};

// Static methods
announcementSchema.statics.findActiveAnnouncements = function (
  targetAudience = "all",
  limit = 10,
  skip = 0
) {
  const now = new Date();

  const query = {
    isActive: true,
    "scheduling.publishAt": { $lte: now },
    $or: [
      { "scheduling.expireAt": { $exists: false } },
      { "scheduling.expireAt": null },
      { "scheduling.expireAt": { $gt: now } },
    ],
  };

  if (targetAudience !== "all") {
    query.$or = [{ targetAudience: "all" }, { targetAudience: targetAudience }];
  }

  return this.find(query)
    .populate("createdBy lastModifiedBy", "name email")
    .sort({ isPinned: -1, createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

announcementSchema.statics.findDashboardAnnouncements = function (
  targetAudience = "all",
  limit = 5
) {
  const now = new Date();

  const query = {
    isActive: true,
    "displaySettings.showOnDashboard": true,
    "scheduling.publishAt": { $lte: now },
    $or: [
      { "scheduling.expireAt": { $exists: false } },
      { "scheduling.expireAt": null },
      { "scheduling.expireAt": { $gt: now } },
    ],
  };

  if (targetAudience !== "all") {
    query.$or = [{ targetAudience: "all" }, { targetAudience: targetAudience }];
  }

  return this.find(query)
    .populate("createdBy", "name email")
    .sort({ isPinned: -1, type: 1, createdAt: -1 })
    .limit(limit);
};

announcementSchema.statics.findUnreadAnnouncements = function (
  userId,
  targetAudience = "all",
  limit = 10
) {
  const now = new Date();

  const query = {
    isActive: true,
    "scheduling.publishAt": { $lte: now },
    "readBy.userId": { $ne: userId },
    $or: [
      { "scheduling.expireAt": { $exists: false } },
      { "scheduling.expireAt": null },
      { "scheduling.expireAt": { $gt: now } },
    ],
  };

  if (targetAudience !== "all") {
    query.$or = [{ targetAudience: "all" }, { targetAudience: targetAudience }];
  }

  return this.find(query)
    .populate("createdBy", "name email")
    .sort({ isPinned: -1, createdAt: -1 })
    .limit(limit);
};

announcementSchema.statics.findScheduledAnnouncements = function (
  limit = 20,
  skip = 0
) {
  const now = new Date();

  return this.find({
    "scheduling.publishAt": { $gt: now },
  })
    .populate("createdBy lastModifiedBy", "name email")
    .sort({ "scheduling.publishAt": 1 })
    .limit(limit)
    .skip(skip);
};

announcementSchema.statics.findExpiredAnnouncements = function (
  limit = 20,
  skip = 0
) {
  const now = new Date();

  return this.find({
    "scheduling.expireAt": { $lte: now },
  })
    .populate("createdBy lastModifiedBy", "name email")
    .sort({ "scheduling.expireAt": -1 })
    .limit(limit)
    .skip(skip);
};

announcementSchema.statics.getAnnouncementStats = function () {
  return this.aggregate([
    {
      $group: {
        _id: {
          type: "$type",
          category: "$category",
          isActive: "$isActive",
        },
        count: { $sum: 1 },
        totalViews: { $sum: "$statistics.views" },
        totalClicks: { $sum: "$statistics.clicks" },
        totalShares: { $sum: "$statistics.shares" },
        avgReadCount: { $avg: { $size: "$readBy" } },
      },
    },
    {
      $group: {
        _id: null,
        breakdown: {
          $push: {
            type: "$_id.type",
            category: "$_id.category",
            isActive: "$_id.isActive",
            count: "$count",
            totalViews: "$totalViews",
            totalClicks: "$totalClicks",
            totalShares: "$totalShares",
            avgReadCount: "$avgReadCount",
          },
        },
        totalAnnouncements: { $sum: "$count" },
        totalViews: { $sum: "$totalViews" },
        totalClicks: { $sum: "$totalClicks" },
        totalShares: { $sum: "$totalShares" },
      },
    },
  ]);
};

announcementSchema.statics.cleanupExpiredAnnouncements = function () {
  const now = new Date();

  return this.updateMany(
    {
      "scheduling.expireAt": { $lte: now },
      isActive: true,
    },
    {
      $set: { isActive: false },
    }
  );
};

// Pre-save middleware
announcementSchema.pre("save", function (next) {
  // Validate expiration date
  if (
    this.scheduling.expireAt &&
    this.scheduling.expireAt <= this.scheduling.publishAt
  ) {
    return next(new Error("Expiration date must be after publish date"));
  }

  // Auto-calculate expiration for auto-hide announcements
  if (
    this.displaySettings.autoHide &&
    this.displaySettings.hideAfterDays &&
    !this.scheduling.expireAt
  ) {
    this.scheduling.expireAt = new Date(
      this.scheduling.publishAt.getTime() +
        this.displaySettings.hideAfterDays * 24 * 60 * 60 * 1000
    );
  }

  next();
});

module.exports = mongoose.model("Announcement", announcementSchema);
