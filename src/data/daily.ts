// Deterministic daily seed & PRNG — shared across all games

export function dailySeed(date = new Date()): number {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return y * 10000 + m * 100 + d;
}

/** Random seed for free-play (non-daily) mode */
export function randomSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

export function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates shuffle using provided rng */
export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick n random items from arr using rng */
export function pickN<T>(arr: T[], n: number, rng: () => number): T[] {
  const shuffled = shuffle(arr, rng);
  return shuffled.slice(0, n);
}

/** Pick one random item */
export function pickOne<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}
