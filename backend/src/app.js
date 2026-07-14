import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import officerRoutes from "./routes/officerRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import heatmapRoutes from "./routes/heatmapRoutes.js";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";
import publicRoutes from "./routes/publicRoutes.js";

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health Check Route
app.get("/api/health", (req, res) => {
    return res.status(200).json({
        success: true,
        message: "CityBrains Backend Running",
    });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/officer", officerRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/heatmaps", heatmapRoutes);
app.use("/api/leaderboards", leaderboardRoutes);
app.use("/api/public", publicRoutes);

// Global Error Handling Middleware
app.use((err, req, res, next) => {
    console.error("Global Error Handler:", err);

    // Handle invalid JSON parsing errors specifically
    if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        return res.status(400).json({
            success: false,
            message: "Invalid JSON payload. Please check your request body and headers.",
        });
    }

    const statusCode = err.statusCode || 500;
    return res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error",
    });
});

export default app;