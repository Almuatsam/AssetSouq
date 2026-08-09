import type { AuthSession } from "@/types/auth";

// SECURITY TRADEOFF (documented, not an oversight — reviewed in Phase 1):
// the session token lives in localStorage and is attached to requests via
// an Authorization header (see services/apiClient.ts), rather than an
// httpOnly cookie. This is deliberate, not the ECC default: the backend
// (backend/src/) is a stateless Bearer-header API with no cookie/CSRF
// infrastructure, and retrofitting httpOnly cookies now would mean
// Set-Cookie on login, CORS credentials wiring, and CSRF token
// issuance/validation — a backend redesign, not a frontend tweak, for a
// Phase 1 foundation. Bearer-in-header also structurally avoids CSRF,
// trading a risk this app doesn't have a compensating control for yet
// (XSS-token-theft) for one it also doesn't have machinery for (CSRF).
//
// This is an accepted risk, not a closed one: employee login has no
// password (see backend/src/services/authService.ts), so this token is
// the *only* proof of identity for employees, and there is no CSP yet
// (the primary compensating control for "localStorage is fine for an
// internal app" in practice). Revisit before Phase 2/3 add write-heavy
// admin flows, file uploads, or any rich/user-generated content — that's
// when this combination becomes materially more dangerous.
const STORAGE_KEY = "assetsouq.auth";

export function getStoredSession(): AuthSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    // Corrupt/foreign value under our key — treat as logged out rather
    // than throwing during app init.
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function setStoredSession(session: AuthSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}
