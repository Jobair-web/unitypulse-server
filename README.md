

# UnityPulse API

The REST API behind **UnityPulse**, the community social service events platform.

[Live Site](https://unitypulse-client.vercel.app)

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT_(JWKS)-d63aff)


---

## Overview

This server stores and serves every event and every join for UnityPulse. Public routes let anyone browse upcoming events. Protected routes need a valid **JWT** issued by Better Auth in the Next.js client, and the server checks it against the client's public keys before doing anything.

## Features

- **JWT verification with JWKS.** Tokens are verified with `jose` against the public key set at `/api/auth/jwks`, including issuer and audience checks.
- **Owner-only changes.** The creator's email is stored on every event and checked before an update or delete.
- **Upcoming-only listing** with search, type filter, sorting and a `limit` option used by the home page.
- **Join and leave** with a unique database index that blocks duplicate joins and a live `participantsCount` on each event.
- **Joined events sorted by event date**, built with a MongoDB `$lookup` aggregation.
- **Strict server-side validation** for every event, including the rule that the date must be in the future.
- **Cached MongoDB connection** with automatic index creation.
- **Debug route** (`/api/auth-check`) that shows whether the server can reach the client's public keys.

## Tech Stack

Node.js 18+ · Express 4 · MongoDB driver 6 · jose · Helmet · CORS · dotenv

## API Reference

Base path: `/api`. Protected routes need the header `Authorization: Bearer <JWT>`.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/events` | Public | Upcoming events. Query: `search`, `type`, `sort` (`asc` or `desc`), `limit` |
| GET | `/events/:id` | Public | A single event |
| GET | `/events/mine` | JWT | Events created by the logged-in user |
| GET | `/events/:id/status` | JWT | Whether the user joined the event or owns it |
| POST | `/events` | JWT | Create an event |
| PUT | `/events/:id` | JWT, owner | Update an event |
| DELETE | `/events/:id` | JWT, owner | Delete an event and its joins |
| POST | `/events/:id/join` | JWT | Join an event |
| DELETE | `/events/:id/join` | JWT | Leave an event |
| GET | `/joined` | JWT | Events the user joined, sorted by event date |
| GET | `/auth-check` | Public | Debug: tests access to the client's public keys |

### Example: create an event

```http
POST /api/events
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "title": "Winter Clothes Distribution, Mirpur 10",
  "type": "Clothing",
  "description": "Sort, pack and hand out warm clothes to 300 families before the cold snap.",
  "thumbnail": "https://example.com/photo.jpg",
  "location": "Mirpur 10 Community Field, Dhaka",
  "eventDate": "2026-12-05"
}
```

### Response codes

| Code | Meaning |
|---|---|
| `200` / `201` | Success |
| `400` | Validation failed. The body includes an `errors` object with a message per field |
| `401` | Missing, invalid or expired token. The body includes a `reason` code |
| `403` | The event belongs to someone else |
| `404` | Event or route not found |
| `409` | The user already joined this event |

## Validation Rules

| Field | Rule |
|---|---|
| `title` | 5 to 80 characters |
| `type` | Cleanup, Plantation, Donation, Clothing, Food, Health, Education, Blood Drive or Other |
| `description` | 30 to 600 characters |
| `thumbnail` | A valid `http` or `https` URL |
| `location` | 3 to 120 characters |
| `eventDate` | `YYYY-MM-DD`, must be after today |

## Data Model

**`events`**
```js
{
  title, type, description, thumbnail, location,
  eventDate,                         // UTC midnight of the chosen day
  createdBy: { email, name, image }, // used for owner checks
  participantsCount,
  createdAt, updatedAt
}
```

**`joins`**
```js
{
  eventId, userEmail, userName, userImage,
  eventTitle, eventType, eventLocation, eventDate,  // snapshot when joined
  joinedAt
}
// unique index on { eventId, userEmail }
```

Better Auth creates its own collections (`user`, `session`, `account`, `jwks`, `verification`) in the same database.

## How JWT Verification Works

1. A member logs in on the client. Better Auth creates a session.
2. For each private request the client gets a short-lived JWT from Better Auth.
3. The server downloads the public keys from `AUTH_URL/api/auth/jwks` (cached) and verifies the token signature, issuer and audience.
4. The verified email becomes `req.user.email` and is used for every permission check.

## Project Structure

```
server/
├── index.js              App entry: CORS, Helmet, routes, error handling
├── vercel.json           Optional Vercel config
└── src/
    ├── db.js             Cached MongoDB connection and indexes
    ├── constants.js      Allowed event types
    ├── seed.js           Demo data script
    ├── middleware/
    │   └── verifyJwt.js  JWT verification and auth-check route
    ├── routes/
    │   ├── events.js     Event, join and leave routes
    │   └── joined.js     Joined events route
    └── utils/
        ├── dates.js      Date helpers
        └── validate.js   Event validation
```

## Deployment (Render)

| Setting | Value |
|---|---|
| Build Command | `npm install` |
| Start Command | `npm start` |
| Environment | `MONGODB_URI`, `DB_NAME`, `CLIENT_URL`, `AUTH_URL` |


## Author

**Mohammod Jobair**


<div align="center">
Made with care for our neighbourhoods.
</div>