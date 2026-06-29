// Phase 1: Chain-based battles — winner stays, challenger arrives

export interface BattleCountry {
  code: string;
  name: string;
  flag: string;
  value: number;
}

export const METRIC = {
  id: "population",
  label: "Einwohnerzahl",
  question: "mehr Einwohner",
};

export function formatValue(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + " Mrd.";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " Mio.";
  return n.toLocaleString("de-DE");
}

// Shuffled chain — no size-order, mixed difficulty
// Source: approx. 2024 population figures
export const CHAIN: BattleCountry[] = [
  { code: "DEU", name: "Deutschland", flag: "🇩🇪", value: 84_000_000 },
  { code: "AUS", name: "Australien", flag: "🇦🇺", value: 26_000_000 },
  { code: "NGA", name: "Nigeria", flag: "🇳🇬", value: 224_000_000 },
  { code: "PRT", name: "Portugal", flag: "🇵🇹", value: 10_000_000 },
  { code: "USA", name: "USA", flag: "🇺🇸", value: 335_000_000 },
  { code: "THA", name: "Thailand", flag: "🇹🇭", value: 72_000_000 },
  { code: "CHN", name: "China", flag: "🇨🇳", value: 1_425_000_000 },
  { code: "MEX", name: "Mexiko", flag: "🇲🇽", value: 129_000_000 },
  { code: "KOR", name: "Südkorea", flag: "🇰🇷", value: 52_000_000 },
  { code: "EGY", name: "Ägypten", flag: "🇪🇬", value: 112_000_000 },
  { code: "CAN", name: "Kanada", flag: "🇨🇦", value: 40_000_000 },
];
