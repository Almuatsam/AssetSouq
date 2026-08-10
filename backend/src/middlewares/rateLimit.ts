import rateLimit from "express-rate-limit";
import type { Request } from "express";

// Both login endpoints identify a principal by something an attacker can
// guess (staff ID) or brute-force (password) — throttle hard per IP.
//
// Separate instances (not one shared limiter) so a burst on one endpoint
// can't exhaust the budget that protects the other — e.g. heavy employee
// login traffic shouldn't be able to lock admins out of /admin/login.
function createLoginRateLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: "Too many login attempts. Please try again later." },
  });
}

export const employeeLoginRateLimiter = createLoginRateLimiter();
export const adminLoginRateLimiter = createLoginRateLimiter();

// Authenticated routes: key by the signed-in user (not just IP) so this
// actually bounds what one identity can do — IP-only would still let a
// single employee behind a shared corporate NAT collapse into one bucket
// with everyone else on that egress point (same class of issue as the
// login limiters' trust-proxy config). Falls back to IP only in the
// (practically unreachable, since these routes require authenticate()
// first) case req.user is somehow missing.
function createUserKeyedRateLimiter(limit: number) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => (req.user ? `user:${req.user.id}` : `ip:${req.ip ?? "unknown"}`),
    message: { success: false, error: "Too many requests. Please try again later." },
  });
}

export const registrationRateLimiter = createUserKeyedRateLimiter(20);

// Admin device writes (create/update) — generous enough for legitimate
// bulk operations (e.g. entering a batch of newly retired devices) but
// still bounded, since these are unprotected by anything else.
export const adminDeviceWriteRateLimiter = createUserKeyedRateLimiter(60);

// Deliberately a separate instance from deviceRateLimiter below, even
// though the limits happen to match today — an admin browsing
// /admin/devices must not be able to get rate-limited out by heavy
// employee traffic on /devices sharing the same IP (the same class of
// issue the login limiters' own comment above already calls out).
export const adminDeviceReadRateLimiter = createUserKeyedRateLimiter(120);

// Same rationale as the admin device limiters above — separate instances
// per admin resource so heavy traffic on one (e.g. a bulk employee import
// in a future phase) can't exhaust the budget that protects another.
export const adminEmployeeWriteRateLimiter = createUserKeyedRateLimiter(60);
export const adminEmployeeReadRateLimiter = createUserKeyedRateLimiter(120);

// Read-only, no side effects — a generous ceiling just to stop naive
// scripted abuse, not to bound legitimate browsing.
export const deviceRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests. Please try again later." },
});
