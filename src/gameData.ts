// Phase 1: Hardcoded 10-country set with population metric

export interface Country {
  code: string;
  name: string;
  flag: string;
  population: number;
}

// 10 countries with well-known, spread-out populations
// Source: REST Countries / World Bank, approx. 2024
export const COUNTRIES: Country[] = [
  { code: "CN", name: "China", flag: "🇨🇳", population: 1_425_000_000 },
  { code: "BR", name: "Brazil", flag: "🇧🇷", population: 216_000_000 },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", population: 224_000_000 },
  { code: "JP", name: "Japan", flag: "🇯🇵", population: 124_000_000 },
  { code: "DE", name: "Germany", flag: "🇩🇪", population: 84_000_000 },
  { code: "AU", name: "Australia", flag: "🇦🇺", population: 26_000_000 },
  { code: "EG", name: "Egypt", flag: "🇪🇬", population: 112_000_000 },
  { code: "CA", name: "Canada", flag: "🇨🇦", population: 40_000_000 },
  { code: "TH", name: "Thailand", flag: "🇹🇭", population: 72_000_000 },
  { code: "PT", name: "Portugal", flag: "🇵🇹", population: 10_000_000 },
];

// Correct order: sorted by population descending (rank 1 = most populated)
export const CORRECT_ORDER = [...COUNTRIES].sort(
  (a, b) => b.population - a.population
);

// Fixed presentation order for Phase 1 (shuffled, but deterministic)
export const PRESENTATION_ORDER = [
  COUNTRIES[4], // Germany
  COUNTRIES[7], // Canada
  COUNTRIES[0], // China
  COUNTRIES[9], // Portugal
  COUNTRIES[2], // Nigeria
  COUNTRIES[8], // Thailand
  COUNTRIES[5], // Australia
  COUNTRIES[6], // Egypt
  COUNTRIES[1], // Brazil
  COUNTRIES[3], // Japan
];

export const METRIC = {
  id: "population",
  label: "Einwohnerzahl",
  order: "desc" as const,
  direction: "höchste oben",
};
