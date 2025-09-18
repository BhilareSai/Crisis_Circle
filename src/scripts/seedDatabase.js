require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// Models
const User = require("../models/User");
const HelpItem = require("../models/HelpItem");
const Announcement = require("../models/Announcement");

// Constants
const {
  USER_ROLES,
  USER_STATUS,
  DEFAULT_HELP_ITEMS,
  HELP_CATEGORIES,
} = require("../utils/constants");
const { hashPassword } = require("../utils/helpers");

/**
 * Seed database with initial data
 */
class DatabaseSeeder {
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
    console.log("🧹 Clearing existing data...");
    await Promise.all([
      User.deleteMany({}),
      HelpItem.deleteMany({}),
      Announcement.deleteMany({}),
    ]);
    console.log("✅ Database cleared");
  }

  async seedAdminUser() {
    console.log("👤 Creating admin user...");

    const adminData = {
      name: "Admin User",
      email: process.env.ADMIN_EMAIL || "admin@communityhelp.com",
      password: await hashPassword(
        process.env.ADMIN_DEFAULT_PASSWORD || "admin123456"
      ),
      phone: "+1234567890",
      zipCode: "10001",
      address: "123 Admin Street, Admin City",
      coordinates: {
        latitude: 40.7505,
        longitude: -73.9934,
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

  async seedSampleUsers() {
    console.log("👥 Creating sample users...");

    const sampleUsers = [
      {
        name: "John Donor",
        email: "john.donor@example.com",
        password: await hashPassword("password123"),
        phone: "+1234567891",
        zipCode: "10001",
        address: "456 Donor Avenue, New York, NY",
        coordinates: { latitude: 40.7529, longitude: -73.9925 },
        role: USER_ROLES.USER,
        status: USER_STATUS.APPROVED,
        isEmailVerified: true,
      },
      {
        name: "Alice Helper",
        email: "alice.helper@example.com",
        password: await hashPassword("password123"),
        phone: "+1234567892",
        zipCode: "10002",
        address: "789 Helper Street, New York, NY",
        coordinates: { latitude: 40.7209, longitude: -73.9896 },
        role: USER_ROLES.USER,
        status: USER_STATUS.APPROVED,
        isEmailVerified: true,
      },
      {
        name: "Bob Recipient",
        email: "bob.recipient@example.com",
        password: await hashPassword("password123"),
        phone: "+1234567893",
        zipCode: "10003",
        address: "321 Need Street, New York, NY",
        coordinates: { latitude: 40.732, longitude: -73.9892 },
        role: USER_ROLES.USER,
        status: USER_STATUS.APPROVED,
        isEmailVerified: true,
      },
      {
        name: "Carol Pending",
        email: "carol.pending@example.com",
        password: await hashPassword("password123"),
        phone: "+1234567894",
        zipCode: "10004",
        address: "654 Waiting Avenue, New York, NY",
        coordinates: { latitude: 40.704, longitude: -74.0132 },
        role: USER_ROLES.USER,
        status: USER_STATUS.PENDING,
        isEmailVerified: true,
      },
      {
        name: "David Verified",
        email: "david.unverified@example.com",
        password: await hashPassword("password123"),
        phone: "+1234567895",
        zipCode: "10005",
        address: "987 Unverified Lane, New York, NY",
        coordinates: { latitude: 40.7074, longitude: -74.0113 },
        role: USER_ROLES.USER,
        status: USER_STATUS.PENDING,
        isEmailVerified: false,
      },
    ];

    const users = await User.insertMany(sampleUsers);
    console.log(`✅ Created ${users.length} sample users`);
    return users;
  }

  async seedHelpItems(adminUserId) {
    console.log("📦 Creating help items...");

    const itemsToCreate = DEFAULT_HELP_ITEMS.map((item) => ({
      ...item,
      createdBy: adminUserId,
      lastModifiedBy: adminUserId,
      isActive: true,
    }));

    const items = await HelpItem.insertMany(itemsToCreate);
    console.log(`✅ Created ${items.length} help items`);
    return items;
  }

  async seedAnnouncements(adminUserId) {
    console.log("📢 Creating sample announcements...");

    const announcements = [
      {
        title: "Welcome to Community Help App!",
        message:
          "We are excited to launch this platform to connect people who need help with generous donors in the community. Together, we can make a difference!",
        type: "success",
        category: "community",
        createdBy: adminUserId,
        lastModifiedBy: adminUserId,
        isPinned: true,
        targetAudience: "all",
        displaySettings: {
          showOnDashboard: true,
          showInNotifications: false,
        },
      },
      {
        title: "System Maintenance Scheduled",
        message:
          "We will be performing system maintenance this Saturday from 2 AM to 4 AM EST. The platform may be temporarily unavailable during this time.",
        type: "warning",
        category: "system",
        createdBy: adminUserId,
        lastModifiedBy: adminUserId,
        isPinned: false,
        targetAudience: "all",
        displaySettings: {
          showOnDashboard: true,
          showInNotifications: true,
        },
        scheduling: {
          publishAt: new Date(),
          expireAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
        },
      },
      {
        title: "Guidelines for Help Requests",
        message:
          "Please ensure your help requests are specific and include accurate pickup information. This helps donors provide assistance more effectively.",
        type: "info",
        category: "policy",
        createdBy: adminUserId,
        lastModifiedBy: adminUserId,
        targetAudience: "approved_users",
        displaySettings: {
          showOnDashboard: true,
          showInNotifications: false,
        },
      },
    ];

    const createdAnnouncements = await Announcement.insertMany(announcements);
    console.log(`✅ Created ${createdAnnouncements.length} announcements`);
    return createdAnnouncements;
  }

  async seedAll() {
    try {
      await this.connect();

      console.log("🌱 Starting database seeding...\n");

      // Clear existing data
      await this.clearDatabase();

      // Seed data
      const admin = await this.seedAdminUser();
      const users = await this.seedSampleUsers();
      const helpItems = await this.seedHelpItems(admin._id);
      const announcements = await this.seedAnnouncements(admin._id);

      console.log("\n🎉 Database seeding completed successfully!");
      console.log("\n📋 Summary:");
      console.log(`   👤 Admin users: 1`);
      console.log(`   👥 Sample users: ${users.length}`);
      console.log(`   📦 Help items: ${helpItems.length}`);
      console.log(`   📢 Announcements: ${announcements.length}`);

      console.log("\n🔐 Admin Credentials:");
      console.log(`   Email: ${admin.email}`);
      console.log(
        `   Password: ${process.env.ADMIN_DEFAULT_PASSWORD || "admin123456"}`
      );

      console.log("\n👥 Sample User Credentials:");
      console.log("   All users have password: password123");
      console.log("   john.donor@example.com (Approved)");
      console.log("   alice.helper@example.com (Approved)");
      console.log("   bob.recipient@example.com (Approved)");
      console.log("   carol.pending@example.com (Pending)");
      console.log("   david.unverified@example.com (Unverified)");
    } catch (error) {
      console.error("❌ Seeding failed:", error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async seedMinimal() {
    try {
      await this.connect();

      console.log("🌱 Starting minimal database seeding...\n");

      // Only seed admin and help items
      const admin = await this.seedAdminUser();
      const helpItems = await this.seedHelpItems(admin._id);

      console.log("\n🎉 Minimal database seeding completed!");
      console.log("\n📋 Summary:");
      console.log(`   👤 Admin users: 1`);
      console.log(`   📦 Help items: ${helpItems.length}`);

      console.log("\n🔐 Admin Credentials:");
      console.log(`   Email: ${admin.email}`);
      console.log(
        `   Password: ${process.env.ADMIN_DEFAULT_PASSWORD || "admin123456"}`
      );
    } catch (error) {
      console.error("❌ Minimal seeding failed:", error);
      throw error;
    } finally {
      await this.disconnect();
    }
  }
}

// CLI Interface
const seeder = new DatabaseSeeder();

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "all":
    seeder
      .seedAll()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
    break;

  case "minimal":
    seeder
      .seedMinimal()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
    break;

  case "clear":
    seeder
      .connect()
      .then(() => seeder.clearDatabase())
      .then(() => seeder.disconnect())
      .then(() => {
        console.log("✅ Database cleared successfully");
        process.exit(0);
      })
      .catch(() => process.exit(1));
    break;

  default:
    console.log("Usage: node seedDatabase.js [command]");
    console.log("Commands:");
    console.log(
      "  all     - Seed complete database with admin, users, items, and announcements"
    );
    console.log("  minimal - Seed only admin user and help items");
    console.log("  clear   - Clear all data from database");
    process.exit(1);
}

module.exports = DatabaseSeeder;
