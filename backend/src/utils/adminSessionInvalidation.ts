// In-memory, per-process record of "admin id -> reject tokens issued
// strictly before this Unix timestamp (seconds)".
//
// This extends, rather than contradicts, utils/jwt.ts's documented
// "no server-side token revocation" tradeoff: that comment already notes
// the standard fix is a short-TTL token + refresh, or a revocation list
// keyed by a token jti — this is a minimal version of the latter, scoped
// to admin tokens only and backed by memory instead of a store, because
// this app runs a single backend replica in production (see
// docker-compose.prod.yml / docs/07-Deployment.md) where that's a real,
// working guarantee rather than a false sense of one. The cost is that a
// process restart forgets every invalidation (tokens that were only
// invalidated, not naturally expired, become valid again) — acceptable
// for what this exists to do today: make sure a bearer token issued
// before the one-time admin credential handover
// (services/adminAccountService.ts) stops working immediately afterward,
// not general session management. If broader revocation is ever needed,
// replace this with the DB/jti-based approach jwt.ts already points at.
const invalidatedBefore = new Map<number, number>();

export function invalidateAdminSessions(adminId: number): void {
  invalidatedBefore.set(adminId, Math.floor(Date.now() / 1000));
}

// A token issued in the same second as the invalidation call is treated
// as still valid (>=, not >) — this only needs to reject tokens that
// existed *before* the credential change, not create a same-second race
// of its own.
export function isAdminTokenStillValid(adminId: number, issuedAtSeconds: number): boolean {
  const cutoff = invalidatedBefore.get(adminId);
  return cutoff === undefined || issuedAtSeconds >= cutoff;
}
