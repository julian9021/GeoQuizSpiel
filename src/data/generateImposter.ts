// Daily Imposter puzzle generator

import { ALL_COUNTRIES, BY_CODE, type Country } from "./db";
import { randomSeed, mulberry32, pickN, pickOne } from "./daily";

export interface ImposterCard {
  code: string;
  name: string;
  flag: string;
  label: string;
  value: string;
  isLiar: boolean;
  correctValue?: string;
}

export interface ImposterRound {
  category: string;
  cards: ImposterCard[];
}

interface CategoryDef {
  id: string;
  question: string;
  label: string;
  getValue: (c: Country) => string | null;
  /** Check if a fake value is actually true for this country */
  isTrueFor: (c: Country, fakeValue: string) => boolean;
  pool: Country[];
}

function buildCategories(): CategoryDef[] {
  const withCapital = ALL_COUNTRIES.filter((c) => c.capital);
  const withCurrency = ALL_COUNTRIES.filter((c) => c.currencies.length > 0);
  const withLanguage = ALL_COUNTRIES.filter((c) => c.languages.length > 0);
  const withBorders = ALL_COUNTRIES.filter((c) => c.borders.length > 0);

  return [
    {
      id: "capital",
      question: "Which capital is wrong?",
      label: "Capital",
      getValue: (c) => c.capital,
      isTrueFor: (c, v) => c.capital === v,
      pool: withCapital,
    },
    {
      id: "region",
      question: "Which continent is wrong?",
      label: "Continent",
      getValue: (c) => c.region,
      isTrueFor: (c, v) => c.region === v,
      pool: ALL_COUNTRIES.filter((c) => c.region),
    },
    {
      id: "currency",
      question: "Which currency is wrong?",
      label: "Currency",
      getValue: (c) => (c.currencies.length > 0 ? c.currencies[0] : null),
      isTrueFor: (c, v) => c.currencies.includes(v),
      pool: withCurrency,
    },
    {
      id: "language",
      question: "Which language is wrong?",
      label: "Language",
      getValue: (c) => (c.languages.length > 0 ? c.languages[0] : null),
      isTrueFor: (c, v) => c.languages.includes(v),
      pool: withLanguage,
    },
    {
      id: "borders",
      question: "Which neighbor is wrong?",
      label: "Borders",
      getValue: (c) => {
        if (c.borders.length === 0) return null;
        const neighbor = BY_CODE[c.borders[0]];
        return neighbor ? neighbor.name : null;
      },
      isTrueFor: (c, v) => {
        return c.borders.some((b) => BY_CODE[b]?.name === v);
      },
      pool: withBorders,
    },
  ];
}

function generateRound(
  rng: () => number,
  cat: CategoryDef,
  usedLiars: Set<string>
): ImposterRound | null {
  for (let attempt = 0; attempt < 50; attempt++) {
    const four = pickN(cat.pool, 4, rng);
    if (four.some((c) => !cat.getValue(c))) continue;

    // Pick liar (not already used)
    const liarCandidates = four.filter((c) => !usedLiars.has(c.code));
    if (liarCandidates.length === 0) continue;
    const liar = pickOne(liarCandidates, rng);
    const correctValue = cat.getValue(liar)!;

    // Find a fake value: real value of another country, NOT true for the liar
    let fakeValue: string | null = null;
    for (let i = 0; i < 30; i++) {
      const source = pickOne(
        cat.pool.filter((c) => c.code !== liar.code),
        rng
      );
      const candidate = cat.getValue(source);
      if (candidate && candidate !== correctValue && !cat.isTrueFor(liar, candidate)) {
        fakeValue = candidate;
        break;
      }
    }
    if (!fakeValue) continue;

    const cards: ImposterCard[] = four.map((c) => {
      if (c.code === liar.code) {
        return {
          code: c.code,
          name: c.name,
          flag: c.flag,
          label: cat.label,
          value: fakeValue!,
          isLiar: true,
          correctValue,
        };
      }
      return {
        code: c.code,
        name: c.name,
        flag: c.flag,
        label: cat.label,
        value: cat.getValue(c)!,
        isLiar: false,
      };
    });

    return { category: cat.question, cards };
  }
  return null;
}

export function generateImposterPuzzle(seed?: number): ImposterRound[] {
  const rng = mulberry32(seed ?? randomSeed());
  const categories = buildCategories();

  // 5 rounds, rising difficulty: capital, region, currency, language, borders
  const order = [0, 1, 2, 3, 4]; // indices into categories
  const rounds: ImposterRound[] = [];
  const usedLiars = new Set<string>();

  for (const catIdx of order) {
    const round = generateRound(rng, categories[catIdx], usedLiars);
    if (round) {
      const liar = round.cards.find((c) => c.isLiar);
      if (liar) usedLiars.add(liar.code);
      rounds.push(round);
    }
  }

  return rounds;
}
