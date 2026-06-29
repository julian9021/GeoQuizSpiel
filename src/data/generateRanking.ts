// Daily Ranking puzzle generator

import { COUNTRIES_WITH_POP, type Country } from "./db";
import { randomSeed, mulberry32, shuffle, pickN } from "./daily";

export interface RankingPuzzle {
  metric: { label: string; direction: string };
  countries: Country[];       // presentation order (shuffled)
  correctOrder: Country[];    // sorted by metric desc
}

export function generateRankingPuzzle(seed?: number): RankingPuzzle {
  const rng = mulberry32(seed ?? randomSeed());

  // Pick 10 countries with good population spread
  // Ensure pairwise min distance (ratio < 0.85)
  const pool = COUNTRIES_WITH_POP.filter((c) => c.population > 500_000);
  let picked: Country[] = [];
  let attempts = 0;

  while (picked.length < 10 && attempts < 200) {
    attempts++;
    const candidates = pickN(pool, 10, rng);
    // Check pairwise distance
    const sorted = [...candidates].sort((a, b) => b.population - a.population);
    let ok = true;
    for (let i = 0; i < sorted.length - 1; i++) {
      const ratio = sorted[i + 1].population / sorted[i].population;
      if (ratio > 0.92) {
        ok = false;
        break;
      }
    }
    if (ok) {
      picked = candidates;
      break;
    }
  }

  // Fallback: just use what we got
  if (picked.length < 10) {
    picked = pickN(pool, 10, rng);
  }

  const correctOrder = [...picked].sort((a, b) => b.population - a.population);
  const presentation = shuffle(picked, rng);

  return {
    metric: { label: "Population", direction: "highest on top" },
    countries: presentation,
    correctOrder,
  };
}
