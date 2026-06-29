#!/usr/bin/env node
// Build script: generates src/data/countries.json from REST Countries + CSV stats
// Usage: node scripts/build-data.mjs

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { join, basename } from "path";

const ROOT = new URL("..", import.meta.url).pathname;
const RAW_DIR = join(ROOT, "data-raw");
const OUT_FILE = join(ROOT, "src", "data", "countries.json");

// ── 1. Fetch REST Countries data from mledoze/countries on GitHub ──────────

const REST_URL =
  "https://raw.githubusercontent.com/mledoze/countries/master/countries.json";

async function fetchRestCountries() {
  console.log("Fetching REST Countries data…");
  const res = await fetch(REST_URL);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return await res.json();
}

function extractBase(raw) {
  // Filter to sovereign states with assigned cca3 codes
  // Exclude Antarctic territories, uninhabited islands etc.
  const EXCLUDE = new Set([
    "ATA", // Antarctica
    "BVT", // Bouvet Island
    "IOT", // British Indian Ocean Territory
    "CXR", // Christmas Island
    "CCK", // Cocos Islands
    "HMD", // Heard Island
    "ATF", // French Southern Territories
    "SGS", // South Georgia
    "UMI", // US Minor Outlying Islands
    "ALA", // Åland Islands
  ]);

  return raw
    .filter((c) => {
      if (!c.cca3 || EXCLUDE.has(c.cca3)) return false;
      // Must be independent or UN member, or a recognised territory with population
      if (c.independent || c.unMember) return true;
      // Include some notable non-UN territories
      const notable = new Set(["TWN", "PSE", "XKX", "HKG", "MAC"]);
      return notable.has(c.cca3);
    })
    .map((c) => {
      const currencies = c.currencies
        ? Object.values(c.currencies).map((cur) => cur.name)
        : [];
      const languages = c.languages ? Object.values(c.languages) : [];
      const tld = c.tld || [];
      const callingCode =
        c.idd && c.idd.root
          ? c.idd.root + (c.idd.suffixes?.[0] || "")
          : null;
      const carSide = c.car?.side || null;
      const flagImage = c.flags?.png || null;

      return {
        code: c.cca3,
        name: c.name?.common || "",
        flag: c.flag || "",
        flagImage,
        capital: c.capital?.[0] || null,
        region: c.region || "",
        subregion: c.subregion || "",
        population: c.population || 0,
        area: c.area || 0,
        borders: c.borders || [],
        currencies,
        languages,
        tld,
        callingCode,
        carSide,
        metrics: {
          neighbors: (c.borders || []).length,
        },
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

// ── 2. Auto-fetch supplementary data (samayo/country-json) ─────────────────

const SAMAYO_BASE =
  "https://raw.githubusercontent.com/samayo/country-json/master/src/";

const SAMAYO_DATASETS = [
  { file: "country-by-population.json", field: "population", metricKey: null, valueField: "population" },
  { file: "country-by-life-expectancy.json", field: null, metricKey: "life_exp", valueField: "expectancy" },
  { file: "country-by-avg-male-height.json", field: null, metricKey: "height", valueField: "height" },
  // coastline + elevation: using data-raw CSVs instead (samayo data has formatting issues)
  { file: "country-by-surface-area.json", field: null, metricKey: "area_metric", valueField: "area" },
  { file: "country-by-driving-side.json", field: "carSide", metricKey: null, valueField: "side" },
];

async function fetchSamayo(countries, codesByName) {
  const byCode = {};
  for (const c of countries) byCode[c.code] = c;

  for (const ds of SAMAYO_DATASETS) {
    try {
      const res = await fetch(SAMAYO_BASE + ds.file);
      if (!res.ok) { console.log(`  ⚠ ${ds.file}: ${res.status}`); continue; }
      const data = await res.json();

      let matched = 0;
      for (const row of data) {
        const name = (row.country || "").trim().toLowerCase();
        const code = codesByName[name];
        if (!code || !byCode[code]) continue;

        const val = row[ds.valueField];
        if (val == null || val === "") continue;

        if (ds.field) {
          // Set a top-level field (population, carSide)
          if (ds.field === "carSide") {
            byCode[code].carSide = String(val).toLowerCase();
            matched++;
          } else {
            const numVal = typeof val === "number" ? val : parseFloat(String(val).replace(/,/g, ""));
            if (!isNaN(numVal)) {
              byCode[code][ds.field] = numVal;
              matched++;
            }
          }
        } else if (ds.metricKey) {
          // Set a metric
          const numVal = typeof val === "number" ? val : parseFloat(String(val).replace(/,/g, ""));
          if (!isNaN(numVal)) {
            byCode[code].metrics[ds.metricKey] = numVal;
            matched++;
          }
        }
      }
      console.log(`  ${ds.file}: ${matched} matched`);
    } catch (e) {
      console.log(`  ⚠ ${ds.file}: ${e.message}`);
    }
  }
}

// ── 3. CSV merge ───────────────────────────────────────────────────────────

// CSV metric config: filename → metric key + column mapping
const CSV_CONFIGS = {
  "life_exp.csv": {
    key: "life_exp",
    codeCol: null, // auto-detect
    valueCol: null, // auto-detect (last numeric column or specified)
  },
  "fertility.csv": { key: "fertility" },
  "forest.csv": { key: "forest" },
  "mother_age.csv": { key: "mother_age" },
  "beer.csv": { key: "beer" },
  "coffee.csv": { key: "coffee" },
  "height.csv": { key: "height" },
  "passport.csv": { key: "passport" },
  "nobel.csv": { key: "nobel" },
  "peak.csv": { key: "peak" },
  "timezones.csv": { key: "timezones" },
  "coast.csv": { key: "coast" },
  "airports.csv": { key: "airports" },
  "temp.csv": { key: "temp" },
};

// Common country name → cca3 aliases for CSV sources that use names instead of codes
const NAME_ALIASES = {
  "united states of america": "USA",
  "united states": "USA",
  usa: "USA",
  "united kingdom": "GBR",
  uk: "GBR",
  "great britain": "GBR",
  russia: "RUS",
  "russian federation": "RUS",
  "south korea": "KOR",
  "korea, republic of": "KOR",
  "republic of korea": "KOR",
  "korea, rep.": "KOR",
  "north korea": "PRK",
  "korea, dem. people's rep.": "PRK",
  "korea, democratic people's republic of": "PRK",
  iran: "IRN",
  "iran, islamic rep.": "IRN",
  "iran, islamic republic of": "IRN",
  "iran (islamic republic of)": "IRN",
  syria: "SYR",
  "syrian arab republic": "SYR",
  venezuela: "VEN",
  "venezuela, rb": "VEN",
  "venezuela (bolivarian republic of)": "VEN",
  bolivia: "BOL",
  "bolivia, plurinational state of": "BOL",
  "bolivia (plurinational state of)": "BOL",
  tanzania: "TZA",
  "tanzania, united republic of": "TZA",
  "united republic of tanzania": "TZA",
  vietnam: "VNM",
  "viet nam": "VNM",
  laos: "LAO",
  "lao pdr": "LAO",
  "lao people's democratic republic": "LAO",
  myanmar: "MMR",
  "myanmar (burma)": "MMR",
  "cote d'ivoire": "CIV",
  "ivory coast": "CIV",
  "côte d'ivoire": "CIV",
  congo: "COG",
  "congo, rep.": "COG",
  "republic of the congo": "COG",
  "congo, democratic republic of the": "COD",
  "congo, dem. rep.": "COD",
  "dr congo": "COD",
  "democratic republic of the congo": "COD",
  "democratic republic of congo": "COD",
  czechia: "CZE",
  "czech republic": "CZE",
  "türkiye": "TUR",
  turkey: "TUR",
  "cabo verde": "CPV",
  "cape verde": "CPV",
  eswatini: "SWZ",
  swaziland: "SWZ",
  "timor-leste": "TLS",
  "east timor": "TLS",
  "micronesia (federated states of)": "FSM",
  "micronesia, fed. sts.": "FSM",
  micronesia: "FSM",
  palestine: "PSE",
  "state of palestine": "PSE",
  "west bank and gaza": "PSE",
  taiwan: "TWN",
  "taiwan, china": "TWN",
  "chinese taipei": "TWN",
  "hong kong": "HKG",
  "hong kong sar, china": "HKG",
  "china, hong kong sar": "HKG",
  "macao": "MAC",
  "macau": "MAC",
  "macao sar, china": "MAC",
  "china, macao sar": "MAC",
  kosovo: "XKX",
  "north macedonia": "MKD",
  macedonia: "MKD",
  "republic of north macedonia": "MKD",
  "the former yugoslav republic of macedonia": "MKD",
  "macedonia, fyrom": "MKD",
  "brunei darussalam": "BRN",
  brunei: "BRN",
  "moldova, republic of": "MDA",
  "republic of moldova": "MDA",
  moldova: "MDA",
  "egypt, arab rep.": "EGY",
  egypt: "EGY",
  "yemen, rep.": "YEM",
  "gambia, the": "GMB",
  gambia: "GMB",
  "the gambia": "GMB",
  "bahamas, the": "BHS",
  bahamas: "BHS",
  "the bahamas": "BHS",
  "kyrgyz republic": "KGZ",
  kyrgyzstan: "KGZ",
  "slovak republic": "SVK",
  slovakia: "SVK",
  "st. kitts and nevis": "KNA",
  "saint kitts and nevis": "KNA",
  "st. lucia": "LCA",
  "saint lucia": "LCA",
  "st. vincent and the grenadines": "VCT",
  "saint vincent and the grenadines": "VCT",
  "são tomé and príncipe": "STP",
  "sao tome and principe": "STP",
  "trinidad & tobago": "TTO",
  "trinidad and tobago": "TTO",
  "antigua & barbuda": "ATG",
  "antigua and barbuda": "ATG",
  "bosnia & herzegovina": "BIH",
  "bosnia and herzegovina": "BIH",
  "south sudan": "SSD",
  "papua new guinea": "PNG",
  "new zealand": "NZL",
  "saudi arabia": "SAU",
  "sri lanka": "LKA",
  "burkina faso": "BFA",
  "central african republic": "CAF",
  "dominican republic": "DOM",
  "el salvador": "SLV",
  "equatorial guinea": "GNQ",
  "guinea-bissau": "GNB",
  "marshall islands": "MHL",
  "sierra leone": "SLE",
  "solomon islands": "SLB",
  "costa rica": "CRI",
  "united arab emirates": "ARE",
  "south africa": "ZAF",
};

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  // Handle quoted fields
  function splitRow(line) {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  const headers = splitRow(lines[0]).map((h) => h.replace(/^\uFEFF/, ""));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = splitRow(lines[i]);
    if (vals.length < 2) continue;
    const obj = {};
    headers.forEach((h, j) => {
      obj[h] = vals[j] || "";
    });
    rows.push(obj);
  }
  return rows;
}

function detectCodeColumn(headers) {
  // Look for ISO code columns
  const codePatterns = [
    /^code$/i,
    /^iso.*code/i,
    /^cca3$/i,
    /^iso3$/i,
    /^country.?code/i,
    /^alpha.?3/i,
  ];
  for (const p of codePatterns) {
    const match = headers.find((h) => p.test(h));
    if (match) return match;
  }
  return null;
}

function detectNameColumn(headers) {
  const namePatterns = [
    /^country$/i,
    /^name$/i,
    /^country.?name/i,
    /^entity$/i,
    /^nation$/i,
  ];
  for (const p of namePatterns) {
    const match = headers.find((h) => p.test(h));
    if (match) return match;
  }
  return headers[0]; // fallback to first column
}

function detectValueColumn(headers) {
  // Skip code/name columns, pick the last remaining one (often the value)
  const skip = new Set();
  for (const h of headers) {
    if (
      /code|country|name|entity|iso|year|date/i.test(h) &&
      !/per|rate|index|value|score/i.test(h)
    ) {
      skip.add(h);
    }
  }
  const candidates = headers.filter((h) => !skip.has(h));
  return candidates[candidates.length - 1] || headers[headers.length - 1];
}

function resolveCode(row, codeCol, nameCol, codesByName) {
  // Try code column first
  if (codeCol && row[codeCol]) {
    const code = row[codeCol].trim().toUpperCase();
    if (code.length === 3) return code;
  }
  // Fall back to name matching
  if (nameCol && row[nameCol]) {
    const name = row[nameCol].trim().toLowerCase();
    if (NAME_ALIASES[name]) return NAME_ALIASES[name];
    if (codesByName[name]) return codesByName[name];
    // Partial match
    for (const [key, code] of Object.entries(codesByName)) {
      if (key.startsWith(name) || name.startsWith(key)) return code;
    }
  }
  return null;
}

function mergeCSVs(countries) {
  const codesByName = {};
  for (const c of countries) {
    codesByName[c.name.toLowerCase()] = c.code;
  }
  // Also add aliases
  for (const [alias, code] of Object.entries(NAME_ALIASES)) {
    codesByName[alias] = code;
  }

  const byCode = {};
  for (const c of countries) {
    byCode[c.code] = c;
  }

  const gaps = {}; // metric → [country codes with null]
  const unmatched = {}; // metric → [unmatched names]
  let csvCount = 0;

  if (!existsSync(RAW_DIR)) return { gaps, unmatched };

  const files = readdirSync(RAW_DIR).filter((f) => f.endsWith(".csv"));

  for (const file of files) {
    const config = CSV_CONFIGS[file];
    if (!config) {
      console.log(`  ⚠ Skipping unknown CSV: ${file}`);
      continue;
    }

    csvCount++;
    const metricKey = config.key;
    console.log(`  Merging ${file} → metrics.${metricKey}`);

    const text = readFileSync(join(RAW_DIR, file), "utf-8");
    const rows = parseCSV(text);
    if (rows.length === 0) {
      console.log(`    ⚠ Empty CSV, skipping`);
      continue;
    }

    const headers = Object.keys(rows[0]);
    const codeCol = detectCodeColumn(headers);
    const nameCol = detectNameColumn(headers);
    const valueCol = detectValueColumn(headers);

    console.log(
      `    Columns: code=${codeCol || "none"}, name=${nameCol}, value=${valueCol}`
    );

    let matched = 0;
    const unmatchedNames = [];

    // For sources with multiple rows per country (time series), take latest
    const latestByCode = {};

    for (const row of rows) {
      const code = resolveCode(row, codeCol, nameCol, codesByName);
      if (!code || !byCode[code]) {
        const name = row[nameCol] || row[headers[0]] || "?";
        if (
          !unmatchedNames.includes(name) &&
          name !== "?" &&
          name.length > 0
        ) {
          unmatchedNames.push(name);
        }
        continue;
      }

      const rawVal = row[valueCol];
      if (!rawVal || rawVal === "" || rawVal === "..") continue;

      const numVal = parseFloat(rawVal.replace(/,/g, ""));
      if (isNaN(numVal)) continue;

      // Check if this row has a year column for time-series data
      const yearCol = headers.find((h) => /^year$/i.test(h));
      const year = yearCol ? parseInt(row[yearCol]) : 0;

      if (
        !latestByCode[code] ||
        year > (latestByCode[code].year || 0)
      ) {
        latestByCode[code] = { value: numVal, year };
      }
    }

    for (const [code, data] of Object.entries(latestByCode)) {
      byCode[code].metrics[metricKey] = data.value;
      matched++;
    }

    // Mark gaps
    const countriesWithNull = countries
      .filter((c) => c.metrics[metricKey] == null)
      .map((c) => c.code);

    if (countriesWithNull.length > 0) {
      gaps[metricKey] = countriesWithNull;
    }
    if (unmatchedNames.length > 0) {
      unmatched[metricKey] = unmatchedNames;
    }

    console.log(
      `    ✓ ${matched} countries matched, ${unmatchedNames.length} unmatched`
    );
  }

  if (csvCount === 0) {
    console.log("  No CSVs found in data-raw/");
  }

  return { gaps, unmatched };
}

// ── 4. Metric metadata ────────────────────────────────────────────────────

const METRIC_META = {
  neighbors: {
    label: "Number of neighbors",
    unit: "",
    order: "desc",
    question: "more neighboring countries",
    source: "REST Countries (borders)",
    year: 2024,
  },
  life_exp: {
    label: "Life expectancy",
    unit: "years",
    order: "desc",
    question: "higher life expectancy",
    source: "World Bank SP.DYN.LE00.IN",
    year: null,
  },
  fertility: {
    label: "Fertility rate",
    unit: "births per woman",
    order: "desc",
    question: "higher fertility rate",
    source: "World Bank SP.DYN.TFRT.IN",
    year: null,
  },
  forest: {
    label: "Forest cover",
    unit: "% of land",
    order: "desc",
    question: "more forest cover",
    source: "World Bank AG.LND.FRST.ZS",
    year: null,
  },
  mother_age: {
    label: "Mean age at first birth",
    unit: "years",
    order: "desc",
    question: "higher mean age at first birth",
    source: "Our World in Data",
    year: null,
  },
  beer: {
    label: "Beer consumption per capita",
    unit: "l/year",
    order: "desc",
    question: "more beer consumption per capita",
    source: "OWID / Kirin",
    year: null,
  },
  coffee: {
    label: "Coffee consumption per capita",
    unit: "kg/year",
    order: "desc",
    question: "more coffee consumption per capita",
    source: "ICO / OWID",
    year: null,
  },
  height: {
    label: "Average male height",
    unit: "cm",
    order: "desc",
    question: "taller average height",
    source: "samayo/country-json",
    year: null,
  },
  area_metric: {
    label: "Surface area",
    unit: "km²",
    order: "desc",
    question: "larger surface area",
    source: "samayo/country-json",
    year: null,
  },
  passport: {
    label: "Passport strength",
    unit: "visa-free destinations",
    order: "desc",
    question: "more visa-free destinations",
    source: "Henley Passport Index",
    year: null,
  },
  nobel: {
    label: "Nobel laureates",
    unit: "",
    order: "desc",
    question: "more Nobel laureates",
    source: "Nobel Foundation",
    year: null,
  },
  peak: {
    label: "Highest point",
    unit: "m",
    order: "desc",
    question: "higher highest point",
    source: "Wikipedia",
    year: null,
  },
  timezones: {
    label: "Number of time zones",
    unit: "",
    order: "desc",
    question: "more time zones",
    source: "Wikipedia",
    year: null,
  },
  coast: {
    label: "Coastline length",
    unit: "km",
    order: "desc",
    question: "longer coastline",
    source: "CIA World Factbook",
    year: null,
  },
  airports: {
    label: "Number of airports",
    unit: "",
    order: "desc",
    question: "more airports",
    source: "CIA World Factbook",
    year: null,
  },
  temp: {
    label: "Capital temperature",
    unit: "°C",
    order: "desc",
    question: "warmer capital",
    source: "Climate data",
    year: null,
  },
};

// ── 5. Main ────────────────────────────────────────────────────────────────

async function main() {
  const raw = await fetchRestCountries();
  console.log(`Fetched ${raw.length} entries from REST Countries`);

  const countries = extractBase(raw);
  console.log(`Extracted ${countries.length} countries`);

  // Build name→code lookup for samayo matching
  const codesByName = {};
  for (const c of countries) codesByName[c.name.toLowerCase()] = c.code;
  for (const [alias, code] of Object.entries(NAME_ALIASES)) codesByName[alias] = code;

  console.log("\nFetching supplementary data (samayo)…");
  await fetchSamayo(countries, codesByName);

  console.log("\nMerging CSVs from data-raw/…");
  const { gaps, unmatched } = mergeCSVs(countries);

  // Build output
  const output = {
    meta: {
      generated: new Date().toISOString().slice(0, 10),
      metrics: {},
    },
    countries,
  };

  // Only include metrics that have at least one non-null value
  for (const [key, meta] of Object.entries(METRIC_META)) {
    const hasData = countries.some((c) => c.metrics[key] != null);
    if (hasData || key === "neighbors") {
      output.meta.metrics[key] = meta;
    }
  }

  writeFileSync(OUT_FILE, JSON.stringify(output, null, 2) + "\n");
  console.log(`\n✓ Written ${OUT_FILE}`);
  console.log(`  ${countries.length} countries, ${Object.keys(output.meta.metrics).length} metrics`);

  // Gap report
  if (Object.keys(gaps).length > 0) {
    console.log("\n── Gap report ──");
    for (const [metric, codes] of Object.entries(gaps)) {
      console.log(`  ${metric}: ${codes.length} countries missing`);
      if (codes.length <= 20) {
        console.log(`    ${codes.join(", ")}`);
      }
    }
  }

  if (Object.keys(unmatched).length > 0) {
    console.log("\n── Unmatched names ──");
    for (const [metric, names] of Object.entries(unmatched)) {
      console.log(`  ${metric}: ${names.slice(0, 15).join(", ")}${names.length > 15 ? ` …(+${names.length - 15})` : ""}`);
    }
  }
}

main().catch((err) => {
  console.error("Build failed:", err);
  process.exit(1);
});
