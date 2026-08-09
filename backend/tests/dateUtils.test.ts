import { monthsBetween } from "../src/utils/dateUtils";

describe("monthsBetween", () => {
  it("returns 0 for the same date", () => {
    // Arrange
    const date = new Date("2026-01-15T00:00:00Z");

    // Act / Assert
    expect(monthsBetween(date, date)).toBe(0);
  });

  it("counts whole calendar months", () => {
    // Act / Assert
    expect(monthsBetween(new Date("2024-01-15"), new Date("2026-01-15"))).toBe(24);
    expect(monthsBetween(new Date("2025-06-01"), new Date("2025-08-01"))).toBe(2);
  });

  it("does not count a partial month as whole", () => {
    // Arrange — 24 months minus a day.
    const from = new Date("2024-01-16");
    const to = new Date("2026-01-15");

    // Act / Assert
    expect(monthsBetween(from, to)).toBe(23);
  });

  it("rounds down by one extra day for a leap-day `from` date (documented, conservative)", () => {
    // Arrange — Feb 29 2024 (leap year) to Feb 28 2026 (24 months later,
    // not a leap year, so there's no Feb 29 to land on).
    const from = new Date("2024-02-29");
    const to = new Date("2026-02-28");

    // Act / Assert — one day short of the 29th, so this reads as 23
    // whole months rather than 24, per the comment on monthsBetween.
    expect(monthsBetween(from, to)).toBe(23);
    expect(monthsBetween(from, new Date("2026-03-01"))).toBe(24);
  });

  it("defaults `to` to now", () => {
    // Arrange
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

    // Act / Assert
    expect(monthsBetween(twoMonthsAgo)).toBe(2);
  });
});
