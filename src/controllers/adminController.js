const User = require("../models/User");
const HelpItem = require("../models/HelpItem");
const HelpRequest = require("../models/HelpRequest");
const Announcement = require("../models/Announcement");
const emailService = require("../services/emailService");
const otpService = require("../services/otpService");
const locationService = require("../services/locationService");
const { formatResponse, getPaginationInfo } = require("../utils/helpers");
const {
  MESSAGES,
  USER_STATUS,
  DEFAULT_HELP_ITEMS,
} = require("../utils/constants");

class AdminController {
  /**
   * Get admin dashboard statistics
   */
  async getDashboardStats(req, res) {
    try {
      // Get user statistics
      const totalUsers = await User.countDocuments();
      const pendingUsers = await User.countDocuments({
        status: USER_STATUS.PENDING,
      });
      const approvedUsers = await User.countDocuments({
        status: USER_STATUS.APPROVED,
      });
      const rejectedUsers = await User.countDocuments({
        status: USER_STATUS.REJECTED,
      });

      // Get help request statistics
      const helpRequestStats = await HelpRequest.getRequestStats();
      const totalHelpRequests = await HelpRequest.countDocuments();
      const openRequests = await HelpRequest.countDocuments({ status: "open" });
      const approvedRequests = await HelpRequest.countDocuments({
        status: "approved",
      });
      const completedRequests = await HelpRequest.countDocuments({
        status: "completed",
      });

      // Get help items statistics
      const totalHelpItems = await HelpItem.countDocuments();
      const activeHelpItems = await HelpItem.countDocuments({ isActive: true });
      const helpItemStats = await HelpItem.getItemStats();

      // Get announcement statistics
      const totalAnnouncements = await Announcement.countDocuments();
      const activeAnnouncements = await Announcement.countDocuments({
        isActive: true,
      });
      const announcementStats = await Announcement.getAnnouncementStats();

      // Get recent activity (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentUsers = await User.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
      });
      const recentRequests = await HelpRequest.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
      });

      // Get OTP statistics
      const otpStats = await otpService.getOTPStats();

      // Calculate conversion rates
      const userApprovalRate =
        totalUsers > 0 ? ((approvedUsers / totalUsers) * 100).toFixed(2) : 0;
      const requestCompletionRate =
        totalHelpRequests > 0
          ? ((completedRequests / totalHelpRequests) * 100).toFixed(2)
          : 0;

      const dashboardData = {
        users: {
          total: totalUsers,
          pending: pendingUsers,
          approved: approvedUsers,
          rejected: rejectedUsers,
          recent: recentUsers,
          approvalRate: parseFloat(userApprovalRate),
        },
        helpRequests: {
          total: totalHelpRequests,
          open: openRequests,
          approved: approvedRequests,
          completed: completedRequests,
          recent: recentRequests,
          completionRate: parseFloat(requestCompletionRate),
          statistics: helpRequestStats,
        },
        helpItems: {
          total: totalHelpItems,
          active: activeHelpItems,
          statistics: helpItemStats,
        },
        announcements: {
          total: totalAnnouncements,
          active: activeAnnouncements,
          statistics: announcementStats,
        },
        otp: otpStats,
        lastUpdated: new Date(),
      };

      res.json(
        formatResponse(
          true,
          "Dashboard statistics retrieved successfully",
          dashboardData
        )
      );
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Get pending users for approval
   */
  async getPendingUsers(req, res) {
    try {
      const { page = 1, limit = 20, search } = req.query;
      const skip = (page - 1) * limit;

      let query = { status: USER_STATUS.PENDING };

      // Add search functionality
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { zipCode: { $regex: search, $options: "i" } },
        ];
      }

      const users = await User.find(query)
        .select("-password -refreshTokens")
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip);

      const total = await User.countDocuments(query);
      const pagination = getPaginationInfo(
        parseInt(page),
        parseInt(limit),
        total
      );

      res.json(
        formatResponse(
          true,
          "Pending users retrieved successfully",
          { users },
          { pagination }
        )
      );
    } catch (error) {
      console.error("Get pending users error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Get all users with filtering
   */
  async getAllUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;
      const skip = (page - 1) * limit;

      let query = {};

      // Filter by status
      if (status && Object.values(USER_STATUS).includes(status)) {
        query.status = status;
      }

      // Add search functionality
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { zipCode: { $regex: search, $options: "i" } },
        ];
      }

      const sortOptions = {};
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

      const users = await User.find(query)
        .select("-password -refreshTokens")
        .sort(sortOptions)
        .limit(parseInt(limit))
        .skip(skip);

      const total = await User.countDocuments(query);
      const pagination = getPaginationInfo(
        parseInt(page),
        parseInt(limit),
        total
      );

      res.json(
        formatResponse(
          true,
          "Users retrieved successfully",
          { users },
          { pagination }
        )
      );
    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Approve user account
   */
  async approveUser(req, res) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json(formatResponse(false, MESSAGES.ERROR.USER_NOT_FOUND));
      }

      if (user.status === USER_STATUS.APPROVED) {
        return res
          .status(400)
          .json(formatResponse(false, "User is already approved"));
      }

      // Update user status
      user.status = USER_STATUS.APPROVED;
      await user.save();

      // Send approval email
      try {
        await emailService.sendAccountApproved(user.email, user.name);
      } catch (emailError) {
        console.error("Failed to send approval email:", emailError);
        // Don't fail the request if email fails
      }

      console.log(`✅ User approved by admin ${req.user.email}: ${user.email}`);

      res.json(
        formatResponse(true, MESSAGES.SUCCESS.USER_APPROVED, {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            status: user.status,
          },
        })
      );
    } catch (error) {
      console.error("Approve user error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Reject user account
   */
  async rejectUser(req, res) {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res
          .status(404)
          .json(formatResponse(false, MESSAGES.ERROR.USER_NOT_FOUND));
      }

      if (user.status === USER_STATUS.REJECTED) {
        return res
          .status(400)
          .json(formatResponse(false, "User is already rejected"));
      }

      // Update user status
      user.status = USER_STATUS.REJECTED;
      await user.save();

      // Send rejection email
      try {
        await emailService.sendAccountRejected(user.email, user.name, reason);
      } catch (emailError) {
        console.error("Failed to send rejection email:", emailError);
        // Don't fail the request if email fails
      }

      console.log(
        `❌ User rejected by admin ${req.user.email}: ${user.email} - Reason: ${reason}`
      );

      res.json(
        formatResponse(true, MESSAGES.SUCCESS.USER_REJECTED, {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            status: user.status,
          },
        })
      );
    } catch (error) {
      console.error("Reject user error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Bulk approve/reject users
   */
  async bulkUpdateUsers(req, res) {
    try {
      const { userIds, action, reason } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res
          .status(400)
          .json(formatResponse(false, "User IDs array is required"));
      }

      if (!["approve", "reject"].includes(action)) {
        return res
          .status(400)
          .json(
            formatResponse(false, "Invalid action. Must be approve or reject")
          );
      }

      const status =
        action === "approve" ? USER_STATUS.APPROVED : USER_STATUS.REJECTED;
      const users = await User.find({ _id: { $in: userIds } });

      const results = [];

      for (const user of users) {
        try {
          user.status = status;
          await user.save();

          // Send appropriate email
          if (action === "approve") {
            await emailService.sendAccountApproved(user.email, user.name);
          } else {
            await emailService.sendAccountRejected(
              user.email,
              user.name,
              reason
            );
          }

          results.push({
            userId: user._id,
            email: user.email,
            status: "success",
            newStatus: status,
          });
        } catch (error) {
          results.push({
            userId: user._id,
            email: user.email || "Unknown",
            status: "error",
            error: error.message,
          });
        }
      }

      const successCount = results.filter((r) => r.status === "success").length;

      console.log(
        `🔄 Bulk ${action} completed by admin ${req.user.email}: ${successCount}/${results.length} users`
      );

      res.json(
        formatResponse(
          true,
          `Bulk ${action} completed: ${successCount}/${results.length} users updated`,
          { results }
        )
      );
    } catch (error) {
      console.error("Bulk update users error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Get help items with management capabilities
   */
  async getHelpItems(req, res) {
    try {
      const { page = 1, limit = 50, category, active, search } = req.query;
      const skip = (page - 1) * limit;

      let query = {};

      if (category) query.category = category;
      if (active !== undefined) query.isActive = active === "true";

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
          { tags: { $in: [new RegExp(search, "i")] } },
        ];
      }

      const items = await HelpItem.find(query)
        .populate("createdBy lastModifiedBy", "name email")
        .sort({ priority: -1, name: 1 })
        .limit(parseInt(limit))
        .skip(skip);

      const total = await HelpItem.countDocuments(query);
      const pagination = getPaginationInfo(
        parseInt(page),
        parseInt(limit),
        total
      );

      res.json(
        formatResponse(
          true,
          "Help items retrieved successfully",
          { items },
          { pagination }
        )
      );
    } catch (error) {
      console.error("Get help items error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Create new help item
   */
  async createHelpItem(req, res) {
    try {
      const itemData = {
        ...req.body,
        createdBy: req.user.userId,
        lastModifiedBy: req.user.userId,
      };

      const helpItem = new HelpItem(itemData);
      await helpItem.save();

      await helpItem.populate("createdBy lastModifiedBy", "name email");

      console.log(
        `📦 Help item created by admin ${req.user.email}: ${helpItem.name}`
      );

      res.status(201).json(
        formatResponse(true, "Help item created successfully", {
          item: helpItem,
        })
      );
    } catch (error) {
      console.error("Create help item error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Update help item
   */
  async updateHelpItem(req, res) {
    try {
      const { itemId } = req.params;

      const helpItem = await HelpItem.findById(itemId);
      if (!helpItem) {
        return res
          .status(404)
          .json(formatResponse(false, "Help item not found"));
      }

      Object.assign(helpItem, req.body);
      helpItem.lastModifiedBy = req.user.userId;
      await helpItem.save();

      await helpItem.populate("createdBy lastModifiedBy", "name email");

      console.log(
        `📝 Help item updated by admin ${req.user.email}: ${helpItem.name}`
      );

      res.json(
        formatResponse(true, "Help item updated successfully", {
          item: helpItem,
        })
      );
    } catch (error) {
      console.error("Update help item error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Delete help item
   */
  async deleteHelpItem(req, res) {
    try {
      const { itemId } = req.params;

      const helpItem = await HelpItem.findById(itemId);
      if (!helpItem) {
        return res
          .status(404)
          .json(formatResponse(false, "Help item not found"));
      }

      // Check if item is being used in any active help requests
      const activeRequests = await HelpRequest.countDocuments({
        "items.itemId": itemId,
        status: { $in: ["open", "approved"] },
      });

      if (activeRequests > 0) {
        return res
          .status(400)
          .json(
            formatResponse(
              false,
              `Cannot delete help item. It is currently used in ${activeRequests} active help request(s). Deactivate it instead.`
            )
          );
      }

      await HelpItem.findByIdAndDelete(itemId);

      console.log(
        `🗑️ Help item deleted by admin ${req.user.email}: ${helpItem.name}`
      );

      res.json(formatResponse(true, "Help item deleted successfully"));
    } catch (error) {
      console.error("Delete help item error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Seed default help items
   */
  async seedHelpItems(req, res) {
    try {
      const existingItems = await HelpItem.countDocuments();

      if (existingItems > 0) {
        return res
          .status(400)
          .json(
            formatResponse(
              false,
              "Help items already exist. Use this endpoint only on empty database."
            )
          );
      }

      const itemsToCreate = DEFAULT_HELP_ITEMS.map((item) => ({
        ...item,
        createdBy: req.user.userId,
        lastModifiedBy: req.user.userId,
      }));

      const createdItems = await HelpItem.insertMany(itemsToCreate);

      console.log(
        `🌱 Default help items seeded by admin ${req.user.email}: ${createdItems.length} items`
      );

      res
        .status(201)
        .json(
          formatResponse(
            true,
            `${createdItems.length} default help items created successfully`,
            { items: createdItems }
          )
        );
    } catch (error) {
      console.error("Seed help items error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Get location statistics
   */
  async getLocationStats(req, res) {
    try {
      const users = await User.find({ status: USER_STATUS.APPROVED }).select(
        "zipCode coordinates"
      );

      const helpRequests = await HelpRequest.find().select(
        "pickupLocation.zipCode pickupLocation.coordinates"
      );

      const locationStats = locationService.getLocationStats(
        users,
        helpRequests
      );

      res.json(
        formatResponse(
          true,
          "Location statistics retrieved successfully",
          locationStats
        )
      );
    } catch (error) {
      console.error("Get location stats error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Get system health check
   */
  async getSystemHealth(req, res) {
    try {
      const health = {
        timestamp: new Date(),
        status: "healthy",
        services: {
          database: "connected",
          email: "unknown",
        },
        memory: process.memoryUsage(),
        uptime: process.uptime(),
      };

      // Check email service
      try {
        const emailHealthy = await emailService.verifyConfiguration();
        health.services.email = emailHealthy ? "connected" : "error";
      } catch (error) {
        health.services.email = "error";
      }

      // Determine overall status
      const allServicesHealthy = Object.values(health.services).every(
        (status) => status === "connected"
      );
      health.status = allServicesHealthy ? "healthy" : "degraded";

      res.json(
        formatResponse(true, "System health retrieved successfully", health)
      );
    } catch (error) {
      console.error("Get system health error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Delete rejected users
   */
  async deleteRejectedUsers(req, res) {
    try {
      const { userIds, deleteAll } = req.body;

      let query = { status: USER_STATUS.REJECTED };
      let deletedUsers = [];

      if (deleteAll) {
        // Delete all rejected users
        const rejectedUsers = await User.find(query).select("_id email name");

        if (rejectedUsers.length === 0) {
          return res.json(
            formatResponse(true, "No rejected users found to delete", {
              deletedCount: 0,
              deletedUsers: []
            })
          );
        }

        await User.deleteMany(query);
        deletedUsers = rejectedUsers;

        console.log(
          `🗑️ All rejected users deleted by admin ${req.user.email}: ${deletedUsers.length} users`
        );
      } else if (userIds && Array.isArray(userIds) && userIds.length > 0) {
        // Delete specific rejected users
        query._id = { $in: userIds };

        const rejectedUsers = await User.find(query).select("_id email name");

        if (rejectedUsers.length === 0) {
          return res
            .status(404)
            .json(formatResponse(false, "No rejected users found with provided IDs"));
        }

        await User.deleteMany(query);
        deletedUsers = rejectedUsers;

        console.log(
          `🗑️ Selected rejected users deleted by admin ${req.user.email}: ${deletedUsers.length} users`
        );
      } else {
        return res
          .status(400)
          .json(
            formatResponse(
              false,
              "Either provide userIds array or set deleteAll to true"
            )
          );
      }

      res.json(
        formatResponse(true, "Rejected users deleted successfully", {
          deletedCount: deletedUsers.length,
          deletedUsers: deletedUsers.map(user => ({
            id: user._id,
            email: user.email,
            name: user.name
          }))
        })
      );
    } catch (error) {
      console.error("Delete rejected users error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Get all users with comprehensive filtering and sorting
   */
  async getAllUsersComprehensive(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        role,
        isEmailVerified,
        search,
        zipCode,
        sortBy = "createdAt",
        sortOrder = "desc",
        createdAfter,
        createdBefore,
        lastLoginAfter,
        lastLoginBefore,
        hasLoggedIn,
      } = req.query;

      const skip = (page - 1) * limit;
      let query = {};

      // Status filter
      if (status) {
        query.status = status;
      }

      // Role filter
      if (role) {
        query.role = role;
      }

      // Email verification filter
      if (isEmailVerified !== undefined) {
        query.isEmailVerified = isEmailVerified === "true";
      }

      // Location filter
      if (zipCode) {
        query.zipCode = { $regex: zipCode, $options: "i" };
      }

      // Search functionality (name, email, phone)
      if (search && search.trim()) {
        const searchRegex = { $regex: search.trim(), $options: "i" };
        query.$or = [
          { name: searchRegex },
          { email: searchRegex },
          { phone: searchRegex },
        ];
      }

      // Date range filters for account creation
      if (createdAfter || createdBefore) {
        query.createdAt = {};
        if (createdAfter) {
          query.createdAt.$gte = new Date(createdAfter);
        }
        if (createdBefore) {
          query.createdAt.$lte = new Date(createdBefore);
        }
      }

      // Date range filters for last login
      if (lastLoginAfter || lastLoginBefore) {
        query.lastLoginAt = {};
        if (lastLoginAfter) {
          query.lastLoginAt.$gte = new Date(lastLoginAfter);
        }
        if (lastLoginBefore) {
          query.lastLoginAt.$lte = new Date(lastLoginBefore);
        }
      }

      // Filter users who have/haven't logged in
      if (hasLoggedIn !== undefined) {
        if (hasLoggedIn === "true") {
          query.lastLoginAt = { $exists: true, $ne: null };
        } else if (hasLoggedIn === "false") {
          query.lastLoginAt = { $exists: false };
        }
      }

      // Sorting configuration
      const allowedSortFields = [
        "name",
        "email",
        "createdAt",
        "updatedAt",
        "lastLoginAt",
        "status",
        "zipCode",
        "role",
      ];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "createdAt";
      const sortDirection = sortOrder === "asc" ? 1 : -1;
      const sortOptions = { [sortField]: sortDirection };

      console.log("Query:", JSON.stringify(query, null, 2));

      // Execute main query
      const users = await User.find(query)
        .select("-password -refreshTokens")
        .sort(sortOptions)
        .limit(parseInt(limit))
        .skip(skip);

      const total = await User.countDocuments(query);

      const pagination = getPaginationInfo(
        parseInt(page),
        parseInt(limit),
        total
      );

      // Generate summary statistics - using separate queries to avoid $or issues
      const allUsersQuery = {}; // Empty query for all users stats

      const stats = {
        total,
        byStatus: await User.aggregate([
          { $group: { _id: "$status", count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        byRole: await User.aggregate([
          { $group: { _id: "$role", count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        emailVerified: await User.countDocuments({ isEmailVerified: true }),
        emailUnverified: await User.countDocuments({ isEmailVerified: false }),
      };

      // Add location distribution (top 10 zip codes)
      const locationStats = await User.aggregate([
        { $match: { zipCode: { $exists: true, $ne: null, $ne: "" } } },
        { $group: { _id: "$zipCode", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]);
      stats.topLocations = locationStats;

      // Recent activity stats
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      stats.recentUsers = await User.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
      });

      res.json(
        formatResponse(
          true,
          "Users retrieved successfully",
          {
            users,
            stats,
            appliedFilters: {
              status,
              role,
              isEmailVerified,
              search,
              zipCode,
              sortBy: sortField,
              sortOrder,
              createdAfter,
              createdBefore,
              lastLoginAfter,
              lastLoginBefore,
              hasLoggedIn,
            },
          },
          { pagination }
        )
      );
    } catch (error) {
      console.error("Get all users comprehensive error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }
}

module.exports = new AdminController();
