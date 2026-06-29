// Phase 1: Hardcoded mini-graph of ~30 European/nearby countries with borders
// Source: REST Countries borders field (cca3 codes)

export interface GHCountry {
  code: string;
  name: string;
  flag: string;
  aliases: string[]; // alternative names for autocomplete
  borders: string[]; // codes of neighboring countries
}

export const COUNTRIES: GHCountry[] = [
  { code: "PRT", name: "Portugal", flag: "🇵🇹", aliases: ["pt"], borders: ["ESP"] },
  { code: "ESP", name: "Spain", flag: "🇪🇸", aliases: ["es", "espana", "españa"], borders: ["PRT", "FRA", "AND"] },
  { code: "AND", name: "Andorra", flag: "🇦🇩", aliases: ["ad"], borders: ["ESP", "FRA"] },
  { code: "FRA", name: "France", flag: "🇫🇷", aliases: ["fr", "frankreich"], borders: ["ESP", "AND", "BEL", "LUX", "DEU", "CHE", "ITA", "MCO"] },
  { code: "MCO", name: "Monaco", flag: "🇲🇨", aliases: ["mc"], borders: ["FRA"] },
  { code: "BEL", name: "Belgium", flag: "🇧🇪", aliases: ["be", "belgien"], borders: ["FRA", "LUX", "DEU", "NLD"] },
  { code: "NLD", name: "Netherlands", flag: "🇳🇱", aliases: ["nl", "holland", "niederlande"], borders: ["BEL", "DEU"] },
  { code: "LUX", name: "Luxembourg", flag: "🇱🇺", aliases: ["lu", "luxemburg"], borders: ["FRA", "BEL", "DEU"] },
  { code: "DEU", name: "Germany", flag: "🇩🇪", aliases: ["de", "deutschland"], borders: ["FRA", "BEL", "NLD", "LUX", "CHE", "AUT", "CZE", "POL", "DNK"] },
  { code: "CHE", name: "Switzerland", flag: "🇨🇭", aliases: ["ch", "schweiz", "suisse"], borders: ["FRA", "DEU", "AUT", "ITA", "LIE"] },
  { code: "LIE", name: "Liechtenstein", flag: "🇱🇮", aliases: ["li"], borders: ["CHE", "AUT"] },
  { code: "AUT", name: "Austria", flag: "🇦🇹", aliases: ["at", "oesterreich", "österreich"], borders: ["DEU", "CHE", "LIE", "ITA", "SVN", "HUN", "SVK", "CZE"] },
  { code: "ITA", name: "Italy", flag: "🇮🇹", aliases: ["it", "italien"], borders: ["FRA", "CHE", "AUT", "SVN", "SMR", "VAT"] },
  { code: "SMR", name: "San Marino", flag: "🇸🇲", aliases: ["sm"], borders: ["ITA"] },
  { code: "VAT", name: "Vatican City", flag: "🇻🇦", aliases: ["va", "vatikan", "vatican"], borders: ["ITA"] },
  { code: "SVN", name: "Slovenia", flag: "🇸🇮", aliases: ["si", "slowenien"], borders: ["ITA", "AUT", "HUN", "HRV"] },
  { code: "HRV", name: "Croatia", flag: "🇭🇷", aliases: ["hr", "kroatien"], borders: ["SVN", "HUN", "SRB", "BIH", "MNE"] },
  { code: "BIH", name: "Bosnia and Herzegovina", flag: "🇧🇦", aliases: ["ba", "bosnia", "bosnien"], borders: ["HRV", "SRB", "MNE"] },
  { code: "MNE", name: "Montenegro", flag: "🇲🇪", aliases: ["me"], borders: ["HRV", "BIH", "SRB", "ALB", "XKX"] },
  { code: "SRB", name: "Serbia", flag: "🇷🇸", aliases: ["rs", "serbien"], borders: ["HUN", "HRV", "BIH", "MNE", "ALB", "XKX", "MKD", "BGR", "ROU"] },
  { code: "ALB", name: "Albania", flag: "🇦🇱", aliases: ["al", "albanien"], borders: ["MNE", "XKX", "MKD", "GRC"] },
  { code: "XKX", name: "Kosovo", flag: "🇽🇰", aliases: ["xk"], borders: ["SRB", "MNE", "ALB", "MKD"] },
  { code: "MKD", name: "North Macedonia", flag: "🇲🇰", aliases: ["mk", "macedonia", "mazedonien", "nordmazedonien"], borders: ["SRB", "XKX", "ALB", "GRC", "BGR"] },
  { code: "GRC", name: "Greece", flag: "🇬🇷", aliases: ["gr", "griechenland"], borders: ["ALB", "MKD", "BGR", "TUR"] },
  { code: "BGR", name: "Bulgaria", flag: "🇧🇬", aliases: ["bg", "bulgarien"], borders: ["SRB", "MKD", "GRC", "TUR", "ROU"] },
  { code: "ROU", name: "Romania", flag: "🇷🇴", aliases: ["ro", "rumaenien", "rumänien"], borders: ["HUN", "SRB", "BGR", "MDA", "UKR"] },
  { code: "MDA", name: "Moldova", flag: "🇲🇩", aliases: ["md", "moldau", "moldawien"], borders: ["ROU", "UKR"] },
  { code: "HUN", name: "Hungary", flag: "🇭🇺", aliases: ["hu", "ungarn"], borders: ["AUT", "SVK", "UKR", "ROU", "SRB", "HRV", "SVN"] },
  { code: "SVK", name: "Slovakia", flag: "🇸🇰", aliases: ["sk", "slowakei"], borders: ["CZE", "AUT", "HUN", "UKR", "POL"] },
  { code: "CZE", name: "Czech Republic", flag: "🇨🇿", aliases: ["cz", "czechia", "tschechien"], borders: ["DEU", "AUT", "SVK", "POL"] },
  { code: "POL", name: "Poland", flag: "🇵🇱", aliases: ["pl", "polen"], borders: ["DEU", "CZE", "SVK", "UKR", "BLR", "LTU", "RUS"] },
  { code: "DNK", name: "Denmark", flag: "🇩🇰", aliases: ["dk", "daenemark", "dänemark"], borders: ["DEU"] },
  { code: "TUR", name: "Turkey", flag: "🇹🇷", aliases: ["tr", "tuerkei", "türkei"], borders: ["GRC", "BGR"] },
  { code: "UKR", name: "Ukraine", flag: "🇺🇦", aliases: ["ua"], borders: ["POL", "SVK", "HUN", "ROU", "MDA", "BLR", "RUS"] },
  { code: "BLR", name: "Belarus", flag: "🇧🇾", aliases: ["by", "weissrussland"], borders: ["POL", "LTU", "LVA", "RUS", "UKR"] },
  { code: "LTU", name: "Lithuania", flag: "🇱🇹", aliases: ["lt", "litauen"], borders: ["POL", "BLR", "LVA", "RUS"] },
  { code: "LVA", name: "Latvia", flag: "🇱🇻", aliases: ["lv", "lettland"], borders: ["LTU", "BLR", "EST", "RUS"] },
  { code: "EST", name: "Estonia", flag: "🇪🇪", aliases: ["ee", "estland"], borders: ["LVA", "RUS"] },
  { code: "RUS", name: "Russia", flag: "🇷🇺", aliases: ["ru", "russland"], borders: ["POL", "LTU", "LVA", "EST", "BLR", "UKR", "FIN", "NOR"] },
  { code: "FIN", name: "Finland", flag: "🇫🇮", aliases: ["fi", "finnland"], borders: ["RUS", "NOR", "SWE"] },
  { code: "NOR", name: "Norway", flag: "🇳🇴", aliases: ["no", "norwegen"], borders: ["SWE", "FIN", "RUS"] },
  { code: "SWE", name: "Sweden", flag: "🇸🇪", aliases: ["se", "schweden"], borders: ["NOR", "FIN"] },
];

