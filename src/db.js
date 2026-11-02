import { MongoClient } from "mongodb";

let dbPromise;

async function init() {
  const client = new MongoClient(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017");
  await client.connect();
  const db = client.db(process.env.DB_NAME || "unitypulse");
  await Promise.all([
    db.collection("events").createIndex({ eventDate: 1 }),
    db.collection("events").createIndex({ "createdBy.email": 1 }),
    db.collection("joins").createIndex({ eventId: 1, userEmail: 1 }, { unique: true }),
    db.collection("joins").createIndex({ userEmail: 1 }),
  ]);
  return db;
}

export function connectDB() {
  if (!dbPromise) {
    dbPromise = init().catch((err) => {
      dbPromise = undefined; // allow a retry on the next request
      throw err;
    });
  }
  return dbPromise;
}
