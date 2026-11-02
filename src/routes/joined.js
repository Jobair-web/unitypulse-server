import { Router } from "express";
import { verifyJwt } from "../middleware/verifyJwt.js";

const router = Router();

// GET /api/joined -> events the logged-in user joined, sorted by event date (JWT)
router.get("/", verifyJwt, async (req, res, next) => {
  try {
    const joined = await req.db
      .collection("joins")
      .aggregate([
        { $match: { userEmail: req.user.email } },
        { $lookup: { from: "events", localField: "eventId", foreignField: "_id", as: "event" } },
        { $unwind: "$event" },
        { $sort: { "event.eventDate": 1 } },
        { $project: { _id: 1, joinedAt: 1, event: 1 } },
      ])
      .toArray();
    res.json({ joined });
  } catch (err) {
    next(err);
  }
});

export default router;
