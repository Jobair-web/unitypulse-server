import "dotenv/config";
import { MongoClient } from "mongodb";

// Demo data so the home page and Upcoming Events page are not empty on day one.
// Run:  npm run seed
const SEED_EMAIL = "community@unitypulse.dev";
const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=70`;

const day = (offset) => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset));
};

const samples = [
  ["Winter Clothes Distribution, Mirpur 10", "Clothing", "Mirpur 10 Community Field, Dhaka", 6,
   "Sort, pack and hand out warm clothes to 300 families before the cold snap. Gloves, caps and children's jackets are especially welcome.",
   img("photo-1593113598332-cd288d649433")],
  ["Blanket Distribution for the Needy, Mohammadpur", "Donation", "Town Hall Road, Mohammadpur, Dhaka", 10,
   "Hand-deliver blankets and hot tea to families sleeping outdoors on the coldest nights. Volunteers will walk in small groups.",
   img("photo-1488521787991-ed7bbaae773c")],
  ["Beach Cleanup Morning, Patenga", "Cleanup", "Patenga Sea Beach, Chattogram", 14,
   "Gloves and bags are provided. Help us clear plastic from the shoreline before the tide comes in, then enjoy tea together.",
   img("photo-1618477461853-cf6ed80faba5")],
  ["Tree Plantation Day, Ramna Park", "Plantation", "Ramna Park, Dhaka", 18,
   "Plant 200 saplings with local students and a forestry volunteer. Bring a water bottle and comfortable shoes.",
   img("photo-1469571486292-0ba58a3f068b")],
  ["Free Health Check-up Camp, Jatrabari", "Health", "Jatrabari Community Clinic, Dhaka", 22,
   "Volunteer doctors will offer blood pressure and sugar checks. We need helpers for registration and queue support.",
   img("photo-1559027615-cd4628902d4a")],
  ["Community Iftar-style Meal Packs, Kamalapur", "Food", "Kamalapur Station Road, Dhaka", 26,
   "Pack and distribute 500 warm meal boxes to day labourers and rickshaw pullers. Kitchen and delivery teams needed.",
   img("photo-1532629345422-7515f3d16bb6")],
  ["Weekend Reading Circle for Street Children", "Education", "Shahbag Library Lawn, Dhaka", 30,
   "Read stories, draw and play with children from nearby communities. Bring a favourite picture book to donate.",
   img("photo-1488521787991-ed7bbaae773c")],
  ["Blood Donation Drive, Sylhet", "Blood Drive", "Sylhet MAG Osmani Medical College", 35,
   "Join our donor drive and help hospital blood banks stay stocked. Eat a good meal beforehand and bring a photo ID.",
   img("photo-1559027615-cd4628902d4a")],
];

const client = new MongoClient(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017");
try {
  await client.connect();
  const db = client.db(process.env.DB_NAME || "unitypulse");
  const events = db.collection("events");
  await events.deleteMany({ "createdBy.email": SEED_EMAIL });
  const now = new Date();
  const docs = samples.map(([title, type, location, offset, description, thumbnail]) => ({
    title, type, location, description, thumbnail,
    eventDate: day(offset),
    createdBy: { email: SEED_EMAIL, name: "UnityPulse Community", image: "" },
    participantsCount: 0,
    createdAt: now,
    updatedAt: now,
  }));
  await events.insertMany(docs);
  console.log(`Seeded ${docs.length} upcoming events.`);
} finally {
  await client.close();
}
