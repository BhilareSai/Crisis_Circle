const bcrypt = require("bcryptjs");
const { OTP_CONFIG } = require("./constants");

/**
 * Generate a random OTP
 * @returns {string} 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} Match result
 */
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km

  return parseFloat(distance.toFixed(2));
};

/**
 * Get coordinates from zip code (mock implementation)
 * In a real application, you would use a geocoding service
 * @param {string} zipCode - Zip code
 * @returns {object} Coordinates object with lat and lng
 */
const getCoordinatesFromZipCode = async (zipCode) => {
  // Mock implementation - in real app, use Google Maps API or similar
  const mockCoordinates = {
    10001: { latitude: 40.7505, longitude: -73.9934 }, // New York
    90210: { latitude: 34.0901, longitude: -118.4065 }, // Beverly Hills
    60601: { latitude: 41.8781, longitude: -87.6298 }, // Chicago
    94102: { latitude: 37.7749, longitude: -122.4194 }, // San Francisco
    33101: { latitude: 25.7617, longitude: -80.1918 }, // Miami
    // Add more zip codes as needed
  };

  return mockCoordinates[zipCode] || { latitude: 40.7128, longitude: -74.006 }; // Default to NYC
};

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} Valid email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number format (basic validation)
 * @param {string} phone - Phone number
 * @returns {boolean} Valid phone format
 */
const isValidPhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ""));
};

/**
 * Validate password strength
 * @param {string} password - Password
 * @returns {object} Validation result
 */
const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const isValid =
    password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers;

  return {
    isValid,
    errors: [
      ...(password.length < minLength
        ? [`Password must be at least ${minLength} characters long`]
        : []),
      ...(!hasUpperCase
        ? ["Password must contain at least one uppercase letter"]
        : []),
      ...(!hasLowerCase
        ? ["Password must contain at least one lowercase letter"]
        : []),
      ...(!hasNumbers ? ["Password must contain at least one number"] : []),
    ],
  };
};

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - User input
 * @returns {string} Sanitized input
 */
const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;

  return input
    .replace(/[<>]/g, "") // Remove < and >
    .trim(); // Remove whitespace
};

/**
 * Generate pagination info
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {object} Pagination info
 */
const getPaginationInfo = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  return {
    currentPage: page,
    totalPages,
    totalItems: total,
    itemsPerPage: limit,
    hasNext,
    hasPrev,
    nextPage: hasNext ? page + 1 : null,
    prevPage: hasPrev ? page - 1 : null,
  };
};

/**
 * Format response object
 * @param {boolean} success - Success status
 * @param {string} message - Response message
 * @param {object} data - Response data
 * @param {object} meta - Additional metadata
 * @returns {object} Formatted response
 */
const formatResponse = (success, message, data = null, meta = null) => {
  const response = { success, message };

  if (data !== null) {
    response.data = data;
  }

  if (meta !== null) {
    response.meta = meta;
  }

  return response;
};

/**
 * Get OTP expiry time
 * @returns {Date} Expiry date
 */
const getOTPExpiry = () => {
  return new Date(Date.now() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000);
};

/**
 * Check if OTP is expired
 * @param {Date} expiryDate - OTP expiry date
 * @returns {boolean} Is expired
 */
const isOTPExpired = (expiryDate) => {
  return new Date() > expiryDate;
};

/**
 * Generate random string
 * @param {number} length - String length
 * @returns {string} Random string
 */
const generateRandomString = (length = 32) => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

module.exports = {
  generateOTP,
  hashPassword,
  comparePassword,
  calculateDistance,
  getCoordinatesFromZipCode,
  isValidEmail,
  isValidPhone,
  validatePasswordStrength,
  sanitizeInput,
  getPaginationInfo,
  formatResponse,
  getOTPExpiry,
  isOTPExpired,
  generateRandomString,
};
