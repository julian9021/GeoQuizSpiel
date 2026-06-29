// Daily Ranking puzzle generator

import { COUNTRIES_WITH_POP, countriesWithMetric, metricValue, METRIC_DEFS, type Country } from "./db";
import { randomSeed, mulberry32, shuffle, pickN, pickOne } from "./daily";

export interface RankingPuzzle {
  metric: { key: string; label: string; direction: string; unit: string };
  countries: Country[];       // presentation order (shuffled)
  correctOrder: Country[];    // sorted by metric desc
}

interface MetricOption {
  key: string;
  label: string;
  unit: string;
  direction: string;
  pool: Country[];
  getValue: (c: Country) => number;
  minSpreadRatio: number;
}

function buildMetricOptions(): MetricOption[] {
  const options: MetricOption[] = [];

  // Population (always available)
  const popPool = COUNTRIES_WITH_POP.filter((c) => c.population > 500_000);
  if (popPool.length >= 10) {
    options.push({
      key: "population",
      label: "Population",
      unit: "",
      direction: "highest on top",
      pool: popPool,
      getValue: (c) => c.population,
      minSpreadRatio: 0.92,
    });
  }

  // Area
  const areaPool = COUNTRIES_WITH_POP.filter((c) => c.area > 1000);
  if (areaPool.length >= 10) {
    options.push({
      key: "area",
      label: "Surface area",
      unit: "km²",
      direction: "largest on top",
      pool: areaPool,
      getValue: (c) => c.area,
      minSpreadRatio: 0.90,
    });
  }

  // Dynamic metrics from the database
  const metricConfigs: { key: string; minPool: number; minSpread: number; minValue?: number }[] = [
    { key: "life_exp", minPool: 10, minSpread: 0.97 },
    { key: "height", minPool: 10, minSpread: 0.98 },
    { key: "coast", minPool: 10, minSpread: 0.85, minValue: 10 },
    { key: "peak", minPool: 10, minSpread: 0.90, minValue: 100 },
    { key: "neighbors", minPool: 10, minSpread: 0.80 },
    { key: "area_metric", minPool: 10, minSpread: 0.90, minValue: 1000 },
  ];

  for (const cfg of metricConfigs) {
    const def = METRIC_DEFS[cfg.key];
    if (!def) continue;

    let pool = countriesWithMetric(cfg.key);
    if (cfg.minValue) {
      pool = pool.filter((c) => metricValue(c, cfg.key) >= cfg.minValue!);
    }
    if (pool.length < cfg.minPool) continue;

    options.push({
      key: cfg.key,
      label: def.label,
      unit: def.unit,
      direction: "highest on top",
      pool,
      getValue: (c) => metricValue(c, cfg.key),
      minSpreadRatio: cfg.minSpread,
    });
  }

  return options;
}

export function generateRankingPuzzle(seed?: number): RankingPuzzle {
  const rng = mulberry32(seed ?? randomSeed());
  const options = buildMetricOptions();

  // Pick a random metric
  const option = pickOne(options, rng);

  // Pick 10 countries with good spread
  let picked: Country[] = [];
  let attempts = 0;

  while (picked.length < 10 && attempts < 200) {
    attempts++;
    const candidates = pickN(option.pool, 10, rng);
    const sorted = [...candidates].sort((a, b) => option.getValue(b) - option.getValue(a));
    let ok = true;
    for (let i = 0; i < sorted.length - 1; i++) {
      const high = option.getValue(sorted[i]);
      const low = option.getValue(sorted[i + 1]);
      // Reject if values are identical (tie) or too close
      if (high === low || (high > 0 && low / high > option.minSpreadRatio)) {
        ok = false;
        break;
      }
    }
    if (ok) {
      picked = candidates;
      break;
    }
  }

  // Fallback: still ensure no exact ties
  if (picked.length < 10) {
    const shuffled = shuffle(option.pool, rng);
    const seen = new Set<number>();
    picked = [];
    for (const c of shuffled) {
      const v = option.getValue(c);
      if (seen.has(v)) continue;
      seen.add(v);
      picked.push(c);
      if (picked.length === 10) break;
    }
  }

  const correctOrder = [...picked].sort((a, b) => option.getValue(b) - option.getValue(a));
  const presentation = shuffle(picked, rng);

  return {
    metric: { key: option.key, label: option.label, direction: option.direction, unit: option.unit },
    countries: presentation,
    correctOrder,
  };
}
