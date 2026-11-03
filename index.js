import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectDB } from "./src/db.js";
import eventsRouter from "./src/routes/events.js";
import joinedRouter from "./src/routes/joined.js";
import { authCheck } from "./src/middleware/verifyJwt.js";

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: allowedOrigins, methods: ["GET", "POST", "PUT", "DELETE"] }));
app.use(express.json({ limit: "100kb" }));

app.get("/", (_req, res) => {
  res.json({ name: "UnityPulse API", status: "running" });
});

// Debug helper: open /api/auth-check on the live server to test the JWT setup
app.get("/api/auth-check", authCheck);

// Lazy, cached DB connection (works locally and on serverless hosts)
app.use(async (req, _res, next) => {
  try {
    req.db = await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.use("/api/events", eventsRouter);
app.use("/api/joined", joinedRouter);

app.use((_req, res) => {
  res.status(404).json({ message: "We couldn't find that route." });
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Something went wrong on our side. Please try again." });
});

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`UnityPulse API running on http://localhost:${PORT}`));
}

export default app;