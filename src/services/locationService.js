const {
  calculateDistance,
  getCoordinatesFromZipCode,
} = require("../utils/helpers");

class LocationService {
  /**
   * Get coordinates from zip code
   * @param {string} zipCode - Zip code
   * @returns {Promise<object>} Coordinates
   */
  async getCoordinates(zipCode) {
    try {
      // In a real application, you would integrate with a geocoding service
      // like Google Maps Geocoding API, Mapbox, or similar
      const coordinates = await getCoordinatesFromZipCode(zipCode);

      console.log(`📍 Coordinates for ${zipCode}:`, coordinates);

      return {
        success: true,
        data: coordinates,
      };
    } catch (error) {
      console.error("Get Coordinates Error:", error.message);
      throw new Error("Failed to get coordinates for the provided zip code");
    }
  }

  /**
   * Calculate distance between two points
   * @param {number} lat1 - First latitude
   * @param {number} lon1 - First longitude
   * @param {number} lat2 - Second latitude
   * @param {number} lon2 - Second longitude
   * @returns {number} Distance in kilometers
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    return calculateDistance(lat1, lon1, lat2, lon2);
  }

  /**
   * Find locations within radius
   * @param {number} centerLat - Center latitude
   * @param {number} centerLon - Center longitude
   * @param {Array} locations - Array of location objects with latitude/longitude
   * @param {number} radiusKm - Radius in kilometers
   * @returns {Array} Filtered locations with distances
   */
  findLocationsWithinRadius(centerLat, centerLon, locations, radiusKm = 10) {
    try {
      const locationsWithDistance = locations.map((location) => {
        const distance = this.calculateDistance(
          centerLat,
          centerLon,
          location.coordinates.latitude,
          location.coordinates.longitude
        );

        return {
          ...location,
          distance: distance,
        };
      });

      // Filter by radius and sort by distance
      return locationsWithDistance
        .filter((location) => location.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance);
    } catch (error) {
      console.error("Find Locations Within Radius Error:", error.message);
      throw error;
    }
  }

  /**
   * Get nearby help requests
   * @param {number} userLat - User latitude
   * @param {number} userLon - User longitude
   * @param {Array} helpRequests - Array of help requests
   * @param {number} radiusKm - Search radius in kilometers
   * @returns {Array} Nearby help requests with distances
   */
  getNearbyHelpRequests(userLat, userLon, helpRequests, radiusKm = 10) {
    try {
      return this.findLocationsWithinRadius(
        userLat,
        userLon,
        helpRequests.map((request) => ({
          ...request.toObject(),
          coordinates: request.pickupLocation.coordinates,
        })),
        radiusKm
      );
    } catch (error) {
      console.error("Get Nearby Help Requests Error:", error.message);
      throw error;
    }
  }

  /**
   * Get nearby users (donors)
   * @param {number} requestLat - Request latitude
   * @param {number} requestLon - Request longitude
   * @param {Array} users - Array of users
   * @param {number} radiusKm - Search radius in kilometers
   * @returns {Array} Nearby users with distances
   */
  getNearbyUsers(requestLat, requestLon, users, radiusKm = 10) {
    try {
      return this.findLocationsWithinRadius(
        requestLat,
        requestLon,
        users,
        radiusKm
      );
    } catch (error) {
      console.error("Get Nearby Users Error:", error.message);
      throw error;
    }
  }

  /**
   * Validate coordinates
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @returns {boolean} Are coordinates valid
   */
  validateCoordinates(latitude, longitude) {
    return (
      typeof latitude === "number" &&
      typeof longitude === "number" &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    );
  }

  /**
   * Get bounding box coordinates for a radius
   * @param {number} centerLat - Center latitude
   * @param {number} centerLon - Center longitude
   * @param {number} radiusKm - Radius in kilometers
   * @returns {object} Bounding box coordinates
   */
  getBoundingBox(centerLat, centerLon, radiusKm) {
    const latRange = radiusKm / 111; // Approximately 111 km per degree of latitude
    const lonRange = radiusKm / (111 * Math.cos((centerLat * Math.PI) / 180));

    return {
      north: centerLat + latRange,
      south: centerLat - latRange,
      east: centerLon + lonRange,
      west: centerLon - lonRange,
    };
  }

