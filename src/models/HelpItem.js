const mongoose = require("mongoose");
const { HELP_CATEGORIES, QUANTITY_UNITS } = require("../utils/constants");

const helpItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Help item name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
      maxlength: [50, "Name cannot exceed 50 characters"],
      unique: true,
    },
    category: {
      type: String,
      enum: Object.values(HELP_CATEGORIES),
      required: [true, "Category is required"],
    },
    defaultQuantityUnit: {
      type: String,
      enum: Object.values(QUANTITY_UNITS),
      required: [true, "Default quantity unit is required"],
      default: QUANTITY_UNITS.PIECES,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    icon: {
      type: String, // URL to icon or icon class name
      trim: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    priority: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
helpItemSchema.index({ name: 1 });
helpItemSchema.index({ category: 1 });
helpItemSchema.index({ isActive: 1 });
helpItemSchema.index({ priority: -1 });
helpItemSchema.index({ createdAt: -1 });
helpItemSchema.index({ tags: 1 });

// Text search index for searching by name, description, and tags
helpItemSchema.index(
  {
    name: "text",
    description: "text",
    tags: "text",
  },
  {
    weights: {
      name: 10,
      tags: 5,
      description: 1,
    },
  }
);

// Instance methods
helpItemSchema.methods.activate = function () {
  this.isActive = true;
  return this.save();
};

helpItemSchema.methods.deactivate = function () {
  this.isActive = false;
  return this.save();
};

helpItemSchema.methods.updateModifiedBy = function (userId) {
  this.lastModifiedBy = userId;
  return this.save();
};

// Static methods
helpItemSchema.statics.findActiveItems = function (limit = 50, skip = 0) {
  return this.find({ isActive: true })
    .sort({ priority: -1, name: 1 })
    .limit(limit)
    .skip(skip)
    .populate("createdBy lastModifiedBy", "name email");
};

helpItemSchema.statics.findByCategory = function (category, activeOnly = true) {
  const query = { category };
  if (activeOnly) {
    query.isActive = true;
  }
  return this.find(query)
    .sort({ priority: -1, name: 1 })
    .populate("createdBy lastModifiedBy", "name email");
};

helpItemSchema.statics.searchItems = function (searchTerm, limit = 20) {
  return this.find({
    $and: [
      { isActive: true },
      {
        $or: [
          { name: { $regex: searchTerm, $options: "i" } },
          { description: { $regex: searchTerm, $options: "i" } },
          { tags: { $in: [new RegExp(searchTerm, "i")] } },
        ],
      },
    ],
  })
    .sort({ priority: -1, name: 1 })
    .limit(limit)
    .populate("createdBy", "name email");
};

helpItemSchema.statics.getAllCategories = function () {
  return this.distinct("category", { isActive: true });
};

helpItemSchema.statics.getItemStats = function () {
  return this.aggregate([
    {
      $group: {
        _id: "$category",
        totalItems: { $sum: 1 },
        activeItems: {
          $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
        },
        inactiveItems: {
          $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] },
        },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);
};

// Pre-save middleware
helpItemSchema.pre("save", function (next) {
  // Convert name to title case
  if (this.isModified("name")) {
    this.name = this.name
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  // Clean and lowercase tags
  if (this.isModified("tags")) {
    this.tags = this.tags
      .filter((tag) => tag && tag.trim())
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag, index, arr) => arr.indexOf(tag) === index); // Remove duplicates
  }

  next();
});

module.exports = mongoose.model("HelpItem", helpItemSchema);
