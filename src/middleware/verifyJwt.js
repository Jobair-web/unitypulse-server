import { createRemoteJWKSet, jwtVerify } from "jose";

// AUTH_URL = the public URL of the Next.js client (same as BETTER_AUTH_URL there).
// You may list several URLs separated by commas, e.g. a main domain plus an alias.
export const authUrls = () =>
  (process.env.AUTH_URL || "http://localhost:3000")
    .split(",")
    .map((u) => u.trim().replace(/\/+$/, ""))
    .filter(Boolean);

// Accept each URL with and without a trailing slash
const accepted = () => authUrls().flatMap((u) => [u, `${u}/`]);

let jwks;
function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${authUrls()[0]}/api/auth/jwks`), { cooldownDuration: 5000 });
  }
  return jwks;
}

/**
 * Verifies the Better Auth JWT sent as `Authorization: Bearer <token>`.
 * On success it exposes the verified user as req.user.
 */
export async function verifyJwt(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: "Please log in to continue.", reason: "missing_token" });
  }
  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: accepted(),
      audience: accepted(),
    });
    if (!payload.email) throw new Error("Token has no email");
    req.user = {
      id: payload.id || payload.sub,
      email: String(payload.email).toLowerCase(),
      name: payload.name || "UnityPulse member",
      image: payload.image || "",
    };
    next();
  } catch (err) {
    console.warn("JWT verification failed:", err.code || "", err.message);
    res.status(401).json({
      message: "Your session has expired. Please log in again.",
      reason: err.code || "invalid_token",
    });
  }
}

/** GET /api/auth-check: shows whether this server can reach the client's JWKS (for debugging deployments). */
export async function authCheck(_req, res) {
  const jwksUrl = `${authUrls()[0]}/api/auth/jwks`;
  try {
    const r = await fetch(jwksUrl);
    const text = await r.text();
    let keysFound = null;
    try {
      keysFound = JSON.parse(text).keys?.length ?? 0;
    } catch {
      /* the response was not JSON */
    }
    res.json({ authUrls: authUrls(), jwksUrl, status: r.status, keysFound, ok: r.ok && keysFound !== null });
  } catch (err) {
    res.json({ authUrls: authUrls(), jwksUrl, ok: false, error: err.message });
  }
}