const Announcement = require("../models/Announcement");
const User = require("../models/User");
const emailService = require("../services/emailService");
const { formatResponse, getPaginationInfo } = require("../utils/helpers");
const { MESSAGES, USER_ROLES, USER_STATUS } = require("../utils/constants");

class AnnouncementController {
  /**
   * Get active announcements
   */
  async getAnnouncements(req, res) {
    try {
      const { page = 1, limit = 20, category, type } = req.query;
      const skip = (page - 1) * limit;

      // Determine target audience based on user
      let targetAudience = "all";
      if (req.user) {
        if (req.user.role === USER_ROLES.ADMIN) {
          targetAudience = "all";
        } else if (req.user.status === USER_STATUS.APPROVED) {
          targetAudience = "approved_users";
        } else if (req.user.status === USER_STATUS.PENDING) {
          targetAudience = "pending_users";
        }
      }

      let query = {
        isActive: true,
        "scheduling.publishAt": { $lte: new Date() },
        $or: [
          { "scheduling.expireAt": { $exists: false } },
          { "scheduling.expireAt": null },
          { "scheduling.expireAt": { $gt: new Date() } },
        ],
      };

      // Filter by target audience
      if (targetAudience !== "all") {
        query.$or = [
          { targetAudience: "all" },
          { targetAudience: targetAudience },
        ];
      }

      // Additional filters
      if (category) query.category = category;
      if (type) query.type = type;

      const announcements = await Announcement.find(query)
        .populate("createdBy", "name email")
        .sort({ isPinned: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip);

      const total = await Announcement.countDocuments(query);
      const pagination = getPaginationInfo(
        parseInt(page),
        parseInt(limit),
        total
      );

      res.json(
        formatResponse(
          true,
          "Announcements retrieved successfully",
          { announcements },
          { pagination }
        )
      );
    } catch (error) {
      console.error("Get announcements error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Get announcement by ID
   */
  async getAnnouncement(req, res) {
    try {
      const { announcementId } = req.params;

      const announcement = await Announcement.findById(announcementId).populate(
        "createdBy lastModifiedBy",
        "name email"
      );

      if (!announcement) {
        return res
          .status(404)
          .json(formatResponse(false, "Announcement not found"));
      }

      // Increment view count
      await announcement.incrementViews();

      // Mark as read if user is authenticated
      if (req.user) {
        await announcement.markAsRead(req.user.userId);
      }

      res.json(
        formatResponse(true, "Announcement retrieved successfully", {
          announcement,
        })
      );
    } catch (error) {
      console.error("Get announcement error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Create announcement (Admin only)
   */
  async createAnnouncement(req, res) {
    try {
      const announcementData = {
        ...req.body,
        createdBy: req.user.userId,
        lastModifiedBy: req.user.userId,
      };

      const announcement = new Announcement(announcementData);
      await announcement.save();

      await announcement.populate("createdBy lastModifiedBy", "name email");

      console.log(
        `📢 Announcement created by admin ${req.user.email}: ${announcement.title}`
      );

      // Send email notifications if enabled
      if (announcement.displaySettings.showInNotifications) {
        this.sendAnnouncementNotifications(announcement).catch((error) => {
          console.error("Failed to send announcement notifications:", error);
        });
      }

      res
        .status(201)
        .json(
          formatResponse(true, MESSAGES.SUCCESS.ANNOUNCEMENT_CREATED, {
            announcement,
          })
        );
    } catch (error) {
      console.error("Create announcement error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Update announcement (Admin only)
   */
  async updateAnnouncement(req, res) {
    try {
      const { announcementId } = req.params;
      const updates = req.body;

      const announcement = await Announcement.findById(announcementId);
      if (!announcement) {
        return res
          .status(404)
          .json(formatResponse(false, "Announcement not found"));
      }

      Object.assign(announcement, updates);
      announcement.lastModifiedBy = req.user.userId;
      await announcement.save();

      await announcement.populate("createdBy lastModifiedBy", "name email");

      console.log(
        `📝 Announcement updated by admin ${req.user.email}: ${announcement.title}`
      );

      res.json(
        formatResponse(true, "Announcement updated successfully", {
          announcement,
        })
      );
    } catch (error) {
      console.error("Update announcement error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Delete announcement (Admin only)
   */
  async deleteAnnouncement(req, res) {
    try {
      const { announcementId } = req.params;

      const announcement = await Announcement.findById(announcementId);
      if (!announcement) {
        return res
          .status(404)
          .json(formatResponse(false, "Announcement not found"));
      }

      await Announcement.findByIdAndDelete(announcementId);

      console.log(
        `🗑️ Announcement deleted by admin ${req.user.email}: ${announcement.title}`
      );

      res.json(formatResponse(true, "Announcement deleted successfully"));
    } catch (error) {
      console.error("Delete announcement error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Pin/unpin announcement (Admin only)
   */
  async togglePin(req, res) {
    try {
      const { announcementId } = req.params;

      const announcement = await Announcement.findById(announcementId);
      if (!announcement) {
        return res
          .status(404)
          .json(formatResponse(false, "Announcement not found"));
      }

      announcement.isPinned = !announcement.isPinned;
      await announcement.save();

      const action = announcement.isPinned ? "pinned" : "unpinned";
      console.log(
        `📌 Announcement ${action} by admin ${req.user.email}: ${announcement.title}`
      );

      res.json(
        formatResponse(true, `Announcement ${action} successfully`, {
          announcement: {
            id: announcement._id,
            title: announcement.title,
            isPinned: announcement.isPinned,
          },
        })
      );
    } catch (error) {
      console.error("Toggle pin error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Activate/deactivate announcement (Admin only)
   */
  async toggleActive(req, res) {
    try {
      const { announcementId } = req.params;

      const announcement = await Announcement.findById(announcementId);
      if (!announcement) {
        return res
          .status(404)
          .json(formatResponse(false, "Announcement not found"));
      }

      announcement.isActive = !announcement.isActive;
      await announcement.save();

      const action = announcement.isActive ? "activated" : "deactivated";
      console.log(
        `🔄 Announcement ${action} by admin ${req.user.email}: ${announcement.title}`
      );

      res.json(
        formatResponse(true, `Announcement ${action} successfully`, {
          announcement: {
            id: announcement._id,
            title: announcement.title,
            isActive: announcement.isActive,
          },
        })
      );
    } catch (error) {
      console.error("Toggle active error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Get announcement statistics (Admin only)
   */
  async getStatistics(req, res) {
    try {
      const stats = await Announcement.getAnnouncementStats();

      res.json(
        formatResponse(
          true,
          "Announcement statistics retrieved successfully",
          stats
        )
      );
    } catch (error) {
      console.error("Get announcement statistics error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Mark announcement as read for current user
   */
  async markAsRead(req, res) {
    try {
      const { announcementId } = req.params;

      const announcement = await Announcement.findById(announcementId);
      if (!announcement) {
        return res
          .status(404)
          .json(formatResponse(false, "Announcement not found"));
      }

      await announcement.markAsRead(req.user.userId);

      res.json(formatResponse(true, "Announcement marked as read"));
    } catch (error) {
      console.error("Mark as read error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Track announcement click
   */
  async trackClick(req, res) {
    try {
      const { announcementId } = req.params;

      const announcement = await Announcement.findById(announcementId);
      if (!announcement) {
        return res
          .status(404)
          .json(formatResponse(false, "Announcement not found"));
      }

      await announcement.incrementClicks();

      res.json(formatResponse(true, "Click tracked successfully"));
    } catch (error) {
      console.error("Track click error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Clean up expired announcements (Admin only)
   */
  async cleanupExpired(req, res) {
    try {
      const result = await Announcement.cleanupExpiredAnnouncements();

      console.log(
        `🧹 Cleaned up ${result.modifiedCount} expired announcements by admin ${req.user.email}`
      );

      res.json(
        formatResponse(
          true,
          `${result.modifiedCount} expired announcements cleaned up`,
          { cleanedCount: result.modifiedCount }
        )
      );
    } catch (error) {
      console.error("Cleanup expired error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Get all announcements for admin management
   */
  async getAllForAdmin(req, res) {
    try {
      const { page = 1, limit = 20, status, category, type } = req.query;
      const skip = (page - 1) * limit;

      let query = {};

      // Filter by status
      if (status === "active") query.isActive = true;
      if (status === "inactive") query.isActive = false;
      if (status === "pinned") query.isPinned = true;
      if (status === "scheduled") {
        query["scheduling.publishAt"] = { $gt: new Date() };
      }
      if (status === "expired") {
        query["scheduling.expireAt"] = { $lte: new Date() };
      }

      if (category) query.category = category;
      if (type) query.type = type;

      const announcements = await Announcement.find(query)
        .populate("createdBy lastModifiedBy", "name email")
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip);

      const total = await Announcement.countDocuments(query);
      const pagination = getPaginationInfo(
        parseInt(page),
        parseInt(limit),
        total
      );

      res.json(
        formatResponse(
          true,
          "Announcements retrieved successfully",
          { announcements },
          { pagination }
        )
      );
    } catch (error) {
      console.error("Get all announcements for admin error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Private method to send announcement notifications
   */
  async sendAnnouncementNotifications(announcement) {
    try {
      // Get target users based on announcement audience
      let userQuery = { status: USER_STATUS.APPROVED, isEmailVerified: true };

      switch (announcement.targetAudience) {
        case "recipients":
          // Users who have created help requests
          const recipientIds = await HelpRequest.distinct("recipientId");
          userQuery._id = { $in: recipientIds };
          break;
        case "donors":
          // Users who have approved help requests
          const donorIds = await HelpRequest.distinct("donorId");
          userQuery._id = { $in: donorIds.filter((id) => id) };
          break;
        case "pending_users":
          userQuery.status = USER_STATUS.PENDING;
          break;
        case "approved_users":
          userQuery.status = USER_STATUS.APPROVED;
          break;
        // 'all' uses default query
      }

      const users = await User.find(userQuery).select("name email").limit(1000); // Limit to avoid overwhelming email service

      if (users.length === 0) {
        console.log("No users found for announcement notification");
        return;
      }

      // Send bulk notifications
      const recipients = users.map((user) => ({
        email: user.email,
        name: user.name,
      }));

      const results = await emailService.sendBulkAnnouncement(
        recipients,
        announcement
      );

      const successCount = results.filter((r) => r.status === "sent").length;
      console.log(
        `📧 Announcement notifications sent: ${successCount}/${results.length} successful`
      );
    } catch (error) {
      console.error("Send announcement notifications error:", error);
      throw error;
    }
  }
}

module.exports = new AnnouncementController();
