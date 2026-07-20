import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/User.js";
import Complaint from "./src/models/Complaint.js";

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected for Seeding");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany({});
    await Complaint.deleteMany({});
    console.log("Cleared existing users and complaints");

    // 1. Create Admin
    const admin = await User.create({
      fullName: "System Admin",
      email: "admin@citybrains.com",
      password: "password123", // Will be hashed by pre-save hook
      phone: "9999999999",
      role: "Admin",
      isVerified: true,
    });
    console.log("Admin created");

    // 2. Create Officer
    const officer = await User.create({
      fullName: "John Officer",
      email: "officer@citybrains.com",
      password: "password123",
      phone: "8888888888",
      role: "Officer",
      department: "Sanitation",
      ward: "1",
      isVerified: true,
    });
    console.log("Officer created");

    // 3. Create Citizen
    const citizen = await User.create({
      fullName: "Jane Citizen",
      email: "citizen@citybrains.com",
      password: "password123",
      phone: "7777777777",
      role: "Citizen",
      isVerified: true,
    });
    console.log("Citizen created");

    // 4. Create Complaints
    const complaint1 = await Complaint.create({
      complaintId: "CB-000001",
      title: "Garbage not collected for a week",
      description: "The garbage bin near the central park is overflowing and smells bad.",
      category: "Garbage",
      priority: "HIGH",
      status: "PENDING",
      location: { type: "Point", coordinates: [77.5946, 12.9716] },
      address: "Central Park Road",
      wardNumber: 1,
      createdBy: citizen._id,
    });

    const complaint2 = await Complaint.create({
      complaintId: "CB-000002",
      title: "Streetlight not working",
      description: "The streetlight on 5th Avenue is completely dark, causing safety issues.",
      category: "Street Lights",
      priority: "MEDIUM",
      status: "ASSIGNED",
      location: { type: "Point", coordinates: [77.5948, 12.9720] },
      address: "5th Avenue",
      wardNumber: 1,
      createdBy: citizen._id,
      assignedOfficer: officer._id,
    });

    const complaint3 = await Complaint.create({
      complaintId: "CB-000003",
      title: "Pothole on Main Street",
      description: "Large pothole causing traffic slowdowns and potential accidents.",
      category: "Potholes",
      priority: "CRITICAL",
      status: "RESOLVED",
      location: { type: "Point", coordinates: [77.5950, 12.9725] },
      address: "Main Street",
      wardNumber: 1,
      createdBy: citizen._id,
      assignedOfficer: officer._id,
      resolvedAt: new Date(),
      resolutionRemarks: "Pothole filled and road smoothed.",
    });

    console.log("Complaints created");

    console.log("Data seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
};

seedData();
