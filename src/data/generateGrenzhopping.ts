// Daily Grenzhopping puzzle generator

import { COUNTRIES_WITH_BORDERS, bfs } from "./db";
import { randomSeed, mulberry32 } from "./daily";

export interface GrenzhoppingPuzzle {
  startCode: string;
  endCode: string;
  optimalDistance: number;
  optimalPath: string[];
}

export function generateGrenzhoppingPuzzle(
  seed?: number
): GrenzhoppingPuzzle {
  const rng = mulberry32(seed ?? randomSeed());

  const pool = COUNTRIES_WITH_BORDERS;
  let attempts = 0;

  while (attempts < 500) {
    attempts++;
    const startIdx = Math.floor(rng() * pool.length);
    const endIdx = Math.floor(rng() * pool.length);
    if (startIdx === endIdx) continue;

    const start = pool[startIdx];
    const end = pool[endIdx];

    const result = bfs(start.code, end.code);
    if (!result) continue;

    // Optimal path between 3 and 7
    if (result.distance < 3 || result.distance > 7) continue;

    return {
      startCode: start.code,
      endCode: end.code,
      optimalDistance: result.distance,
      optimalPath: result.path,
    };
  }

  // Fallback: hardcoded
  return {
    startCode: "PRT",
    endCode: "POL",
    optimalDistance: 4,
    optimalPath: ["PRT", "ESP", "FRA", "DEU", "POL"],
  };
}
