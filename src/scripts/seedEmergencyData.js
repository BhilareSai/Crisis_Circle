require("dotenv").config();
const mongoose = require("mongoose");

// Models
const User = require("../models/User");
const HelpItem = require("../models/HelpItem");
const HelpRequest = require("../models/HelpRequest");
const Announcement = require("../models/Announcement");
const OTP = require("../models/OTP");

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
 * Emergency Items Seeder
 * Clears DB and seeds with emergency preparedness items, admin, 5 users, and 30 help requests
 */
class EmergencySeeder {
  constructor() {
    // Emergency preparedness items with proper categorization
    this.emergencyItems = [
      // Food Items
      {
        name: "Water Bottles",
        category: HELP_CATEGORIES.FOOD,
        defaultQuantityUnit: QUANTITY_UNITS.BOTTLES,
        description: "Bottled drinking water for emergency situations",
        priority: 10,
      },
      {
        name: "Soup Cans",
        category: HELP_CATEGORIES.FOOD,
        defaultQuantityUnit: QUANTITY_UNITS.PIECES,
        description: "Canned soup ready to eat",
        priority: 9,
      },
      {
        name: "Food Cans",
        category: HELP_CATEGORIES.FOOD,
        defaultQuantityUnit: QUANTITY_UNITS.PIECES,
        description: "Canned food items for emergency storage",
        priority: 9,
      },
      {
        name: "Manual Can Opener",
        category: HELP_CATEGORIES.HOUSEHOLD,
        defaultQuantityUnit: QUANTITY_UNITS.PIECES,
        description: "Hand-operated can opener",
        priority: 8,
      },
      {
        name: "Energy Bars",
        category: HELP_CATEGORIES.FOOD,
        defaultQuantityUnit: QUANTITY_UNITS.PIECES,
        description: "High-energy nutrition bars",
        priority: 8,
      },

      // Medical & Safety
      {
        name: "First Aid Kit",
        category: HELP_CATEGORIES.MEDICAL,
        defaultQuantityUnit: QUANTITY_UNITS.SETS,
        description: "Complete first aid supplies",
        priority: 10,
      },
      {
        name: "Masks",
        category: HELP_CATEGORIES.MEDICAL,
        defaultQuantityUnit: QUANTITY_UNITS.PIECES,
        description: "Protective face masks",
        priority: 8,
      },

      // Household & Shelter
      {
        name: "Flashlight With Batteries",
        category: HELP_CATEGORIES.HOUSEHOLD,
        defaultQuantityUnit: QUANTITY_UNITS.PIECES,
        description: "Emergency flashlight with backup batteries",
        priority: 9,
      },
      {
        name: "Blankets",
        category: HELP_CATEGORIES.HOUSEHOLD,
        defaultQuantityUnit: QUANTITY_UNITS.PIECES,
        description: "Warm blankets for emergency shelter",
        priority: 9,
      },
      {
        name: "Plastic Sheets With Duct Tape",
        category: HELP_CATEGORIES.HOUSEHOLD,
        defaultQuantityUnit: QUANTITY_UNITS.SETS,
        description: "Plastic sheeting with duct tape for shelter",
        priority: 7,
      },
      {
        name: "Garbage Bags",
        category: HELP_CATEGORIES.HOUSEHOLD,
        defaultQuantityUnit: QUANTITY_UNITS.PIECES,
        description: "Heavy-duty garbage bags for multiple uses",
        priority: 6,
      },

      // Clothing & Protection
      {
        name: "Raincoats",
        category: HELP_CATEGORIES.CLOTHING,
        defaultQuantityUnit: QUANTITY_UNITS.PIECES,
        description: "Waterproof rain protection",
        priority: 7,
      },
      {
        name: "Jackets Or Sweaters",
        category: HELP_CATEGORIES.CLOTHING,
        defaultQuantityUnit: QUANTITY_UNITS.PIECES,
        description: "Warm jackets and sweaters",
        priority: 7,
      },

      // Hygiene & Sanitation
      {
        name: "Soap",
        category: HELP_CATEGORIES.HOUSEHOLD,
        defaultQuantityUnit: QUANTITY_UNITS.PIECES,
        description: "Bar or liquid soap for hygiene",
        priority: 8,
      },
      {
        name: "Sanitizer",
        category: HELP_CATEGORIES.HOUSEHOLD,
        defaultQuantityUnit: QUANTITY_UNITS.BOTTLES,
        description: "Hand sanitizer gel",
        priority: 8,
      },
      {
        name: "Feminine Supplies",
        category: HELP_CATEGORIES.HOUSEHOLD,
        defaultQuantityUnit: QUANTITY_UNITS.BOXES,
        description: "Feminine hygiene products",
        priority: 7,
      },

      // Baby & Child Care
      {
        name: "Diapers",
        category: HELP_CATEGORIES.HOUSEHOLD,
        defaultQuantityUnit: QUANTITY_UNITS.PIECES,
        description: "Baby diapers in various sizes",
        priority: 8,
      },
      {
        name: "Baby Formula",
        category: HELP_CATEGORIES.FOOD,
        defaultQuantityUnit: QUANTITY_UNITS.BOXES,
        description: "Infant formula for feeding",
        priority: 9,
      },

      // Pet Care
      {
        name: "Dog Food",
        category: HELP_CATEGORIES.OTHER,
        defaultQuantityUnit: QUANTITY_UNITS.KG,
        description: "Dry dog food",
        priority: 5,
      },
      {
        name: "Cat Food",
        category: HELP_CATEGORIES.OTHER,
        defaultQuantityUnit: QUANTITY_UNITS.KG,
        description: "Dry cat food",
        priority: 5,
      },
    ];

    // US cities with coordinates for help requests
    this.cities = [
      { name: "New York, NY", lat: 40.7128, lng: -74.0060, zipCode: "10001" },
      { name: "Los Angeles, CA", lat: 34.0522, lng: -118.2437, zipCode: "90001" },
      { name: "Chicago, IL", lat: 41.8781, lng: -87.6298, zipCode: "60601" },
      { name: "Houston, TX", lat: 29.7604, lng: -95.3698, zipCode: "77001" },
      { name: "Phoenix, AZ", lat: 33.4484, lng: -112.0740, zipCode: "85001" },
      { name: "Philadelphia, PA", lat: 39.9526, lng: -75.1652, zipCode: "19101" },
      { name: "San Antonio, TX", lat: 29.4241, lng: -98.4936, zipCode: "78201" },
      { name: "San Diego, CA", lat: 32.7157, lng: -117.1611, zipCode: "92101" },
      { name: "Dallas, TX", lat: 32.7767, lng: -96.7970, zipCode: "75201" },
      { name: "San Jose, CA", lat: 37.3382, lng: -121.8863, zipCode: "95101" },
    ];

    // Help request templates
    this.requestTemplates = [
      {
        category: HELP_CATEGORIES.FOOD,
        titles: [
          "Emergency food supplies needed for family",
          "Urgent need for non-perishable food items",
          "Food assistance required after emergency",
          "Need emergency food and water for household",
          "Help needed with emergency food supplies",
        ],
        descriptions: [
          "Our family is in need of emergency food supplies after a recent crisis. Any help would be greatly appreciated.",
          "We need non-perishable food items to sustain our family during this difficult time.",
          "Emergency situation has left us without adequate food supplies. Seeking assistance.",
          "Family requires immediate help with food and water for emergency preparedness.",
        ],
      },
      {
        category: HELP_CATEGORIES.MEDICAL,
        titles: [
          "First aid supplies needed urgently",
          "Medical emergency supplies required",
          "Need protective equipment and medical supplies",
          "Emergency medical kit assistance needed",
          "Help with basic medical supplies",
        ],
        descriptions: [
          "We need first aid supplies for our family's emergency preparedness kit.",
          "Medical supplies urgently needed for household emergency situations.",
          "Seeking help with protective equipment and basic medical supplies.",
          "Emergency medical supplies needed for family safety and wellbeing.",
        ],
      },
      {
        category: HELP_CATEGORIES.HOUSEHOLD,
        titles: [
          "Emergency shelter supplies needed",
          "Household emergency items required",
          "Need emergency preparedness supplies",
          "Help with emergency household items",
          "Emergency sanitation supplies needed",
        ],
        descriptions: [
          "We need emergency household supplies including flashlights, blankets, and sanitation items.",
          "Seeking help with essential household items for emergency preparedness.",
          "Emergency situation requires immediate household supply assistance.",
          "Family needs help with emergency shelter and household supplies.",
        ],
      },
      {
        category: HELP_CATEGORIES.CLOTHING,
        titles: [
          "Emergency clothing and protection needed",
          "Weatherproof clothing required for family",
          "Need warm clothing for emergency shelter",
          "Help with protective clothing items",
          "Emergency clothing assistance needed",
        ],
        descriptions: [
          "Our family needs weatherproof clothing for emergency situations.",
          "Seeking help with warm clothing and protective gear for emergencies.",
          "Emergency situation has left us without adequate clothing. Need assistance.",
          "Family requires protective clothing for emergency preparedness.",
        ],
      },
      {
        category: HELP_CATEGORIES.OTHER,
        titles: [
          "Pet food needed for emergency preparedness",
          "Help with pet supplies during crisis",
          "Emergency pet food assistance required",
          "Need pet care items for emergency",
          "Pet emergency supplies needed",
        ],
        descriptions: [
          "Our pets need food supplies during this emergency situation.",
          "Seeking help with pet food for our family's emergency preparedness.",
          "Emergency has left us unable to provide for our pets. Need assistance.",
          "Family needs help with pet food and supplies during crisis.",
        ],
      },
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

  async clearDatabase() {
    console.log("🧹 Clearing entire database...");
    await Promise.all([
      User.deleteMany({}),
      HelpItem.deleteMany({}),
      HelpRequest.deleteMany({}),
      Announcement.deleteMany({}),
      OTP.deleteMany({}),
    ]);
    console.log("✅ Database cleared completely");
  }

  async seedAdmin() {
    console.log("👤 Creating admin user...");

    const adminData = {
      name: "Admin User",
      email: process.env.ADMIN_EMAIL || "admin@communityhelp.com",
      password: await hashPassword(
        process.env.ADMIN_DEFAULT_PASSWORD || "Admin@123456"
      ),
      phone: "+1234567890",
      zipCode: "10001",
      address: "123 Admin Street, New York, NY",
      coordinates: {
        latitude: 40.7128,
        longitude: -74.0060,
      },
      role: USER_ROLES.ADMIN,
      status: USER_STATUS.APPROVED,
      isEmailVerified: true,
    };

    const admin = new User(adminData);
    await admin.save();

    console.log(`✅ Admin user created: ${admin.email}`);
    return admin;
  }

  async seedEmergencyItems(adminUserId) {
    console.log("📦 Creating emergency preparedness items...");

    const itemsToCreate = this.emergencyItems.map((item) => ({
      ...item,
      createdBy: adminUserId,
      lastModifiedBy: adminUserId,
      isActive: true,
    }));

    const items = await HelpItem.insertMany(itemsToCreate);
    console.log(`✅ Created ${items.length} emergency items`);
    return items;
  }

  async seed5Users() {
    console.log("👥 Creating 5 sample users...");

    const sampleUsers = [
      {
        name: "Sarah Martinez",
        email: "sarah.martinez@example.com",
        password: await hashPassword("Password@123"),
        phone: "+1555001001",
        zipCode: "10001",
        address: "456 Emergency Lane, New York, NY",
        coordinates: { latitude: 40.7529, longitude: -73.9925 },
        role: USER_ROLES.USER,
        status: USER_STATUS.APPROVED,
        isEmailVerified: true,
      },
      {
        name: "Michael Chen",
        email: "michael.chen@example.com",
        password: await hashPassword("Password@123"),
        phone: "+1555001002",
        zipCode: "90001",
        address: "789 Preparedness Ave, Los Angeles, CA",
        coordinates: { latitude: 34.0522, longitude: -118.2437 },
        role: USER_ROLES.USER,
        status: USER_STATUS.APPROVED,
        isEmailVerified: true,
      },
      {
        name: "Emily Johnson",
        email: "emily.johnson@example.com",
        password: await hashPassword("Password@123"),
        phone: "+1555001003",
        zipCode: "60601",
        address: "321 Safety Street, Chicago, IL",
        coordinates: { latitude: 41.8781, longitude: -87.6298 },
        role: USER_ROLES.USER,
        status: USER_STATUS.APPROVED,
        isEmailVerified: true,
      },
      {
        name: "David Williams",
        email: "david.williams@example.com",
        password: await hashPassword("Password@123"),
        phone: "+1555001004",
        zipCode: "77001",
        address: "654 Relief Road, Houston, TX",
        coordinates: { latitude: 29.7604, longitude: -95.3698 },
        role: USER_ROLES.USER,
        status: USER_STATUS.APPROVED,
        isEmailVerified: true,
      },
      {
        name: "Jessica Brown",
        email: "jessica.brown@example.com",
        password: await hashPassword("Password@123"),
        phone: "+1555001005",
        zipCode: "85001",
        address: "987 Support Blvd, Phoenix, AZ",
        coordinates: { latitude: 33.4484, longitude: -112.0740 },
        role: USER_ROLES.USER,
        status: USER_STATUS.APPROVED,
        isEmailVerified: true,
      },
    ];

    const users = await User.insertMany(sampleUsers);
    console.log(`✅ Created ${users.length} sample users`);
    return users;
  }

  getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  async seed30HelpRequests(users, helpItems) {
    console.log("🆘 Creating 30 help requests...");

    const requests = [];
    const priorities = ["low", "medium", "high", "critical"];
    const statuses = [
      HELP_REQUEST_STATUS.OPEN,
      HELP_REQUEST_STATUS.OPEN,
      HELP_REQUEST_STATUS.OPEN,
      HELP_REQUEST_STATUS.OPEN,
      HELP_REQUEST_STATUS.APPROVED,
      HELP_REQUEST_STATUS.COMPLETED,
    ];

    for (let i = 0; i < 30; i++) {
      // Select random user as recipient
      const recipient = this.getRandomElement(users);

      // Select random city
      const city = this.getRandomElement(this.cities);

      // Select random template
      const template = this.getRandomElement(this.requestTemplates);
      const title = this.getRandomElement(template.titles);
      const description = this.getRandomElement(template.descriptions);

      // Get items for this category
      const categoryItems = helpItems.filter(
        (item) => item.category === template.category
      );

      if (categoryItems.length === 0) {
        console.log(
          `⚠️  No items found for category ${template.category}, skipping...`
        );
        continue;
      }

      // Generate 1-4 items per request
      const itemCount = this.getRandomNumber(1, Math.min(4, categoryItems.length));
      const items = [];

      // Shuffle and select random items
      const shuffledItems = [...categoryItems].sort(() => 0.5 - Math.random());

      for (let j = 0; j < itemCount; j++) {
        const helpItem = shuffledItems[j];
        const quantity = this.getRandomNumber(1, 10);

        items.push({
          itemId: helpItem._id,
          quantity: quantity,
          unit: helpItem.defaultQuantityUnit,
          description: `${helpItem.name} needed for emergency preparedness`,
          urgency: this.getRandomElement(priorities),
        });
      }

      // Create help request
      const status = this.getRandomElement(statuses);
      const priority = this.getRandomElement(priorities);

      // Calculate availability window (10-30 days from now)
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + this.getRandomNumber(10, 30));

      const helpRequest = {
        recipientId: recipient._id,
        title: title,
        description: description,
        items: items,
        status: status,
        priority: priority,
        category: template.category,
        preferredContactMethod: this.getRandomElement(["phone", "email", "both"]),
        pickupLocation: {
          address: city.name,
          coordinates: {
            latitude: city.lat,
            longitude: city.lng,
          },
          zipCode: city.zipCode,
        },
        availabilityWindow: {
          startDate: startDate,
          endDate: endDate,
          timeSlots: [
            {
              day: "monday",
              startTime: "09:00",
              endTime: "17:00",
            },
            {
              day: "wednesday",
              startTime: "09:00",
              endTime: "17:00",
            },
            {
              day: "friday",
              startTime: "09:00",
              endTime: "17:00",
            },
          ],
        },
      };

      // Add donor for approved/completed requests
      if (status === HELP_REQUEST_STATUS.APPROVED || status === HELP_REQUEST_STATUS.COMPLETED) {
        const availableDonors = users.filter(
          (u) => u._id.toString() !== recipient._id.toString()
        );
        if (availableDonors.length > 0) {
          helpRequest.donorId = this.getRandomElement(availableDonors)._id;
          helpRequest.approvedAt = new Date(Date.now() - this.getRandomNumber(1, 7) * 24 * 60 * 60 * 1000);
        }
      }

      // Add completion date for completed requests
      if (status === HELP_REQUEST_STATUS.COMPLETED && helpRequest.approvedAt) {
        helpRequest.completedAt = new Date(
          helpRequest.approvedAt.getTime() + this.getRandomNumber(1, 5) * 24 * 60 * 60 * 1000
        );
      }

      requests.push(helpRequest);
    }

    const createdRequests = await HelpRequest.insertMany(requests);

    // Populate the requests for display
    const populatedRequests = await HelpRequest.find({
      _id: { $in: createdRequests.map(r => r._id) }
    })
      .populate("recipientId", "name email")
      .populate("donorId", "name email")
      .populate("items.itemId", "name category");

    console.log(`✅ Created ${populatedRequests.length} help requests`);

    // Show summary by status
    const statusCounts = populatedRequests.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    }, {});

