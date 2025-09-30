const User = require("../models/User");
const HelpRequest = require("../models/HelpRequest");
const Announcement = require("../models/Announcement");
const locationService = require("../services/locationService");
const {
  formatResponse,
  getPaginationInfo,
  isValidEmail,
  comparePassword,
  isValidPhone,
} = require("../utils/helpers");
const { MESSAGES, USER_STATUS } = require("../utils/constants");

class UserController {
  /**
   * Get user dashboard with personalized content
   */
  async getDashboard(req, res) {
    try {
      const user = await User.findById(req.user.userId).select(
        "-password -refreshTokens"
      );

      // Get user's announcements
      const targetAudience = user.role === "admin" ? "all" : "approved_users";
      const announcements = await Announcement.findDashboardAnnouncements(
        targetAudience,
        5
      );

      // Get user's help request statistics
      const userRequestStats = {
        total: await HelpRequest.countDocuments({
          recipientId: req.user.userId,
        }),
        open: await HelpRequest.countDocuments({
          recipientId: req.user.userId,
          status: "open",
        }),
        approved: await HelpRequest.countDocuments({
          recipientId: req.user.userId,
          status: "approved",
        }),
        completed: await HelpRequest.countDocuments({
          recipientId: req.user.userId,
          status: "completed",
        }),
      };

      // Get user's donation statistics (as donor)
      const donationStats = {
        total: await HelpRequest.countDocuments({ donorId: req.user.userId }),
        approved: await HelpRequest.countDocuments({
          donorId: req.user.userId,
          status: "approved",
        }),
        completed: await HelpRequest.countDocuments({
          donorId: req.user.userId,
          status: "completed",
        }),
      };

      // Get nearby help requests only if user has coordinates
      let otherRequests = [];
      if (user.coordinates && user.coordinates.latitude && user.coordinates.longitude) {
        const nearbyRequests = await HelpRequest.findNearbyRequests(
          user.coordinates.latitude,
          user.coordinates.longitude,
          10, // 10km radius
          5 // limit to 5 requests
        );

        // Filter out user's own requests
        otherRequests = nearbyRequests.filter(
          (request) =>
            request.recipientId._id.toString() !== req.user.userId.toString()
        );
      }

      // Get recent activity
      const recentRequests = await HelpRequest.findUserRequests(
        req.user.userId,
        null,
        3
      );

      const dashboardData = {
        user: {
          ...user.toJSON(),
          accountStatus: user.status,
          isEmailVerified: user.isEmailVerified,
        },
        statistics: {
          myRequests: userRequestStats,
          myDonations: donationStats,
        },
        announcements,
        nearbyHelp: otherRequests,
        recentActivity: recentRequests,
        lastUpdated: new Date(),
      };

      res.json(
        formatResponse(true, "Dashboard retrieved successfully", dashboardData)
      );
    } catch (error) {
      console.error("Get dashboard error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req, res) {
    try {
      const updates = req.body;
      const user = await User.findById(req.user.userId);

      // If zipCode is being updated, get new coordinates
      if (updates.zipCode && updates.zipCode !== user.zipCode) {
        const coordinatesResult = await locationService.getCoordinates(
          updates.zipCode
        );
        if (!coordinatesResult.success) {
          return res
            .status(400)
            .json(formatResponse(false, "Invalid zip code"));
        }
        updates.coordinates = coordinatesResult.data;
      }

      // Update user fields
      Object.keys(updates).forEach((key) => {
        if (key !== "email" && key !== "password" && key !== "role") {
          user[key] = updates[key];
        }
      });

      await user.save();

      console.log(`👤 Profile updated for user: ${user.email}`);

      res.json(
        formatResponse(true, MESSAGES.SUCCESS.PROFILE_UPDATED, {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            zipCode: user.zipCode,
            address: user.address,
            coordinates: user.coordinates,
          },
        })
      );
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Get user's help requests
   */
  async getMyRequests(req, res) {
    try {
      const { page = 1, limit = 10, status } = req.query;
      const skip = (page - 1) * limit;

      // Build query for user's requests
      let query = { recipientId: req.user.userId };

      // Add status filter if provided and valid
      console.log("Status filter:", status);
      
      if (status) {
        const { HELP_REQUEST_STATUS } = require("../utils/constants");
        if (Object.values(HELP_REQUEST_STATUS).includes(status)) {
          query.status = status;
        }
      }

      console.log("User requests query:", JSON.stringify(query, null, 2));

      // Get requests with population
      const requests = await HelpRequest.find(query)
        .populate("recipientId", "name email phone")
        .populate("donorId", "name email phone")
        .populate("items.itemId", "name category defaultQuantityUnit")
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip);

      const total = await HelpRequest.countDocuments(query);

      const pagination = getPaginationInfo(
        parseInt(page),
        parseInt(limit),
        total
      );

      res.json(
        formatResponse(
          true,
          "Your help requests retrieved successfully",
          {
            requests,
            appliedFilters: {
              status
            }
          },
          { pagination }
        )
      );
    } catch (error) {
      console.error("Get my requests error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Get user's donations (requests they've approved)
   */
  async getMyDonations(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;

      const donations = await HelpRequest.findDonorRequests(
        req.user.userId,
        parseInt(limit),
        skip
      );

      const total = await HelpRequest.countDocuments({
        donorId: req.user.userId,
      });
      const pagination = getPaginationInfo(
        parseInt(page),
        parseInt(limit),
        total
      );

      res.json(
        formatResponse(
          true,
          "Your donations retrieved successfully",
          { donations },
          { pagination }
        )
      );
    } catch (error) {
      console.error("Get my donations error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Get nearby help requests for user
   */
  async getNearbyRequests(req, res) {
    try {
      const {
        radius = 10,
        page = 1,
        limit = 20,
        category,
        priority,
      } = req.query;
      const skip = (page - 1) * limit;

      const user = await User.findById(req.user.userId);

      // Base query for nearby requests
      let query = {
        status: "open",
        recipientId: { $ne: req.user.userId }, // Exclude user's own requests
        "availabilityWindow.endDate": { $gt: new Date() },
        "pickupLocation.coordinates": {
          $geoWithin: {
            $centerSphere: [
              [user.coordinates.longitude, user.coordinates.latitude],
              parseFloat(radius) / 6371, // Convert km to radians
            ],
          },
        },
      };

      // Add filters
      if (category) query.category = category;
      if (priority) query.priority = priority;

      const requests = await HelpRequest.find(query)
        .populate("recipientId", "name phone email")
        .populate("items.itemId", "name category defaultQuantityUnit")
        .sort({ priority: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip);

      // Calculate distances
      const requestsWithDistance = requests.map((request) => {
        const distance = locationService.calculateDistance(
          user.coordinates.latitude,
          user.coordinates.longitude,
          request.pickupLocation.coordinates.latitude,
          request.pickupLocation.coordinates.longitude
        );

        return {
          ...request.toJSON(),
          distance: distance,
          distanceFormatted: locationService.formatDistance(distance),
        };
      });

      const total = await HelpRequest.countDocuments(query);
      const pagination = getPaginationInfo(
        parseInt(page),
        parseInt(limit),
        total
      );

      res.json(
        formatResponse(
          true,
          "Nearby help requests retrieved successfully",
          { requests: requestsWithDistance },
          { pagination }
        )
      );
    } catch (error) {
      console.error("Get nearby requests error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Get user notifications (unread announcements)
   */
  async getNotifications(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;

      const user = await User.findById(req.user.userId);
      const targetAudience = user.role === "admin" ? "all" : "approved_users";

      const notifications = await Announcement.findUnreadAnnouncements(
        req.user.userId,
        targetAudience,
        parseInt(limit)
      );

      res.json(
        formatResponse(true, "Notifications retrieved successfully", {
          notifications,
          unreadCount: notifications.length,
        })
      );
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(req, res) {
    try {
      const { notificationId } = req.params;

      const notification = await Announcement.findById(notificationId);
      if (!notification) {
        return res
          .status(404)
          .json(formatResponse(false, "Notification not found"));
      }

      await notification.markAsRead(req.user.userId);

      res.json(formatResponse(true, "Notification marked as read"));
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsRead(req, res) {
    try {
      const user = await User.findById(req.user.userId);
      const targetAudience = user.role === "admin" ? "all" : "approved_users";

      const unreadNotifications = await Announcement.findUnreadAnnouncements(
        req.user.userId,
        targetAudience,
        100 // Get more to mark all as read
      );

      for (const notification of unreadNotifications) {
        await notification.markAsRead(req.user.userId);
      }

      res.json(
        formatResponse(
          true,
          `${unreadNotifications.length} notifications marked as read`
        )
      );
    } catch (error) {
      console.error("Mark all notifications read error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(req, res) {
    try {
      const stats = {
        helpRequests: {
          total: await HelpRequest.countDocuments({
            recipientId: req.user.userId,
          }),
          open: await HelpRequest.countDocuments({
            recipientId: req.user.userId,
            status: "open",
          }),
          approved: await HelpRequest.countDocuments({
            recipientId: req.user.userId,
            status: "approved",
          }),
          completed: await HelpRequest.countDocuments({
            recipientId: req.user.userId,
            status: "completed",
          }),
        },
        donations: {
          total: await HelpRequest.countDocuments({ donorId: req.user.userId }),
          approved: await HelpRequest.countDocuments({
            donorId: req.user.userId,
            status: "approved",
          }),
          completed: await HelpRequest.countDocuments({
            donorId: req.user.userId,
            status: "completed",
          }),
        },
        profile: {
          memberSince: (await User.findById(req.user.userId)).createdAt,
          lastLogin: (await User.findById(req.user.userId)).lastLoginAt,
          accountStatus: req.user.status,
          isEmailVerified: (await User.findById(req.user.userId))
            .isEmailVerified,
        },
      };

      // Calculate completion rates
      stats.helpRequests.completionRate =
        stats.helpRequests.total > 0
          ? (
              (stats.helpRequests.completed / stats.helpRequests.total) *
              100
            ).toFixed(2)
          : 0;

      stats.donations.completionRate =
        stats.donations.total > 0
          ? ((stats.donations.completed / stats.donations.total) * 100).toFixed(
              2
            )
          : 0;

      res.json(
        formatResponse(true, "User statistics retrieved successfully", stats)
      );
    } catch (error) {
      console.error("Get user stats error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Delete user account - PERMANENTLY removes all user data
   */
  async deleteAccount(req, res) {
    try {
      const { password } = req.body;

      if (!password) {
        return res
          .status(400)
          .json(
            formatResponse(false, "Password is required to delete account")
          );
      }

      const user = await User.findById(req.user.userId);
      const isPasswordValid = await comparePassword(password, user.password);

      if (!isPasswordValid) {
        return res.status(400).json(formatResponse(false, "Invalid password"));
      }

      // Check for active help requests
      const activeRequests = await HelpRequest.countDocuments({
        $or: [
          {
            recipientId: req.user.userId,
            status: { $in: ["open", "approved"] },
          },
          { donorId: req.user.userId, status: "approved" },
        ],
      });

      if (activeRequests > 0) {
        return res
          .status(400)
          .json(
            formatResponse(
              false,
              "Cannot delete account with active help requests. Please complete or cancel them first."
            )
          );
      }

      const userEmail = user.email;
      const userId = user._id;

      // PERMANENTLY DELETE ALL USER DATA

      // 1. Delete all OTP records for this user
      const OTP = require("../models/OTP");
      await OTP.deleteMany({ email: userEmail });
      console.log(`🗑️ Deleted OTP records for: ${userEmail}`);

      // 2. Delete all help requests where user is recipient
      const deletedRecipientRequests = await HelpRequest.deleteMany({
        recipientId: userId
      });
      console.log(`🗑️ Deleted ${deletedRecipientRequests.deletedCount} help requests as recipient`);

      // 3. Remove user as donor from help requests and clean up donor references
      const donorRequests = await HelpRequest.updateMany(
        { donorId: userId },
        {
          $unset: {
            donorId: "",
            approvedAt: "",
            "rating.donorRating": ""
          },
          $set: { status: "open" }
        }
      );
      console.log(`🗑️ Cleaned up ${donorRequests.modifiedCount} help requests as donor`);

      // 4. Remove user from help request notes, interested users, and flagged records
      await HelpRequest.updateMany(
        {},
        {
          $pull: {
            "notes": { author: userId },
            "metadata.interested": { userId: userId }
          },
          $unset: {
            "metadata.flagged.flaggedBy": userId
          }
        }
      );
      console.log(`🗑️ Removed user references from help request metadata`);

      // 5. Delete announcements created by user
      const deletedAnnouncements = await Announcement.deleteMany({
        createdBy: userId
      });
      console.log(`🗑️ Deleted ${deletedAnnouncements.deletedCount} announcements created by user`);

      // 6. Remove user from announcement read records and creator references
      await Announcement.updateMany(
        {},
        {
          $pull: {
            "readBy": { userId: userId }
          },
          $unset: {
            "lastModifiedBy": userId
          }
        }
      );
      console.log(`🗑️ Cleaned up user references in announcements`);

      // 7. Finally, delete the user account permanently
      await User.findByIdAndDelete(userId);
      console.log(`🗑️ PERMANENTLY DELETED user account: ${userEmail}`);

      res.json(formatResponse(true, "Account and all associated data deleted permanently"));
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Get user activity feed
   */
  async getActivityFeed(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const skip = (page - 1) * limit;

      // Get user's recent help requests
      const recentRequests = await HelpRequest.find({
        $or: [{ recipientId: req.user.userId }, { donorId: req.user.userId }],
      })
        .populate("recipientId donorId", "name")
        .populate("items.itemId", "name")
        .sort({ updatedAt: -1 })
        .limit(parseInt(limit))
        .skip(skip);

      // Format activity feed
      const activities = recentRequests.map((request) => ({
        id: request._id,
        type:
          request.recipientId._id.toString() === req.user.userId
            ? "request"
            : "donation",
        title: request.title,
        status: request.status,
        updatedAt: request.updatedAt,
        createdAt: request.createdAt,
      }));

      const total = await HelpRequest.countDocuments({
        $or: [{ recipientId: req.user.userId }, { donorId: req.user.userId }],
      });

      const pagination = getPaginationInfo(
        parseInt(page),
        parseInt(limit),
        total
      );

      res.json(
        formatResponse(
          true,
          "Activity feed retrieved successfully",
          { activities },
          { pagination }
        )
      );
    } catch (error) {
      console.error("Get activity feed error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }
}

module.exports = new UserController();
