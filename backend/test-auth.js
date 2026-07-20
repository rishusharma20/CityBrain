import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

const test = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to DB");

    // Clear test user
    await User.deleteMany({ email: "testapple@gmail.com" });

    // Register user
    const user = await User.create({
      fullName: "Test Apple",
      email: "testapple@gmail.com",
      password: "password123",
      phone: "9998887776",
      role: "Citizen"
    });

    console.log("Registered user password in DB (should be hashed):", user.password);

    // Fetch user
    const fetchedUser = await User.findOne({ email: "testapple@gmail.com" }).select("+password");
    console.log("Fetched user password:", fetchedUser.password);

    // Compare
    const isMatch = await fetchedUser.comparePassword("password123");
    console.log("Password match?", isMatch);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

test();
