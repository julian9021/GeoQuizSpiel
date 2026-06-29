// Phase 1: Hardcoded 5 rounds for the Imposter game
// Diverse categories, rising difficulty, all facts verified

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

export const ROUNDS: ImposterRound[] = [
  // Round 1 — Hauptstadt (trickreich: beliebte Verwechslungen)
  {
    category: "Welche Hauptstadt stimmt nicht?",
    cards: [
      { code: "TUR", name: "Türkei", flag: "🇹🇷", label: "Hauptstadt", value: "Ankara", isLiar: false },
      { code: "AUS", name: "Australien", flag: "🇦🇺", label: "Hauptstadt", value: "Sydney", isLiar: true, correctValue: "Canberra" },
      { code: "MMR", name: "Myanmar", flag: "🇲🇲", label: "Hauptstadt", value: "Naypyidaw", isLiar: false },
      { code: "BRA", name: "Brasilien", flag: "🇧🇷", label: "Hauptstadt", value: "Brasília", isLiar: false },
    ],
  },
  // Round 2 — Höchster Punkt (Meter)
  {
    category: "Welcher höchste Punkt stimmt nicht?",
    cards: [
      { code: "NPL", name: "Nepal", flag: "🇳🇵", label: "Höchster Punkt", value: "8.849 m (Everest)", isLiar: false },
      { code: "TZA", name: "Tansania", flag: "🇹🇿", label: "Höchster Punkt", value: "5.895 m (Kilimandscharo)", isLiar: false },
      { code: "DEU", name: "Deutschland", flag: "🇩🇪", label: "Höchster Punkt", value: "3.798 m (Großglockner)", isLiar: true, correctValue: "2.962 m (Zugspitze)" },
      { code: "JPN", name: "Japan", flag: "🇯🇵", label: "Höchster Punkt", value: "3.776 m (Fuji)", isLiar: false },
    ],
  },
  // Round 3 — Anzahl Nachbarländer
  {
    category: "Welche Anzahl Nachbarländer stimmt nicht?",
    cards: [
      { code: "DEU", name: "Deutschland", flag: "🇩🇪", label: "Nachbarländer", value: "9", isLiar: false },
      { code: "CHN", name: "China", flag: "🇨🇳", label: "Nachbarländer", value: "14", isLiar: false },
      { code: "BRA", name: "Brasilien", flag: "🇧🇷", label: "Nachbarländer", value: "10", isLiar: false },
      { code: "FRA", name: "Frankreich", flag: "🇫🇷", label: "Nachbarländer", value: "3", isLiar: true, correctValue: "8" },
    ],
  },
  // Round 4 — Bierkonsum pro Kopf (Liter/Jahr, ca. 2022)
  {
    category: "Welcher Bierkonsum pro Kopf stimmt nicht?",
    cards: [
      { code: "CZE", name: "Tschechien", flag: "🇨🇿", label: "Bier pro Kopf", value: "~140 L/Jahr", isLiar: false },
      { code: "AUT", name: "Österreich", flag: "🇦🇹", label: "Bier pro Kopf", value: "~105 L/Jahr", isLiar: false },
      { code: "DEU", name: "Deutschland", flag: "🇩🇪", label: "Bier pro Kopf", value: "~92 L/Jahr", isLiar: false },
      { code: "TUR", name: "Türkei", flag: "🇹🇷", label: "Bier pro Kopf", value: "~78 L/Jahr", isLiar: true, correctValue: "~12 L/Jahr" },
    ],
  },
  // Round 5 — Landesfläche (km²)
  {
    category: "Welche Landesfläche stimmt nicht?",
    cards: [
      { code: "RUS", name: "Russland", flag: "🇷🇺", label: "Fläche", value: "17,1 Mio. km²", isLiar: false },
      { code: "CAN", name: "Kanada", flag: "🇨🇦", label: "Fläche", value: "10,0 Mio. km²", isLiar: false },
      { code: "IND", name: "Indien", flag: "🇮🇳", label: "Fläche", value: "3,3 Mio. km²", isLiar: false },
      { code: "AUS", name: "Australien", flag: "🇦🇺", label: "Fläche", value: "3,3 Mio. km²", isLiar: true, correctValue: "7,7 Mio. km²" },
    ],
  },
];
