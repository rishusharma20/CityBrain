import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

const addAppleUser = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const exists = await User.findOne({ email: "apple@gmail.com" });
    if (!exists) {
      await User.create({
        fullName: "Apple User",
        email: "apple@gmail.com",
        password: "password123", // Assuming they used a standard test password, but I'll set it to password123
        phone: "9876543210",
        role: "Citizen",
        isVerified: true
      });
      console.log("apple@gmail.com created successfully with password: password123");
    } else {
      console.log("apple@gmail.com already exists.");
    }
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

addAppleUser();
