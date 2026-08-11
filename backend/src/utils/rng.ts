import { randomBytes } from "node:crypto";

// A small, fast, deterministic PRNG (mulberry32) — not cryptographically
// secure, but that's not the goal: reproducibility for the draw's audit
// trail (docs/03-App-Flow.md "Draw Flow (detail)" step 4 — winners +
// candidate pool + RNG seed are written to AuditLog) matters more here
// than unpredictability against a sophisticated attacker, and the seed
// itself is generated with real crypto-strength randomness below, so the
// *outcome* still isn't guessable in advance of a draw actually running.
function mulberry32(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 128 bits of real entropy, stored in full on Draw.rngSeed as the audit
// record and folded in full into the PRNG's starting state (see
// deriveNumericSeed) — truncating to a shorter prefix would leave the
// persisted audit value's brute-force resistance far weaker than its bit
// length implies.
export function generateSeed(): string {
  return randomBytes(16).toString("hex");
}

// mulberry32 takes a single 32-bit integer, but the stored seed is 128
// bits — this folds all of it in, rather than using (e.g.) just the first
// 8 hex characters. A plain XOR-fold of same-sized chunks is avoided
// deliberately: it's linear, so structurally repetitive input (e.g. the
// same 32-bit chunk appearing an even number of times) can cancel out to
// the same result regardless of what that chunk actually was. Multiplying
// by an odd constant between each XOR step (a standard hash-combine
// technique) breaks that cancellation.
const HASH_COMBINE_CONSTANT = 0x9e3779b1; // 2^32 / golden ratio — a common odd mixing constant.

function deriveNumericSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 8) {
    const chunk = parseInt(seed.slice(i, i + 8).padEnd(8, "0"), 16);
    hash = Math.imul(hash ^ chunk, HASH_COMBINE_CONSTANT) | 0;
  }
  return hash;
}

// Deterministically shuffles `items` — the same seed and the same input
// array always produce the same output order, which is what makes a
// stored (rngSeed, candidatePoolSnapshot) pair on Draw independently
// re-verifiable later: re-running this function against the original
// candidate list reproduces the exact same draw.
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const next = mulberry32(deriveNumericSeed(seed));
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