  /**
   * Create MongoDB geospatial query for radius search
   * @param {number} centerLat - Center latitude
   * @param {number} centerLon - Center longitude
   * @param {number} radiusKm - Radius in kilometers
   * @returns {object} MongoDB geospatial query
   */
  createGeoQuery(centerLat, centerLon, radiusKm) {
    const radiusInRadians = radiusKm / 6371; // Earth's radius in km

    return {
      coordinates: {
        $geoWithin: {
          $centerSphere: [[centerLon, centerLat], radiusInRadians],
        },
      },
    };
  }

  /**
   * Get distance category (nearby, close, far)
   * @param {number} distance - Distance in kilometers
   * @returns {string} Distance category
   */
  getDistanceCategory(distance) {
    if (distance <= 2) return "nearby";
    if (distance <= 5) return "close";
    if (distance <= 15) return "moderate";
    if (distance <= 30) return "far";
    return "very_far";
  }

  /**
   * Format distance for display
   * @param {number} distance - Distance in kilometers
   * @returns {string} Formatted distance string
   */
  formatDistance(distance) {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  }

  /**
   * Calculate estimated travel time (basic calculation)
   * @param {number} distance - Distance in kilometers
   * @param {string} mode - Transport mode (walking, driving, cycling)
   * @returns {number} Estimated time in minutes
   */
  estimateTravelTime(distance, mode = "driving") {
    const speeds = {
      walking: 5, // km/h
      cycling: 15, // km/h
      driving: 40, // km/h (accounting for city traffic)
      public: 25, // km/h (public transport average)
    };

    const speed = speeds[mode] || speeds.driving;
    return Math.ceil((distance / speed) * 60); // Convert to minutes
  }

  /**
   * Get location statistics for admin dashboard
   * @param {Array} users - Array of users
   * @param {Array} helpRequests - Array of help requests
   * @returns {object} Location statistics
   */
  getLocationStats(users, helpRequests) {
    try {
      // Count users by zip code
      const usersByZip = users.reduce((acc, user) => {
        acc[user.zipCode] = (acc[user.zipCode] || 0) + 1;
        return acc;
      }, {});

      // Count requests by zip code
      const requestsByZip = helpRequests.reduce((acc, request) => {
        acc[request.pickupLocation.zipCode] =
          (acc[request.pickupLocation.zipCode] || 0) + 1;
        return acc;
      }, {});

      // Calculate coverage areas
      const allZipCodes = [
        ...new Set([...Object.keys(usersByZip), ...Object.keys(requestsByZip)]),
      ];

      return {
        totalAreas: allZipCodes.length,
        userDistribution: usersByZip,
        requestDistribution: requestsByZip,
        coverageAreas: allZipCodes
          .map((zip) => ({
            zipCode: zip,
            users: usersByZip[zip] || 0,
            requests: requestsByZip[zip] || 0,
            ratio: (usersByZip[zip] || 0) / (requestsByZip[zip] || 1), // Donor to request ratio
          }))
          .sort((a, b) => b.users + b.requests - (a.users + a.requests)),
      };
    } catch (error) {
      console.error("Get Location Stats Error:", error.message);
      throw error;
    }
  }

  /**
   * Suggest optimal radius for user based on local density
   * @param {number} userLat - User latitude
   * @param {number} userLon - User longitude
   * @param {Array} nearbyItems - Array of nearby items (users or requests)
   * @returns {number} Suggested radius in kilometers
   */
  suggestOptimalRadius(userLat, userLon, nearbyItems) {
    try {
      // Calculate distances to all items
      const distances = nearbyItems
        .map((item) =>
          this.calculateDistance(
            userLat,
            userLon,
            item.coordinates.latitude,
            item.coordinates.longitude
          )
        )
        .sort((a, b) => a - b);

      // Suggest radius that captures at least 5-10 items, but not more than 50km
      if (distances.length >= 10) {
        return Math.min(distances[9], 50); // 10th closest item
      } else if (distances.length >= 5) {
        return Math.min(distances[4], 30); // 5th closest item
      } else if (distances.length > 0) {
        return Math.min(distances[distances.length - 1] + 5, 20); // Furthest item + 5km buffer
      } else {
        return 10; // Default 10km if no items nearby
      }
    } catch (error) {
      console.error("Suggest Optimal Radius Error:", error.message);
      return 10; // Default fallback
    }
  }
}

// Export singleton instance
module.exports = new LocationService();
