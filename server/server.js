import express from "express";
import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import hostRoutes from "./routes/hostRoutes.js";
import patchRoutes from "./routes/patchRoutes.js";
import logRoutes from "./routes/logRoutes.js";
import schedulerRoutes from "./routes/schedulerRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import { connectMongo } from "./db/mongo.js";
import { initializeDefaultGroups } from "./utils/groupManager.js";
import { InstallLog } from "./models/InstallLog.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8084;

// SSL Certificate paths
const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, "../certs/10.10.8.53+2-key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "../certs/10.10.8.53+2.pem")),
};

// Middleware
app.use(
  cors({
    origin: [
      "https://localhost:8083",
      "https://10.10.8.53:8083",
      "https://127.0.0.1:8083",
      process.env.FRONTEND_URL,
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

async function start() {
  await connectMongo();
  await initializeDefaultGroups();

  // Routes
  app.use("/api/hosts", hostRoutes);
  app.use("/api/patches", patchRoutes);
  app.use("/api/logs", logRoutes);
  app.use("/api/scheduler", schedulerRoutes);
  app.use("/api/groups", groupRoutes);

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      message: "Backend server is running",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      protocol: "https",
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: "Not Found",
      message: `Route ${req.method} ${req.path} not found`,
    });
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error("Error:", err);
    res.status(err.status || 500).json({
      error: err.message || "Internal Server Error",
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  });

  // Start HTTPS server
  https.createServer(sslOptions, app).listen(PORT, "0.0.0.0", () => {
    console.log(`🔒 Backend server running on https://localhost:${PORT}`);
  });

  // Backfill installType
  await InstallLog.updateMany(
    { installType: { $exists: false } },
    { $set: { installType: "full" } }
  ).catch((e) => console.warn("Backfill installType failed:", e.message));
}

start();
