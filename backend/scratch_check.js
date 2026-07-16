import "dotenv/config";
import mongoose from "mongoose";
import User from "./src/models/User.js";

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");
    
    const userByEmail = await User.findOne({ email: "rishu@gmail.com" });
    console.log("User by email 'rishu@gmail.com':", userByEmail);
    
    const userByPhone = await User.findOne({ phone: "8900748833" });
    console.log("User by phone '8900748833':", userByPhone);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
  }
};

run();
