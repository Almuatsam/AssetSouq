// Whole calendar months between `from` and `to` (defaults to now). Used
// for the 24-month previous-winner cooldown (docs/01-PRD.md business
// rule 4) — a simple Y/M/D comparison (using the server's local calendar
// fields, not a UTC diff) rather than dividing a millisecond difference,
// which would drift around leap years and variable month lengths.
//
// Edge case: for a `from` of Feb 29 on a leap year, the 24-months-later
// "anniversary" month has no Feb 29 (2 years is always an even number of
// years, so it's never itself a leap year at that same month). to.getDate()
// (<=28) is then always less than from.getDate() (29), so the day-rollback
// branch below fires and the cooldown effectively extends by one extra
// day past the 24-month mark — a conservative rounding (never early,
// only slightly later), not a bug.
export function monthsBetween(from: Date, to: Date = new Date()): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) {
    months -= 1;
  }
  return months;
}
