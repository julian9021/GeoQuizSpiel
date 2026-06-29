// Daily Battle puzzle generator

import { COUNTRIES_WITH_POP, type Country } from "./db";
import { randomSeed, mulberry32, shuffle } from "./daily";

export function generateBattleChain(seed?: number): Country[] {
  const rng = mulberry32(seed ?? randomSeed());

  const pool = COUNTRIES_WITH_POP.filter((c) => c.population > 500_000);

  // Pick 11 countries for 10 rounds, ensure no two are too close
  let picked: Country[] = [];
  let attempts = 0;

  while (attempts < 200) {
    attempts++;
    const candidates = shuffle(pool, rng).slice(0, 11);
    // Just verify they're reasonably spread
    const pops = candidates.map((c) => c.population).sort((a, b) => a - b);
    let ok = true;
    for (let i = 0; i < pops.length - 1; i++) {
      if (pops[i] > 0 && pops[i + 1] / pops[i] < 1.05) {
        ok = false;
        break;
      }
    }
    if (ok) {
      picked = candidates;
      break;
    }
  }

  if (picked.length < 11) {
    picked = shuffle(pool, rng).slice(0, 11);
  }

  // Shuffle the chain order (not sorted by value!)
  return shuffle(picked, rng);
}
