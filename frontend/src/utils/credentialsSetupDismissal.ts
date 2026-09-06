// Tracks only "did this admin dismiss the auto-opened one-time credential
// setup modal already this browser session" — a pure UX nicety (don't
// nag on every dashboard revisit), never the actual completion state.
// That distinction matters: the real one-time gate is entirely backend-
// enforced (Admin.credentialsChangedAt, checked server-side on every
// submit attempt — see backend/src/services/adminAccountService.ts), so
// storing this transient "snooze" flag in sessionStorage doesn't weaken
// that guarantee. Keyed by admin id and scoped to sessionStorage (not
// localStorage) specifically so it resets on tab close / new session,
// consistent with "auto-open once per dashboard mount, don't repeatedly
// force it" rather than "never show it again."
const KEY_PREFIX = "assetsouq.credentialsSetupDismissed.";

export function wasCredentialsSetupDismissedThisSession(adminId: number): boolean {
  try {
    return sessionStorage.getItem(`${KEY_PREFIX}${adminId}`) === "true";
  } catch {
    // sessionStorage unavailable (private browsing, etc.) — worst case the
    // modal auto-opens again on the next mount, not a functional break.
    return false;
  }
}

export function markCredentialsSetupDismissedThisSession(adminId: number): void {
  try {
    sessionStorage.setItem(`${KEY_PREFIX}${adminId}`, "true");
  } catch {
    // See above — non-fatal if storage isn't available.
  }
}
