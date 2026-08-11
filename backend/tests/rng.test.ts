import { generateSeed, seededShuffle } from "../src/utils/rng";

describe("generateSeed", () => {
  it("returns a 32-character hex string (128 bits)", () => {
    // Act
    const seed = generateSeed();

    // Assert
    expect(seed).toMatch(/^[0-9a-f]{32}$/);
  });

  it("returns a different seed on every call", () => {
    // Act
    const seeds = Array.from({ length: 20 }, () => generateSeed());

    // Assert
    expect(new Set(seeds).size).toBe(20);
  });
});

describe("seededShuffle", () => {
  it("is deterministic — the same seed and input always produce the same order", () => {
    // Arrange
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const seed = "0123456789abcdef0123456789abcdef";

    // Act
    const first = seededShuffle(items, seed);
    const second = seededShuffle(items, seed);

    // Assert
    expect(first).toEqual(second);
  });

  it("produces a different order for a different seed (with overwhelming probability)", () => {
    // Arrange
    const items = Array.from({ length: 20 }, (_, i) => i);

    // Act
    const shuffledA = seededShuffle(items, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    const shuffledB = seededShuffle(items, "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");

    // Assert
    expect(shuffledA).not.toEqual(shuffledB);
  });

  it("is a permutation — same elements, same length, no duplicates or drops", () => {
    // Arrange
    const items = ["a", "b", "c", "d", "e"];

    // Act
    const shuffled = seededShuffle(items, generateSeed());

    // Assert
    expect(shuffled).toHaveLength(items.length);
    expect([...shuffled].sort()).toEqual([...items].sort());
  });

  it("does not mutate the input array", () => {
    // Arrange
    const items = [1, 2, 3, 4, 5];
    const original = [...items];

    // Act
    seededShuffle(items, generateSeed());

    // Assert
    expect(items).toEqual(original);
  });

  it("handles an empty array", () => {
    // Act / Assert
    expect(seededShuffle([], generateSeed())).toEqual([]);
  });

  it("handles a single-element array", () => {
    // Act / Assert
    expect(seededShuffle(["only"], generateSeed())).toEqual(["only"]);
  });
});
