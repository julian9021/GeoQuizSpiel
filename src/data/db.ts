// Shared country database — used by all games

import countriesJson from "./countries.json";

export interface Country {
  code: string;
  name: string;
  flag: string;
  capital: string | null;
  region: string;
  subregion: string;
  population: number;
  area: number;
  borders: string[];
  currencies: string[];
  languages: string[];
}

export const ALL_COUNTRIES: Country[] = countriesJson as Country[];

// Lookup maps
export const BY_CODE: Record<string, Country> = {};
for (const c of ALL_COUNTRIES) {
  BY_CODE[c.code] = c;
}

// Adjacency graph (symmetric)
export const BORDER_GRAPH: Record<string, string[]> = {};
for (const c of ALL_COUNTRIES) {
  if (!BORDER_GRAPH[c.code]) BORDER_GRAPH[c.code] = [];
  for (const b of c.borders) {
    if (!BORDER_GRAPH[c.code].includes(b)) BORDER_GRAPH[c.code].push(b);
    if (!BORDER_GRAPH[b]) BORDER_GRAPH[b] = [];
    if (!BORDER_GRAPH[b].includes(c.code)) BORDER_GRAPH[b].push(c.code);
  }
}

// Countries with borders (for Grenzhopping)
export const COUNTRIES_WITH_BORDERS = ALL_COUNTRIES.filter(
  (c) => c.borders.length > 0
);

// Countries with population data (for Ranking / Battle)
export const COUNTRIES_WITH_POP = ALL_COUNTRIES.filter(
  (c) => c.population > 0
);

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
    for (const neighbor of BORDER_GRAPH[current] ?? []) {
      if (visited.has(neighbor)) continue;
      const newPath = [...path, neighbor];
      if (neighbor === end)
        return { distance: newPath.length - 1, path: newPath };
      visited.add(neighbor);
      queue.push([neighbor, newPath]);
    }
  }
  return null;
}

export function formatPopulation(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  return n.toLocaleString();
}

export function formatArea(n: number): string {
  return n.toLocaleString() + " km²";
}
