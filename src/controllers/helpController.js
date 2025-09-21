const HelpRequest = require("../models/HelpRequest");
const HelpItem = require("../models/HelpItem");
const User = require("../models/User");
const emailService = require("../services/emailService");
const locationService = require("../services/locationService");
const { formatResponse, getPaginationInfo } = require("../utils/helpers");
const { MESSAGES, HELP_REQUEST_STATUS } = require("../utils/constants");

class HelpController {
  /**
   * Get all available help items
   */
  async getHelpItems(req, res) {
    try {
      const { category, search, page = 1, limit = 50 } = req.query;
      const skip = (page - 1) * limit;

      let query = { isActive: true };

      if (category) {
        query.category = category;
      }

      let items;
      if (search) {
        items = await HelpItem.searchItems(search, parseInt(limit));
      } else {
        items = await HelpItem.find(query)
          .sort({ priority: -1, name: 1 })
          .limit(parseInt(limit))
          .skip(skip);
      }

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
   * Get help item categories
   */
  async getCategories(req, res) {
    try {
      const categories = await HelpItem.getAllCategories();

      res.json(
        formatResponse(true, "Categories retrieved successfully", {
          categories,
        })
      );
    } catch (error) {
      console.error("Get categories error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Create help request
   */
  async createHelpRequest(req, res) {
    try {
      // Get user's location information from their profile
      const user = await User.findById(req.user.userId).select('address zipCode coordinates');
      if (!user) {
        return res
          .status(404)
          .json(formatResponse(false, MESSAGES.ERROR.USER_NOT_FOUND));
      }

      const requestData = {
        ...req.body,
        recipientId: req.user.userId,
        // Use user's registered location as pickup location
        pickupLocation: {
          address: user.address,
          coordinates: {
            latitude: user.coordinates.latitude,
            longitude: user.coordinates.longitude
          },
          zipCode: user.zipCode
        }
      };

      // Validate help items exist and are active
      const itemIds = requestData.items.map((item) => item.itemId);
      const validItems = await HelpItem.find({
        _id: { $in: itemIds },
        isActive: true,
      });

      if (validItems.length !== itemIds.length) {
        return res
          .status(400)
          .json(
            formatResponse(false, "One or more help items are not available")
          );
      }

      // Set category based on most common item category
      const categoryCounts = validItems.reduce((acc, item) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      }, {});

      requestData.category = Object.keys(categoryCounts).reduce((a, b) =>
        categoryCounts[a] > categoryCounts[b] ? a : b
      );

      const helpRequest = new HelpRequest(requestData);
      await helpRequest.save();

      await helpRequest.populate([
        { path: "recipientId", select: "name email phone" },
        { path: "items.itemId", select: "name category defaultQuantityUnit" },
      ]);

      console.log(
        `🆘 Help request created: ${helpRequest.title} by ${req.user.email}`
      );

      // Notify nearby donors (async - don't wait for completion)
      // this.notifyNearbyDonors(helpRequest).catch((error) => {
      //   console.error("Failed to notify nearby donors:", error);
      // });

      res
        .status(201)
        .json(
          formatResponse(true, MESSAGES.SUCCESS.HELP_REQUEST_CREATED, {
            helpRequest,
          })
        );
    } catch (error) {
      console.error("Create help request error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Get help request by ID
   */
  async getHelpRequest(req, res) {
    try {
      const { requestId } = req.params;

      const helpRequest = await HelpRequest.findById(requestId)
        .populate("recipientId", "name email phone zipCode")
        .populate("donorId", "name email phone")
        .populate("items.itemId", "name category defaultQuantityUnit")
        .populate("notes.author", "name");

      if (!helpRequest) {
        return res
          .status(404)
          .json(formatResponse(false, MESSAGES.ERROR.HELP_REQUEST_NOT_FOUND));
      }

      // Increment view count if not the owner
      if (
        helpRequest.recipientId._id.toString() !== req.user.userId.toString()
      ) {
        await helpRequest.incrementViews();
      }

      // Calculate distance if user has coordinates
      let distance = null;
      const user = await User.findById(req.user.userId);
      if (user && user.coordinates) {
        distance = locationService.calculateDistance(
          user.coordinates.latitude,
          user.coordinates.longitude,
          helpRequest.pickupLocation.coordinates.latitude,
          helpRequest.pickupLocation.coordinates.longitude
        );
      }

      const responseData = {
        ...helpRequest.toJSON(),
        distance,
        distanceFormatted: distance
          ? locationService.formatDistance(distance)
          : null,
        canApprove:
          helpRequest.recipientId._id.toString() !==
            req.user.userId.toString() &&
          helpRequest.status === HELP_REQUEST_STATUS.OPEN,
        canEdit:
          helpRequest.recipientId._id.toString() ===
            req.user.userId.toString() &&
          helpRequest.status === HELP_REQUEST_STATUS.OPEN,
      };

      res.json(
        formatResponse(true, "Help request retrieved successfully", {
          helpRequest: responseData,
        })
      );
    } catch (error) {
      console.error("Get help request error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Get all help requests with filtering
   */
  async getHelpRequests(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        category,
        priority,
        zipCode,
        radius = 10,
        latitude,
        longitude,
        search,
      } = req.query;

      const skip = (page - 1) * limit;
      let query = {};

      // Exclude current user's own requests if user is authenticated
      if (req.user && req.user.userId) {
        query.recipientId = { $ne: req.user.userId };
      }

      // Status filter
      if (status && Object.values(HELP_REQUEST_STATUS).includes(status)) {
        query.status = status;
      }

      // Category filter
      if (category) {
        query.category = category;
      }

      // Priority filter
      if (priority) {
        query.priority = priority;
      }

      // Get current user's location for distance calculation if not provided in query
      let userLatitude = parseFloat(latitude);
      let userLongitude = parseFloat(longitude);

      // Try to get user location from various sources
      if (!userLatitude || !userLongitude || isNaN(userLatitude) || isNaN(userLongitude)) {
        if (req.user && req.user.userId) {
          const currentUser = await User.findById(req.user.userId).select('coordinates');
          if (currentUser && currentUser.coordinates) {
            userLatitude = currentUser.coordinates.latitude;
            userLongitude = currentUser.coordinates.longitude;
          }
        }
      }

      // If still no user location, use a default location (Mumbai, India) for distance calculation
      // This ensures every request has distance information
      if (!userLatitude || !userLongitude || isNaN(userLatitude) || isNaN(userLongitude)) {
        userLatitude = 19.0760; // Mumbai latitude
        userLongitude = 72.8777; // Mumbai longitude
        console.log("Using default location (Mumbai) for distance calculation");
      }

      // Location-based filtering
      if (userLatitude && userLongitude) {
        const radiusInRadians = parseFloat(radius) / 6371; // Convert km to radians
        query["pickupLocation.coordinates"] = {
          $geoWithin: {
            $centerSphere: [
              [userLongitude, userLatitude],
              radiusInRadians,
            ],
          },
        };
      } else if (zipCode) {
        query["pickupLocation.zipCode"] = { $regex: zipCode, $options: "i" };
      }

      // Search functionality - use regex for better compatibility if text search is not available
      if (search) {
        const searchRegex = { $regex: search, $options: "i" };
        query.$or = [
          { title: searchRegex },
          { description: searchRegex },
        ];
      }

      // Only show non-expired requests
      query["availabilityWindow.endDate"] = { $gt: new Date() };

      console.log("Help requests query:", JSON.stringify(query, null, 2));

      const requests = await HelpRequest.find(query)
        .populate("recipientId", "name zipCode phone email")
        .populate("donorId", "name email phone")
        .populate("items.itemId", "name category")
        .sort({ priority: -1, createdAt: -1 })
        .limit(parseInt(limit))
        .skip(skip);

      // Add distance and address information
      let requestsWithExtras = requests.map((request) => {
        const requestObj = request.toJSON();

        // Add address information
        requestObj.address = request.pickupLocation.address;
        requestObj.coordinates = request.pickupLocation.coordinates;

        // Calculate distance - now guaranteed to have user coordinates
        const distance = locationService.calculateDistance(
          userLatitude,
          userLongitude,
          request.pickupLocation.coordinates.latitude,
          request.pickupLocation.coordinates.longitude
        );
        requestObj.distance = distance;
        requestObj.distanceFormatted = locationService.formatDistance(distance);

        // Add metadata about distance calculation source
        if (latitude && longitude) {
          requestObj.distanceSource = "query_parameters";
        } else if (req.user && req.user.userId) {
          requestObj.distanceSource = "user_profile";
        } else {
          requestObj.distanceSource = "default_location";
        }

        return requestObj;
      });

      // Always sort by distance since every request now has distance
      requestsWithExtras = requestsWithExtras.sort((a, b) => a.distance - b.distance);

      const total = await HelpRequest.countDocuments(query);
      const pagination = getPaginationInfo(
        parseInt(page),
        parseInt(limit),
        total
      );

      res.json(
        formatResponse(
          true,
          "Help requests retrieved successfully",
          {
            requests: requestsWithExtras,
            appliedFilters: {
              status,
              category,
              priority,
              search,
              zipCode,
              latitude: userLatitude,
              longitude: userLongitude,
              radius,
              excludeOwnRequests: !!req.user
            },
            distanceInfo: {
              calculatedFrom: {
                latitude: userLatitude,
                longitude: userLongitude
              },
              source: latitude && longitude ? "query_parameters" :
                     (req.user && req.user.userId ? "user_profile" : "default_location"),
              note: latitude && longitude ? "Using provided coordinates" :
                    (req.user && req.user.userId ? "Using user profile location" :
                     "Using default location (Mumbai) - please provide coordinates for accurate distance")
            }
          },
          { pagination }
        )
      );
    } catch (error) {
      console.error("Get help requests error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Update help request
   */
  async updateHelpRequest(req, res) {
    try {
      const { requestId } = req.params;
      const updates = req.body;

      // This middleware ensures user owns the request and it's editable
      const helpRequest = req.helpRequest;

      // Validate help items if being updated
      if (updates.items) {
        const itemIds = updates.items.map((item) => item.itemId);
        const validItems = await HelpItem.find({
          _id: { $in: itemIds },
          isActive: true,
        });

        if (validItems.length !== itemIds.length) {
          return res
            .status(400)
            .json(
              formatResponse(false, "One or more help items are not available")
            );
        }

        // Update category based on items
        const categoryCounts = validItems.reduce((acc, item) => {
          acc[item.category] = (acc[item.category] || 0) + 1;
          return acc;
        }, {});

        updates.category = Object.keys(categoryCounts).reduce((a, b) =>
          categoryCounts[a] > categoryCounts[b] ? a : b
        );
      }

      Object.assign(helpRequest, updates);
      await helpRequest.save();

      await helpRequest.populate([
        { path: "recipientId", select: "name email phone" },
        { path: "items.itemId", select: "name category defaultQuantityUnit" },
      ]);

      console.log(
        `📝 Help request updated: ${helpRequest.title} by ${req.user.email}`
      );

      res.json(
        formatResponse(true, "Help request updated successfully", {
          helpRequest,
        })
      );
    } catch (error) {
      console.error("Update help request error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Approve help request (donor accepting to help)
   */
  async approveHelpRequest(req, res) {
    try {
      const { requestId } = req.params;
      const helpRequest = req.helpRequest; // From middleware validation

      // Approve the request
      await helpRequest.approve(req.user.userId);

      await helpRequest.populate([
        { path: "recipientId", select: "name email phone" },
        { path: "donorId", select: "name email phone" },
        { path: "items.itemId", select: "name category defaultQuantityUnit" },
      ]);

      console.log(
        `✅ Help request approved: ${helpRequest.title} by ${req.user.email}`
      );

      // Send notification to recipient
      try {
        await emailService.sendHelpRequestApproved(
          helpRequest.recipientId.email,
          helpRequest.recipientId.name,
          helpRequest,
          helpRequest.donorId
        );
      } catch (emailError) {
        console.error("Failed to send approval notification:", emailError);
        // Don't fail the request if email fails
      }

      res.json(
        formatResponse(true, MESSAGES.SUCCESS.HELP_REQUEST_APPROVED, {
          helpRequest,
        })
      );
    } catch (error) {
      console.error("Approve help request error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Complete help request
   */
  async completeHelpRequest(req, res) {
    try {
      const { requestId } = req.params;
      const helpRequest = req.helpRequest; // From middleware validation

      if (helpRequest.status !== HELP_REQUEST_STATUS.APPROVED) {
        return res
          .status(400)
          .json(
            formatResponse(
              false,
              "Only approved help requests can be completed"
            )
          );
      }

      await helpRequest.complete();

      await helpRequest.populate([
        { path: "recipientId", select: "name email" },
        { path: "donorId", select: "name email" },
      ]);

      console.log(`🎉 Help request completed: ${helpRequest.title}`);

      res.json(
        formatResponse(true, "Help request marked as completed", {
          helpRequest,
        })
      );
    } catch (error) {
      console.error("Complete help request error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Delete help request
   */
  async deleteHelpRequest(req, res) {
    try {
      const { requestId } = req.params;
      const helpRequest = req.helpRequest; // From middleware validation

      if (helpRequest.status === HELP_REQUEST_STATUS.APPROVED) {
        return res
          .status(400)
          .json(
            formatResponse(
              false,
              "Cannot delete approved help requests. Contact admin if needed."
            )
          );
      }

      await HelpRequest.findByIdAndDelete(requestId);

      console.log(
        `🗑️ Help request deleted: ${helpRequest.title} by ${req.user.email}`
      );

      res.json(formatResponse(true, "Help request deleted successfully"));
    } catch (error) {
      console.error("Delete help request error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Add note to help request
   */
  async addNote(req, res) {
    try {
      const { requestId } = req.params;
      const { content } = req.body;

      const helpRequest = await HelpRequest.findById(requestId);
      if (!helpRequest) {
        return res
          .status(404)
          .json(formatResponse(false, MESSAGES.ERROR.HELP_REQUEST_NOT_FOUND));
      }

      // Only recipient and donor can add notes
      const userId = req.user.userId;
      const isRecipient =
        helpRequest.recipientId.toString() === userId.toString();
      const isDonor =
        helpRequest.donorId &&
        helpRequest.donorId.toString() === userId.toString();

      if (!isRecipient && !isDonor) {
        return res
          .status(403)
          .json(
            formatResponse(false, "Only recipient and donor can add notes")
          );
      }

      await helpRequest.addNote(userId, content);

      await helpRequest.populate("notes.author", "name");

      res.json(
        formatResponse(true, "Note added successfully", {
          note: helpRequest.notes[helpRequest.notes.length - 1],
        })
      );
    } catch (error) {
      console.error("Add note error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Mark interest in help request
   */
  async markInterest(req, res) {
    try {
      const { requestId } = req.params;

      const helpRequest = await HelpRequest.findById(requestId);
      if (!helpRequest) {
        return res
          .status(404)
          .json(formatResponse(false, MESSAGES.ERROR.HELP_REQUEST_NOT_FOUND));
      }

      if (helpRequest.recipientId.toString() === req.user.userId.toString()) {
        return res
          .status(400)
          .json(
            formatResponse(
              false,
              "You cannot mark interest in your own help request"
            )
          );
      }

      await helpRequest.markInterested(req.user.userId);

      res.json(formatResponse(true, "Interest marked successfully"));
    } catch (error) {
      console.error("Mark interest error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Rate help request (recipient rates donor or donor rates recipient)
   */
  async rateHelpRequest(req, res) {
    try {
      const { requestId } = req.params;
      const { stars, comment } = req.body;

      const helpRequest = await HelpRequest.findById(requestId);
      if (!helpRequest) {
        return res
          .status(404)
          .json(formatResponse(false, MESSAGES.ERROR.HELP_REQUEST_NOT_FOUND));
      }

      if (helpRequest.status !== HELP_REQUEST_STATUS.COMPLETED) {
        return res
          .status(400)
          .json(formatResponse(false, "Can only rate completed help requests"));
      }

      const userId = req.user.userId;
      const isRecipient =
        helpRequest.recipientId.toString() === userId.toString();
      const isDonor =
        helpRequest.donorId &&
        helpRequest.donorId.toString() === userId.toString();

      if (!isRecipient && !isDonor) {
        return res
          .status(403)
          .json(
            formatResponse(
              false,
              "Only recipient and donor can rate this request"
            )
          );
      }

      const ratingData = {
        stars,
        comment: comment || "",
        createdAt: new Date(),
      };

      if (isRecipient) {
        helpRequest.rating.recipientRating = ratingData;
      } else {
        helpRequest.rating.donorRating = ratingData;
      }

      await helpRequest.save();

      res.json(formatResponse(true, "Rating submitted successfully"));
    } catch (error) {
      console.error("Rate help request error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Flag help request for admin review
   */
  async flagHelpRequest(req, res) {
    try {
      const { requestId } = req.params;
      const { reason } = req.body;

      const helpRequest = await HelpRequest.findById(requestId);
      if (!helpRequest) {
        return res
          .status(404)
          .json(formatResponse(false, MESSAGES.ERROR.HELP_REQUEST_NOT_FOUND));
      }

      await helpRequest.flag(reason, req.user.userId);

      console.log(
        `🚩 Help request flagged: ${helpRequest.title} by ${req.user.email} - Reason: ${reason}`
      );

      res.json(formatResponse(true, "Help request flagged for review"));
    } catch (error) {
      console.error("Flag help request error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Get help request statistics
   */
  async getStatistics(req, res) {
    try {
      const stats = await HelpRequest.getRequestStats();

      res.json(
        formatResponse(
          true,
          "Help request statistics retrieved successfully",
          stats
        )
      );
    } catch (error) {
      console.error("Get statistics error:", error);
      res.status(500).json(formatResponse(false, MESSAGES.ERROR.SERVER_ERROR));
    }
  }

  /**
   * Private method to notify nearby donors about new help request
   */
  async notifyNearbyDonors(helpRequest) {
    try {
      // Find approved users within 20km radius
      const nearbyUsers = await User.find({
        status: "approved",
        _id: { $ne: helpRequest.recipientId },
        coordinates: {
          $geoWithin: {
            $centerSphere: [
              [
                helpRequest.pickupLocation.coordinates.longitude,
                helpRequest.pickupLocation.coordinates.latitude,
              ],
              20 / 6371, // 20km in radians
            ],
          },
        },
      }).limit(50); // Limit to 50 users to avoid spam

      // Send notifications (in batches to avoid overwhelming email service)
      const batchSize = 10;
      for (let i = 0; i < nearbyUsers.length; i += batchSize) {
        const batch = nearbyUsers.slice(i, i + batchSize);

        for (const user of batch) {
          try {
            await emailService.sendHelpRequestNotification(
              user.email,
              user.name,
              helpRequest
            );
          } catch (error) {
            console.error(
              `Failed to notify user ${user.email}:`,
              error.message
            );
          }
        }

        // Small delay between batches
        if (i + batchSize < nearbyUsers.length) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      console.log(
        `📧 Notified ${nearbyUsers.length} nearby donors about new help request`
      );
    } catch (error) {
      console.error("Notify nearby donors error:", error);
    }
  }
}

module.exports = new HelpController();
