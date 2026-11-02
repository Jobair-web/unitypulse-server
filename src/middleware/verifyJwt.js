import { createRemoteJWKSet, jwtVerify } from "jose";

const authUrl = () => (process.env.AUTH_URL || "http://localhost:3000").replace(/\/$/, "");

let jwks;
function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(`${authUrl()}/api/auth/jwks`));
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
    return res.status(401).json({ message: "Please log in to continue." });
  }
  try {
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: authUrl(),
      audience: authUrl(),
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
    console.warn("JWT verification failed:", err.message);
    res.status(401).json({ message: "Your session has expired. Please log in again." });
  }
}
