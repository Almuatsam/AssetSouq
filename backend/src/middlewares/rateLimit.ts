import rateLimit from "express-rate-limit";

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