// Build adjacency map
export const GRAPH: Record<string, string[]> = {};
for (const c of COUNTRIES) {
  if (!GRAPH[c.code]) GRAPH[c.code] = [];
  for (const b of c.borders) {
    if (!GRAPH[c.code].includes(b)) GRAPH[c.code].push(b);
    if (!GRAPH[b]) GRAPH[b] = [];
    if (!GRAPH[b].includes(c.code)) GRAPH[b].push(c.code);
  }
}

// Lookup helpers
export const COUNTRY_MAP: Record<string, GHCountry> = {};
for (const c of COUNTRIES) {
  COUNTRY_MAP[c.code] = c;
}

export function findCountry(input: string): GHCountry | null {
  const q = input.trim().toLowerCase();
  if (!q) return null;
  // Exact code match
  for (const c of COUNTRIES) {
    if (c.code.toLowerCase() === q) return c;
  }
  // Exact name match
  for (const c of COUNTRIES) {
    if (c.name.toLowerCase() === q) return c;
  }
  // Alias match
  for (const c of COUNTRIES) {
    if (c.aliases.some((a) => a === q)) return c;
  }
  // Prefix match on name
  for (const c of COUNTRIES) {
    if (c.name.toLowerCase().startsWith(q)) return c;
  }
  return null;
}

export function getAutocompleteSuggestions(
  input: string,
  exclude: Set<string>
): GHCountry[] {
  const q = input.trim().toLowerCase();
  if (!q) return [];
  return COUNTRIES.filter(
    (c) =>
      !exclude.has(c.code) &&
      (c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.aliases.some((a) => a.includes(q)))
  ).slice(0, 6);
}

// BFS shortest path
export function bfs(
  start: string,
  end: string
): { distance: number; path: string[] } | null {
  if (start === end) return { distance: 0, path: [start] };
  const queue: [string, string[]][] = [[start, [start]]];
  const visited = new Set([start]);
  while (queue.length) {
    const [current, path] = queue.shift()!;
    for (const neighbor of GRAPH[current] ?? []) {
      if (visited.has(neighbor)) continue;
      const newPath = [...path, neighbor];
      if (neighbor === end) return { distance: newPath.length - 1, path: newPath };
      visited.add(neighbor);
      queue.push([neighbor, newPath]);
    }
  }
  return null;
}

// Phase 1: hardcoded puzzle — Portugal → Poland (BFS optimal = 4: PRT→ESP→FRA→DEU→POL)
export const PUZZLE = {
  start: "PRT",
  end: "POL",
};
