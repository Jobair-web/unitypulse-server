import { Router } from "express";
import { ObjectId } from "mongodb";
import { verifyJwt } from "../middleware/verifyJwt.js";
import { validateEvent } from "../utils/validate.js";
import { startOfTodayUTC } from "../utils/dates.js";
import { EVENT_TYPES } from "../constants.js";

const router = Router();

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const notFound = (res) => res.status(404).json({ message: "We couldn't find that event." });

function parseId(id) {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === id ? new ObjectId(id) : null;
}

// GET /api/events?search=&type=&sort=asc|desc&limit=  -> upcoming events only (public)
router.get(
  "/",
  wrap(async (req, res) => {
    const search = String(req.query.search || "").trim().slice(0, 60);
    const type = String(req.query.type || "");
    const sort = req.query.sort === "desc" ? -1 : 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 0, 50);

    const filter = { eventDate: { $gte: startOfTodayUTC() } };
    if (EVENT_TYPES.includes(type)) filter.type = type;
    if (search) {
      const rx = new RegExp(escapeRegex(search), "i");
      filter.$or = [{ title: rx }, { location: rx }, { description: rx }];
    }

    let cursor = req.db.collection("events").find(filter).sort({ eventDate: sort, createdAt: -1 });
    if (limit) cursor = cursor.limit(limit);
    res.json({ events: await cursor.toArray() });
  })
);

// GET /api/events/mine -> every event created by the logged-in user (JWT)
router.get(
  "/mine",
  verifyJwt,
  wrap(async (req, res) => {
    const events = await req.db
      .collection("events")
      .find({ "createdBy.email": req.user.email })
      .sort({ eventDate: 1 })
      .toArray();
    res.json({ events });
  })
);

// GET /api/events/:id (public)
router.get(
  "/:id",
  wrap(async (req, res) => {
    const _id = parseId(req.params.id);
    if (!_id) return notFound(res);
    const event = await req.db.collection("events").findOne({ _id });
    if (!event) return notFound(res);
    res.json({ event });
  })
);

// GET /api/events/:id/status -> has this user joined / do they own it? (JWT)
router.get(
  "/:id/status",
  verifyJwt,
  wrap(async (req, res) => {
    const _id = parseId(req.params.id);
    if (!_id) return notFound(res);
    const event = await req.db.collection("events").findOne({ _id }, { projection: { createdBy: 1 } });
    if (!event) return notFound(res);
    const joined = await req.db.collection("joins").findOne({ eventId: _id, userEmail: req.user.email });
    res.json({ joined: Boolean(joined), isOwner: event.createdBy.email === req.user.email });
  })
);

// POST /api/events -> create (JWT). The creator's email is stored with the event.
router.post(
  "/",
  verifyJwt,
  wrap(async (req, res) => {
    const { errors, valid, value } = validateEvent(req.body);
    if (!valid) return res.status(400).json({ message: "Please fix the highlighted fields.", errors });

    const now = new Date();
    const doc = {
      ...value,
      createdBy: { email: req.user.email, name: req.user.name, image: req.user.image },
      participantsCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    const result = await req.db.collection("events").insertOne(doc);
    res.status(201).json({ message: "Event created", event: { ...doc, _id: result.insertedId } });
  })
);

// PUT /api/events/:id -> update (owner only, JWT)
router.put(
  "/:id",
  verifyJwt,
  wrap(async (req, res) => {
    const _id = parseId(req.params.id);
    if (!_id) return notFound(res);
    const events = req.db.collection("events");
    const existing = await events.findOne({ _id });
    if (!existing) return notFound(res);
    if (existing.createdBy.email !== req.user.email)
      return res.status(403).json({ message: "You can only update events you created." });

    const { errors, valid, value } = validateEvent(req.body, { existingDate: existing.eventDate });
    if (!valid) return res.status(400).json({ message: "Please fix the highlighted fields.", errors });

    await events.updateOne({ _id }, { $set: { ...value, updatedAt: new Date() } });
    res.json({ message: "Event updated" });
  })
);

// DELETE /api/events/:id -> delete (owner only, JWT)
router.delete(
  "/:id",
  verifyJwt,
  wrap(async (req, res) => {
    const _id = parseId(req.params.id);
    if (!_id) return notFound(res);
    const events = req.db.collection("events");
    const existing = await events.findOne({ _id });
    if (!existing) return notFound(res);
    if (existing.createdBy.email !== req.user.email)
      return res.status(403).json({ message: "You can only delete events you created." });

    await events.deleteOne({ _id });
    await req.db.collection("joins").deleteMany({ eventId: _id });
    res.json({ message: "Event deleted" });
  })
);

// POST /api/events/:id/join -> join an event (JWT)
router.post(
  "/:id/join",
  verifyJwt,
  wrap(async (req, res) => {
    const _id = parseId(req.params.id);
    if (!_id) return notFound(res);
    const events = req.db.collection("events");
    const event = await events.findOne({ _id });
    if (!event) return notFound(res);
    if (event.eventDate < startOfTodayUTC())
      return res.status(400).json({ message: "This event has already ended." });
    if (event.createdBy.email === req.user.email)
      return res.status(400).json({ message: "You're hosting this event, so you're already part of it." });

    try {
      await req.db.collection("joins").insertOne({
        eventId: _id,
        userEmail: req.user.email,
        userName: req.user.name,
        userImage: req.user.image,
        // snapshot of the event at the time of joining
        eventTitle: event.title,
        eventType: event.type,
        eventLocation: event.location,
        eventDate: event.eventDate,
        joinedAt: new Date(),
      });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json({ message: "You've already joined this event." });
      throw err;
    }
    const updated = await events.findOneAndUpdate(
      { _id },
      { $inc: { participantsCount: 1 } },
      { returnDocument: "after" }
    );
    res.status(201).json({ message: "Joined", participantsCount: updated?.participantsCount ?? 1 });
  })
);

// DELETE /api/events/:id/join -> leave an event (JWT)
router.delete(
  "/:id/join",
  verifyJwt,
  wrap(async (req, res) => {
    const _id = parseId(req.params.id);
    if (!_id) return notFound(res);
    const result = await req.db.collection("joins").deleteOne({ eventId: _id, userEmail: req.user.email });
    if (!result.deletedCount) return res.status(404).json({ message: "You haven't joined this event." });
    const updated = await req.db
      .collection("events")
      .findOneAndUpdate({ _id }, { $inc: { participantsCount: -1 } }, { returnDocument: "after" });
    res.json({ message: "Left event", participantsCount: Math.max(updated?.participantsCount ?? 0, 0) });
  })
);

export default router;
