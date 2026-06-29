// Daily Battle puzzle generator

import { COUNTRIES_WITH_POP, countriesWithMetric, metricValue, METRIC_DEFS, type Country } from "./db";
import { randomSeed, mulberry32, shuffle, pickOne } from "./daily";

export interface BattleConfig {
  key: string;
  label: string;
  question: string;
  unit: string;
  getValue: (c: Country) => number;
  format: (n: number) => string;
}

function buildBattleOptions(): BattleConfig[] {
  const options: BattleConfig[] = [];

  // Population (always)
  options.push({
    key: "population",
    label: "Population",
    question: "Which country has more people?",
    unit: "",
    getValue: (c) => c.population,
    format: (n) => {
      if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
      if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
      return n.toLocaleString();
    },
  });

  // Area
  options.push({
    key: "area",
    label: "Surface area",
    question: "Which country is larger?",
    unit: "km²",
    getValue: (c) => c.area,
    format: (n) => n.toLocaleString() + " km²",
  });

  // Dynamic metrics
  const configs: { key: string; question: string; formatFn?: (n: number) => string }[] = [
    { key: "life_exp", question: "Which country has higher life expectancy?", formatFn: (n) => n.toFixed(1) + " years" },
    { key: "height", question: "Which country has taller people (avg)?", formatFn: (n) => n.toFixed(1) + " cm" },
    { key: "coast", question: "Which country has a longer coastline?", formatFn: (n) => n.toLocaleString() + " km" },
    { key: "peak", question: "Which country has a higher peak?", formatFn: (n) => n.toLocaleString() + " m" },
    { key: "neighbors", question: "Which country has more neighbors?", formatFn: (n) => String(n) },
  ];

  for (const cfg of configs) {
    const def = METRIC_DEFS[cfg.key];
    if (!def) continue;
    const pool = countriesWithMetric(cfg.key);
    if (pool.length < 20) continue;

    options.push({
      key: cfg.key,
      label: def.label,
      question: cfg.question,
      unit: def.unit,
      getValue: (c) => metricValue(c, cfg.key),
      format: cfg.formatFn || ((n) => String(n)),
    });
  }

  return options;
}

export interface BattlePuzzle {
  chain: Country[];
  config: BattleConfig;
}

export function generateBattlePuzzle(seed?: number): BattlePuzzle {
  const rng = mulberry32(seed ?? randomSeed());
  const options = buildBattleOptions();
  const config = pickOne(options, rng);

  // Pick pool based on metric
  let pool: Country[];
  if (config.key === "population") {
    pool = COUNTRIES_WITH_POP.filter((c) => c.population > 500_000);
  } else if (config.key === "area") {
    pool = COUNTRIES_WITH_POP.filter((c) => c.area > 1000);
  } else {
    pool = countriesWithMetric(config.key).filter((c) => config.getValue(c) > 0);
  }

  // Pick 11 countries for 10 rounds with reasonable spread
  let picked: Country[] = [];
  let attempts = 0;

  while (attempts < 200) {
    attempts++;
    const candidates = shuffle(pool, rng).slice(0, 11);
    if (candidates.length < 11) break;
    const vals = candidates.map((c) => config.getValue(c)).sort((a, b) => a - b);
    let ok = true;
    for (let i = 0; i < vals.length - 1; i++) {
      // Reject identical values (ties) or values too close together
      if (vals[i] === vals[i + 1] || (vals[i] > 0 && vals[i + 1] / vals[i] < 1.05)) {
        ok = false;
        break;
      }
    }
    if (ok) {
      picked = candidates;
      break;
    }
  }

  // Fallback: still ensure no exact ties between adjacent countries in chain
  if (picked.length < 11) {
    const shuffled = shuffle(pool, rng);
    const seen = new Set<number>();
    picked = [];
    for (const c of shuffled) {
      const v = config.getValue(c);
      if (seen.has(v)) continue;
      seen.add(v);
      picked.push(c);
      if (picked.length === 11) break;
    }
  }

  return {
    chain: shuffle(picked, rng),
    config,
  };
}
