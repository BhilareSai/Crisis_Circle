require("dotenv").config();
const mongoose = require("mongoose");

// Models
const User = require("../models/User");
const HelpItem = require("../models/HelpItem");
const HelpRequest = require("../models/HelpRequest");

// Constants
const { HELP_CATEGORIES, HELP_REQUEST_STATUS } = require("../utils/constants");

/**
 * Simple script to add 50 help requests
 */
class HelpRequestSeeder {
  constructor() {
    this.helpItems = [];
    this.users = [];

    // US cities with coordinates
    this.cities = [
      { name: "New York", lat: 40.7128, lng: -74.0060, zipCode: "10001", state: "NY" },
      { name: "Los Angeles", lat: 34.0522, lng: -118.2437, zipCode: "90001", state: "CA" },
      { name: "Chicago", lat: 41.8781, lng: -87.6298, zipCode: "60601", state: "IL" },
      { name: "Houston", lat: 29.7604, lng: -95.3698, zipCode: "77001", state: "TX" },
      { name: "Phoenix", lat: 33.4484, lng: -112.0740, zipCode: "85001", state: "AZ" },
      { name: "Philadelphia", lat: 39.9526, lng: -75.1652, zipCode: "19019", state: "PA" },
      { name: "San Antonio", lat: 29.4241, lng: -98.4936, zipCode: "78201", state: "TX" },
      { name: "San Diego", lat: 32.7157, lng: -117.1611, zipCode: "92101", state: "CA" },
      { name: "Dallas", lat: 32.7767, lng: -96.7970, zipCode: "75201", state: "TX" },
      { name: "San Jose", lat: 37.3382, lng: -121.8863, zipCode: "95101", state: "CA" },
      { name: "Austin", lat: 30.2672, lng: -97.7431, zipCode: "78701", state: "TX" },
      { name: "Jacksonville", lat: 30.3322, lng: -81.6557, zipCode: "32099", state: "FL" },
      { name: "San Francisco", lat: 37.7749, lng: -122.4194, zipCode: "94102", state: "CA" },
      { name: "Seattle", lat: 47.6062, lng: -122.3321, zipCode: "98101", state: "WA" },
      { name: "Denver", lat: 39.7392, lng: -104.9903, zipCode: "80201", state: "CO" },
      { name: "Boston", lat: 42.3601, lng: -71.0589, zipCode: "02101", state: "MA" },
      { name: "Portland", lat: 45.5152, lng: -122.6784, zipCode: "97201", state: "OR" },
      { name: "Miami", lat: 25.7617, lng: -80.1918, zipCode: "33101", state: "FL" },
      { name: "Atlanta", lat: 33.7490, lng: -84.3880, zipCode: "30301", state: "GA" },
      { name: "Nashville", lat: 36.1627, lng: -86.7816, zipCode: "37201", state: "TN" },
    ];

    // Help request templates
    this.helpRequestTemplates = [
      {
        category: HELP_CATEGORIES.FOOD,
        titles: [
          "Urgent need for groceries for family of 4",
          "Food supplies needed for elderly parents",
          "Help needed with monthly ration",
          "Emergency food assistance required",
          "Support needed for children's nutrition",
          "Need basic pantry items for the week",
          "Fresh produce needed for diabetic diet",
          "Baby food and formula assistance needed"
        ],
        descriptions: [
          "We are facing financial difficulties and need basic food items for this month.",
          "My parents are elderly and I'm unable to manage their food requirements alone.",
          "Lost my job recently and struggling to provide meals for my family.",
          "Medical expenses have drained our savings, need help with food.",
          "Single parent struggling to feed children, any help appreciated.",
          "Recent emergency left us without food for the week, seeking community support.",
          "Managing chronic illness and need specific dietary items we can't afford.",
          "New baby in the family and struggling with formula costs."
        ]
      },
      {
        category: HELP_CATEGORIES.MEDICAL,
        titles: [
          "Medicine needed for chronic condition",
          "Emergency medical supplies required",
          "Help with prescription medications",
          "First aid supplies for elderly care",
          "Medical equipment needed urgently",
          "Diabetes supplies assistance needed",
          "Blood pressure monitor needed",
          "Wheelchair assistance required"
        ],
        descriptions: [
          "Need regular medications for diabetes that I can't afford this month.",
          "Emergency situation requiring immediate medical supplies.",
          "Prescription medicines are expensive, seeking community help.",
          "Caring for elderly relative who needs specific medical supplies.",
          "Medical equipment required for post-surgery recovery.",
          "Managing chronic condition and need help with medical supplies.",
          "Doctor recommended equipment that insurance doesn't cover.",
          "Mobility aid needed for elderly family member."
        ]
      },
      {
        category: HELP_CATEGORIES.EDUCATION,
        titles: [
          "School supplies needed for children",
          "Books required for college courses",
          "Educational materials for online learning",
          "Stationery items for new academic year",
          "Study materials for certification exam",
          "Laptop needed for online classes",
          "Art supplies for school project",
          "Scientific calculator needed"
        ],
        descriptions: [
          "Children starting new academic year and need basic school supplies.",
          "Preparing for certification exam but can't afford study materials.",
          "Online classes require materials that are beyond our budget.",
          "Multiple children need stationery for school, seeking help.",
          "College student struggling to afford required textbooks.",
          "Need technology to keep up with remote learning requirements.",
          "School project requires materials we cannot afford.",
          "Essential educational tools needed for coursework."
        ]
      },
      {
        category: HELP_CATEGORIES.CLOTHING,
        titles: [
          "Winter clothes needed for family",
          "Children's clothing for growing kids",
          "Work appropriate clothing needed",
          "Baby clothes and blankets required",
          "Warm clothing for elderly relatives",
          "School uniforms needed",
          "Professional attire for job interviews",
          "Seasonal clothing for children"
        ],
        descriptions: [
          "Winter is approaching and we need warm clothes for the family.",
          "Children have outgrown their clothes and need new ones.",
          "Starting a new job and need appropriate work clothing.",
          "New baby in family, need clothes and blankets.",
          "Elderly relatives need warm clothing for the winter season.",
          "School requires uniforms that we're struggling to afford.",
          "Job hunting and need professional clothing for interviews.",
          "Kids need seasonal clothes as they've outgrown everything."
        ]
      },
      {
        category: HELP_CATEGORIES.HOUSEHOLD,
        titles: [
          "Basic household items needed",
          "Kitchen utensils and cookware required",
          "Cleaning supplies for home",
          "Furniture for new apartment",
          "Home essentials after relocation",
          "Bedding and linens needed",
          "Small appliances for kitchen",
          "Basic tools for home repairs"
        ],
        descriptions: [
          "Setting up new home and need basic household items.",
          "Kitchen needs basic utensils and cookware for daily cooking.",
          "Need cleaning supplies to maintain hygiene at home.",
          "Moved to new place and need basic furniture items.",
          "Relocated for work and need essential home items.",
          "Family needs bedding and basic linens for comfort.",
          "Kitchen lacks basic appliances for meal preparation.",
          "Need tools to perform basic home maintenance tasks."
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

  getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
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

  async getUsers() {
    console.log("👥 Getting users...");
    this.users = await User.find({ status: "approved" }).limit(20);

    if (this.users.length === 0) {
      console.log("❌ No users found. Please create users first.");
      throw new Error("Users not found");
    }

    console.log(`✅ Found ${this.users.length} users`);
    return this.users;
  }

  async createHelpRequests(count = 50) {
    console.log(`🆘 Creating ${count} help requests...`);

    const requests = [];

    for (let i = 0; i < count; i++) {
      // Select random user as recipient
      const recipient = this.getRandomElement(this.users);

      // Select random city for pickup location
      const city = this.getRandomElement(this.cities);

      // Select random category and template
      const template = this.getRandomElement(this.helpRequestTemplates);
      const title = this.getRandomElement(template.titles);
      const description = this.getRandomElement(template.descriptions);

      // Generate items for request (1-3 items)
      const itemCount = Math.floor(Math.random() * 3) + 1;
      const categoryItems = this.helpItems.filter(item => item.category === template.category);

      if (categoryItems.length === 0) {
        console.log(`⚠️  No items found for category ${template.category}, skipping...`);
        continue;
      }

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
        donorId = this.getRandomElement(this.users)._id;
        approvedAt = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);

        if (statusRand > 0.95) {
          status = HELP_REQUEST_STATUS.COMPLETED;
          completedAt = new Date(approvedAt.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000);
        }
      }

      // Availability window (next 30 days)
      const startDate = new Date();
      const endDate = new Date(Date.now() + (Math.random() * 30 + 7) * 24 * 60 * 60 * 1000);

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
          address: `${Math.floor(Math.random() * 999) + 1} ${city.name} Street, ${city.name}, ${city.state}`,
          coordinates: {
            latitude: city.lat + (Math.random() - 0.5) * 0.1, // Add some variance
            longitude: city.lng + (Math.random() - 0.5) * 0.1
          },
          zipCode: city.zipCode
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

  async seed(count = 50) {
    try {
      await this.connect();

      console.log("🌱 Starting help request seeding...\n");

      // Get help items
      await this.getHelpItems();

      // Get users
      await this.getUsers();

      // Create help requests
      const requests = await this.createHelpRequests(count);

      console.log("\n🎉 Help request seeding completed successfully!");
      console.log("\n📋 Summary:");
      console.log(`   🆘 Help requests created: ${requests.length}`);

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

    } catch (error) {
      console.error("❌ Help request seeding failed:", error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// CLI Interface
const seeder = new HelpRequestSeeder();
const count = parseInt(process.argv[2]) || 50;

seeder
  .seed(count)
  .then(() => process.exit(0))
  .catch(() => process.exit(1));

module.exports = HelpRequestSeeder;