    console.log("   📊 Status breakdown:");
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`      ${status}: ${count}`);
    });

    return populatedRequests;
  }

  async seedAll() {
    try {
      await this.connect();

      console.log("🌱 Starting emergency data seeding...\n");

      // Step 1: Clear database
      await this.clearDatabase();

      // Step 2: Seed admin
      const admin = await this.seedAdmin();

      // Step 3: Seed emergency items
      const helpItems = await this.seedEmergencyItems(admin._id);

      // Step 4: Seed 5 users
      const users = await this.seed5Users();

      // Step 5: Seed 30 help requests
      const helpRequests = await this.seed30HelpRequests(users, helpItems);

      console.log("\n🎉 Emergency data seeding completed successfully!");
      console.log("\n📋 Summary:");
      console.log(`   👤 Admin users: 1`);
      console.log(`   👥 Sample users: ${users.length}`);
      console.log(`   📦 Emergency items: ${helpItems.length}`);
      console.log(`   🆘 Help requests: ${helpRequests.length}`);

      console.log("\n🔐 Admin Credentials:");
      console.log(`   Email: ${admin.email}`);
      console.log(
        `   Password: ${process.env.ADMIN_DEFAULT_PASSWORD || "Admin@123456"}`
      );

      console.log("\n👥 Sample User Credentials:");
      console.log("   All users have password: Password@123");
      console.log("   sarah.martinez@example.com");
      console.log("   michael.chen@example.com");
      console.log("   emily.johnson@example.com");
      console.log("   david.williams@example.com");
      console.log("   jessica.brown@example.com");

      console.log("\n📦 Emergency Items Created:");
      helpItems.forEach((item) => {
        console.log(`   • ${item.name} (${item.category})`);
      });
    } catch (error) {
      console.error("❌ Seeding failed:", error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// Run the seeder
const seeder = new EmergencySeeder();
seeder
  .seedAll()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

module.exports = EmergencySeeder;
