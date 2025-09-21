require("dotenv").config();
const mongoose = require("mongoose");

// Models
const User = require("../models/User");
const HelpItem = require("../models/HelpItem");
const HelpRequest = require("../models/HelpRequest");

// Constants
const {
  USER_ROLES,
  USER_STATUS,
  HELP_CATEGORIES,
  QUANTITY_UNITS,
  HELP_REQUEST_STATUS,
} = require("../utils/constants");
const { hashPassword } = require("../utils/helpers");

/**
 * Comprehensive data seeding script for nearby users and help requests
 * Creates realistic data within 100km of bhilaresai64@gmail.com
 */
class NearbyDataSeeder {
  constructor() {
    // Target user email
    this.targetEmail = "bhilaresai64@gmail.com";
    this.targetUser = null;
    this.helpItems = [];

    // Indian city coordinates within reasonable range
    this.cities = [
      { name: "Mumbai", lat: 19.0760, lng: 72.8777, zipCode: "400001", area: "Colaba" },
      { name: "Delhi", lat: 28.6139, lng: 77.2090, zipCode: "110001", area: "Connaught Place" },
      { name: "Bangalore", lat: 12.9716, lng: 77.5946, zipCode: "560001", area: "MG Road" },
      { name: "Chennai", lat: 13.0827, lng: 80.2707, zipCode: "600001", area: "T Nagar" },
      { name: "Kolkata", lat: 22.5726, lng: 88.3639, zipCode: "700001", area: "Park Street" },
      { name: "Hyderabad", lat: 17.3850, lng: 78.4867, zipCode: "500001", area: "Abids" },
      { name: "Pune", lat: 18.5204, lng: 73.8567, zipCode: "411001", area: "Shivajinagar" },
      { name: "Ahmedabad", lat: 23.0225, lng: 72.5714, zipCode: "380001", area: "Maninagar" },
      { name: "Jaipur", lat: 26.9124, lng: 75.7873, zipCode: "302001", area: "Pink City" },
      { name: "Surat", lat: 21.1702, lng: 72.8311, zipCode: "395001", area: "Ring Road" },
      { name: "Lucknow", lat: 26.8467, lng: 80.9462, zipCode: "226001", area: "Hazratganj" },
      { name: "Kanpur", lat: 26.4499, lng: 80.3319, zipCode: "208001", area: "Mall Road" },
      { name: "Nagpur", lat: 21.1458, lng: 79.0882, zipCode: "440001", area: "Sitabuldi" },
      { name: "Indore", lat: 22.7196, lng: 75.8577, zipCode: "452001", area: "Rajwada" },
      { name: "Thane", lat: 19.2183, lng: 72.9781, zipCode: "400601", area: "Naupada" },
    ];

    // Indian names for realistic seeding
    this.firstNames = [
      "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan",
      "Aditi", "Ananya", "Diya", "Priya", "Kavya", "Isha", "Aanya", "Sara", "Riya", "Shreya",
      "Rajesh", "Suresh", "Mahesh", "Ramesh", "Ganesh", "Dinesh", "Rakesh", "Mukesh", "Naresh", "Hitesh",
      "Sunita", "Geeta", "Seeta", "Rita", "Nita", "Lata", "Mata", "Kavita", "Savita", "Mamta"
    ];

    this.lastNames = [
      "Sharma", "Verma", "Gupta", "Agarwal", "Tiwari", "Mishra", "Singh", "Kumar", "Yadav", "Pandey",
      "Jain", "Shah", "Patel", "Gandhi", "Modi", "Mehta", "Desai", "Thakur", "Chauhan", "Rajput",
      "Bhilare", "Patil", "Jadhav", "Kulkarni", "Deshpande", "Joshi", "Shinde", "Kale", "More", "Pawar"
    ];

    // Realistic help request titles and descriptions
    this.helpRequestTemplates = [
      {
        category: HELP_CATEGORIES.FOOD,
        titles: [
          "Urgent need for groceries for family of 4",
          "Food supplies needed for elderly parents",
          "Help needed with monthly ration",
          "Emergency food assistance required",
          "Support needed for children's nutrition"
        ],
        descriptions: [
          "We are facing financial difficulties and need basic food items for this month.",
          "My parents are elderly and I'm unable to manage their food requirements alone.",
          "Lost my job recently and struggling to provide meals for my family.",
          "Medical expenses have drained our savings, need help with food.",
          "Single parent struggling to feed children, any help appreciated."
        ]
      },
      {
        category: HELP_CATEGORIES.MEDICAL,
        titles: [
          "Medicine needed for chronic condition",
          "Emergency medical supplies required",
          "Help with prescription medications",
          "First aid supplies for elderly care",
          "Medical equipment needed urgently"
        ],
        descriptions: [
          "Need regular medications for diabetes that I can't afford this month.",
          "Emergency situation requiring immediate medical supplies.",
          "Prescription medicines are expensive, seeking community help.",
          "Caring for elderly relative who needs specific medical supplies.",
          "Medical equipment required for post-surgery recovery."
        ]
      },
      {
        category: HELP_CATEGORIES.EDUCATION,
        titles: [
          "School supplies needed for children",
          "Books required for competitive exams",
          "Educational materials for online learning",
          "Stationery items for new academic year",
          "Study materials for underprivileged students"
        ],
        descriptions: [
          "Children starting new academic year and need basic school supplies.",
          "Preparing for competitive exams but can't afford study materials.",
          "Online classes require materials that are beyond our budget.",
          "Multiple children need stationery for school, seeking help.",
          "Running a small teaching initiative for underprivileged kids."
        ]
      },
      {
        category: HELP_CATEGORIES.CLOTHING,
        titles: [
          "Winter clothes needed for family",
          "Children's clothing for growing kids",
          "Work appropriate clothing needed",
          "Baby clothes and blankets required",
          "Warm clothing for elderly relatives"
        ],
        descriptions: [
          "Winter is approaching and we need warm clothes for the family.",
          "Children have outgrown their clothes and need new ones.",
          "Starting a new job and need appropriate work clothing.",
          "New baby in family, need clothes and blankets.",
          "Elderly relatives need warm clothing for the winter season."
        ]
      },
      {
        category: HELP_CATEGORIES.HOUSEHOLD,
        titles: [
          "Basic household items needed",
          "Kitchen utensils and cookware required",
          "Cleaning supplies for home",
          "Furniture for new apartment",
          "Home essentials after relocation"
        ],
        descriptions: [
          "Setting up new home and need basic household items.",
          "Kitchen needs basic utensils and cookware for daily cooking.",
          "Need cleaning supplies to maintain hygiene at home.",
          "Moved to new place and need basic furniture items.",
          "Relocated for work and need essential home items."
        ]
      }
    ];
  }

