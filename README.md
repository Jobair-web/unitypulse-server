# UnityPulse API

Express + MongoDB REST API. Protected routes verify the Better Auth JWT (`Authorization: Bearer <token>`)
against the public keys served by the Next.js app at `AUTH_URL/api/auth/jwks`.

| Method | Route | Access |
|---|---|---|
| GET | `/api/events?search=&type=&sort=&limit=` | Public, upcoming events only |
| GET | `/api/events/:id` | Public |
| GET | `/api/events/mine` | JWT |
| GET | `/api/events/:id/status` | JWT |
| POST | `/api/events` | JWT |
| PUT / DELETE | `/api/events/:id` | JWT, owner only |
| POST / DELETE | `/api/events/:id/join` | JWT |
| GET | `/api/joined` | JWT, sorted by event date |

```bash
cp .env.example .env
npm install
npm run seed   # optional demo events
npm run dev    # http://localhost:5000
```

Deploy: Render (`npm start`) or Vercel (`vercel.json` included). Set the same variables as in `.env.example`.