  async connect() {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log("🗄️  Connected to MongoDB");
    } catch (error) {
      console.error("❌ MongoDB connection error:", error);
      process.exit(1);
    }
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  }

  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  toRad(value) {
    return (value * Math.PI) / 180;
  }

  // Generate random coordinates within radius
  generateNearbyCoordinates(centerLat, centerLng, maxDistanceKm) {
    const R = 6371; // Earth's radius in km
    const maxDistance = maxDistanceKm / R; // Convert to radians

    // Random distance and bearing
    const distance = Math.random() * maxDistance;
    const bearing = Math.random() * 2 * Math.PI;

    // Calculate new coordinates
    const lat1 = this.toRad(centerLat);
    const lng1 = this.toRad(centerLng);

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(distance) +
      Math.cos(lat1) * Math.sin(distance) * Math.cos(bearing)
    );

    const lng2 = lng1 + Math.atan2(
      Math.sin(bearing) * Math.sin(distance) * Math.cos(lat1),
      Math.cos(distance) - Math.sin(lat1) * Math.sin(lat2)
    );

    return {
      latitude: parseFloat((lat2 * 180 / Math.PI).toFixed(6)),
      longitude: parseFloat((lng2 * 180 / Math.PI).toFixed(6))
    };
  }

  // Get random element from array
  getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Generate random Indian phone number
  generatePhoneNumber() {
    const prefixes = ["98", "99", "97", "96", "95", "94", "93", "92", "91", "90"];
    const prefix = this.getRandomElement(prefixes);
    const remaining = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    return `+91${prefix}${remaining}`;
  }

  // Generate email from name
  generateEmail(firstName, lastName) {
    const domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"];
    const domain = this.getRandomElement(domains);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 999)}@${domain}`;
    return email;
  }

  async findTargetUser() {
    console.log(`🔍 Finding target user: ${this.targetEmail}`);

    this.targetUser = await User.findOne({ email: this.targetEmail });

    if (!this.targetUser) {
      console.log("❌ Target user not found, creating one...");
      // Create target user if not exists
      this.targetUser = new User({
        name: "Sai Bhilare",
        email: this.targetEmail,
        password: await hashPassword("password123"),
        phone: "+919876543210",
        zipCode: "400001",
        address: "123 Target Street, Mumbai, MH",
        coordinates: { latitude: 19.0760, longitude: 72.8777 }, // Mumbai coordinates
        role: USER_ROLES.USER,
        status: USER_STATUS.APPROVED,
        isEmailVerified: true,
      });
      await this.targetUser.save();
      console.log("✅ Target user created");
    } else {
      console.log("✅ Target user found");
    }

    console.log(`📍 Target location: ${this.targetUser.coordinates.latitude}, ${this.targetUser.coordinates.longitude}`);
    return this.targetUser;
  }

  async getHelpItems() {
    console.log("📦 Getting help items...");
    this.helpItems = await HelpItem.find({ isActive: true });

    if (this.helpItems.length === 0) {
      console.log("❌ No help items found. Please run basic seeding first.");
      throw new Error("Help items not found");
    }

    console.log(`✅ Found ${this.helpItems.length} help items`);
    return this.helpItems;
  }

  async createNearbyUsers(count = 50) {
    console.log(`👥 Creating ${count} nearby users...`);

    const users = [];
    const targetLat = this.targetUser.coordinates.latitude;
    const targetLng = this.targetUser.coordinates.longitude;

    for (let i = 0; i < count; i++) {
      const firstName = this.getRandomElement(this.firstNames);
      const lastName = this.getRandomElement(this.lastNames);
      const email = this.generateEmail(firstName, lastName);
console.log(email);
      // Generate coordinates within 100km
      const coordinates = this.generateNearbyCoordinates(targetLat, targetLng, 10);

      // Get nearest city for address
      const nearestCity = this.cities.reduce((prev, curr) => {
        const prevDist = this.calculateDistance(coordinates.latitude, coordinates.longitude, prev.lat, prev.lng);
        const currDist = this.calculateDistance(coordinates.latitude, coordinates.longitude, curr.lat, curr.lng);
        return prevDist < currDist ? prev : curr;
      });

      const user = {
        name: `${firstName} ${lastName}`,
        email: email,
        password: await hashPassword("password123"),
        phone: this.generatePhoneNumber(),
        zipCode: nearestCity.zipCode,
        address: `${Math.floor(Math.random() * 999) + 1} ${nearestCity.area}, ${nearestCity.name}`,
        coordinates: coordinates,
        role: USER_ROLES.USER,
        status: Math.random() > 0.1 ? USER_STATUS.APPROVED : USER_STATUS.PENDING, // 90% approved
        isEmailVerified: Math.random() > 0.05, // 95% verified
      };

      users.push(user);
    }

    const createdUsers = await User.insertMany(users);
    console.log(`✅ Created ${createdUsers.length} nearby users`);
    return createdUsers;
  }

  async createNearbyHelpRequests(users, count = 100) {
    console.log(`🆘 Creating ${count} nearby help requests...`);

    const requests = [];

    for (let i = 0; i < count; i++) {
      // Select random user as recipient
      const recipient = this.getRandomElement(users);

      // Select random category and template
      const template = this.getRandomElement(this.helpRequestTemplates);
      const title = this.getRandomElement(template.titles);
      const description = this.getRandomElement(template.descriptions);

      // Generate items for request (1-3 items)
      const itemCount = Math.floor(Math.random() * 3) + 1;
      const categoryItems = this.helpItems.filter(item => item.category === template.category);
      const items = [];

      for (let j = 0; j < itemCount; j++) {
        const helpItem = this.getRandomElement(categoryItems);
        const quantity = Math.floor(Math.random() * 10) + 1;

        items.push({
          itemId: helpItem._id,
          quantity: quantity,
          unit: helpItem.defaultQuantityUnit,
          description: `${helpItem.name} for family use`,
          urgency: this.getRandomElement(["low", "medium", "high", "critical"])
        });
      }

      // Random status (80% open, 15% approved, 5% completed)
      const statusRand = Math.random();
      let status = HELP_REQUEST_STATUS.OPEN;
      let donorId = null;
      let approvedAt = null;
      let completedAt = null;

      if (statusRand > 0.8) {
        status = HELP_REQUEST_STATUS.APPROVED;
        donorId = this.getRandomElement(users)._id;
        approvedAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Within last week

        if (statusRand > 0.95) {
          status = HELP_REQUEST_STATUS.COMPLETED;
          completedAt = new Date(approvedAt.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000); // 1-3 days after approval
        }
      }

      // Availability window (next 30 days)
      const startDate = new Date();
      const endDate = new Date(Date.now() + (Math.random() * 30 + 7) * 24 * 60 * 60 * 1000); // 7-37 days from now

      const request = {
        recipientId: recipient._id,
        title: title,
        description: description,
        items: items,
        status: status,
        donorId: donorId,
        priority: this.getRandomElement(["low", "medium", "high", "critical"]),
        category: template.category,
        preferredContactMethod: this.getRandomElement(["phone", "email", "both"]),
        pickupLocation: {
          address: recipient.address,
          coordinates: recipient.coordinates,
          zipCode: recipient.zipCode
        },
        availabilityWindow: {
          startDate: startDate,
          endDate: endDate,
          timeSlots: [
            {
              day: "monday",
              startTime: "09:00",
              endTime: "17:00"
            },
            {
              day: "saturday",
              startTime: "10:00",
              endTime: "16:00"
            }
          ]
        },
        approvedAt: approvedAt,
        completedAt: completedAt,
        metadata: {
          views: Math.floor(Math.random() * 50),
          interested: [],
          flagged: { isFlagged: false }
        }
      };

      requests.push(request);
    }

    const createdRequests = await HelpRequest.insertMany(requests);
    console.log(`✅ Created ${createdRequests.length} help requests`);
    return createdRequests;
  }

  async seedNearbyData(userCount = 50, requestCount = 100) {
    try {
      await this.connect();

      console.log("🌱 Starting nearby data seeding...\n");

      // Find target user
      await this.findTargetUser();

      // Get help items
      await this.getHelpItems();

      // Create nearby users
      const users = await this.createNearbyUsers(userCount);

      // Add target user to the list for help requests
      const allUsers = [this.targetUser, ...users];

      // Create help requests
      const requests = await this.createNearbyHelpRequests(allUsers, requestCount);

      console.log("\n🎉 Nearby data seeding completed successfully!");
      console.log("\n📋 Summary:");
      console.log(`   🎯 Target user: ${this.targetUser.email}`);
      console.log(`   👥 Nearby users created: ${users.length}`);
      console.log(`   🆘 Help requests created: ${requests.length}`);
      console.log(`   📍 All within 100km of target location`);

      // Statistics
      const openRequests = requests.filter(r => r.status === HELP_REQUEST_STATUS.OPEN).length;
      const approvedRequests = requests.filter(r => r.status === HELP_REQUEST_STATUS.APPROVED).length;
      const completedRequests = requests.filter(r => r.status === HELP_REQUEST_STATUS.COMPLETED).length;

      console.log("\n📊 Request Status Distribution:");
      console.log(`   📭 Open: ${openRequests}`);
      console.log(`   ✅ Approved: ${approvedRequests}`);
      console.log(`   🎯 Completed: ${completedRequests}`);

      const categoryStats = {};
      requests.forEach(r => {
        categoryStats[r.category] = (categoryStats[r.category] || 0) + 1;
      });

      console.log("\n📈 Category Distribution:");
      Object.entries(categoryStats).forEach(([category, count]) => {
        console.log(`   ${category}: ${count}`);
      });

      console.log("\n🔐 Test Credentials:");
      console.log("   All users have password: password123");
      console.log(`   Target user: ${this.targetUser.email}`);

    } catch (error) {
      console.error("❌ Nearby data seeding failed:", error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async clearNearbyData() {
    try {
      await this.connect();

      console.log("🧹 Clearing nearby data...");

      // Find target user
      await this.findTargetUser();

      // Delete all users except target and admin
      const deletedUsers = await User.deleteMany({
        email: { $ne: this.targetEmail },
        role: { $ne: USER_ROLES.ADMIN }
      });

      // Delete all help requests
      const deletedRequests = await HelpRequest.deleteMany({});

      console.log(`✅ Deleted ${deletedUsers.deletedCount} users`);
      console.log(`✅ Deleted ${deletedRequests.deletedCount} help requests`);
      console.log(`✅ Kept target user: ${this.targetEmail}`);

    } catch (error) {
      console.error("❌ Clear nearby data failed:", error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// CLI Interface
const seeder = new NearbyDataSeeder();

const args = process.argv.slice(2);
const command = args[0];
const userCount = parseInt(args[1]) || 50;
const requestCount = parseInt(args[2]) || 100;

switch (command) {
  case "seed":
    seeder
      .seedNearbyData(userCount, requestCount)
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
    break;

  case "clear":
    seeder
      .clearNearbyData()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
    break;

  default:
    console.log("🌱 Nearby Data Seeder for Community Help Platform");
    console.log("\nUsage: node seedNearbyData.js [command] [userCount] [requestCount]");
    console.log("\nCommands:");
    console.log("  seed   - Create nearby users and help requests");
    console.log("  clear  - Clear all nearby data (keeps target user and admin)");
    console.log("\nExamples:");
    console.log("  node seedNearbyData.js seed          # Create 50 users, 100 requests");
    console.log("  node seedNearbyData.js seed 100 200  # Create 100 users, 200 requests");
    console.log("  node seedNearbyData.js clear         # Clear all nearby data");
    console.log("\nTarget user: bhilaresai64@gmail.com");
    console.log("Radius: 100km from target user location");
    process.exit(1);
}

module.exports = NearbyDataSeeder;