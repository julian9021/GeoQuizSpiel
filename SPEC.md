# Geo-Ranking-Spiel — Build-Spec (Prototyp)

> Arbeitstitel: **[DEIN_NAME]** — bitte einen eigenen Namen wählen, *nicht* "GeoRankle"
> (fremde Marke). Vorschläge: *Rangle*, *Ordle*, *Stapel*, *Einsortiert*.

## Wie du diese Datei benutzt

1. Lege diese `SPEC.md` in einen leeren Ordner.
2. Starte Claude Code in diesem Ordner.
3. Sag: **„Lies SPEC.md und baue Phase 1. Frag nach, wenn etwas unklar ist, bevor du Annahmen triffst."**
4. Nach jeder Phase testen, dann zur nächsten.

Mechanik, Daily-Logik und Scope sind bindend. Reine Code-Entscheidungen darf Claude Code selbst treffen.

---

## 1. Was wir bauen (Vision)

Ein tägliches Geografie-Spiel: **eine Metrik** (z. B. Einwohnerzahl), und **10 Länder
erscheinen nacheinander**. Jedes Land muss der Spieler *blind* in die wachsende Rangliste
einsortieren — ohne zu wissen, welche Länder noch kommen. Am Ende: Auflösung mit Score.

Ein Rätsel pro Tag, für alle identisch, teilbar als Emoji-Grid. **Kein Backend** — das
Tagesrätsel wird deterministisch aus dem Datum berechnet.

Der Reiz: Selbst eine „bekannte" Metrik wie Einwohnerzahl wird schwer, weil man committen
muss, ohne den Rest zu kennen. Man muss antizipieren und Lücken offenlassen.

---

## 2. Kern-Mechanik (Blind-Insertion)

- Oben steht die Metrik des Tages + Richtung, z. B. „Einwohnerzahl — höchstes oben".
- Die 10 Länder kommen **einzeln** in zufälliger (aber für alle gleicher) Reihenfolge.
- Für das aktuelle Land zeigt das Spielfeld die **bisher platzierten Länder als sortierte
  Liste** mit antippbaren **Einfüge-Lücken** dazwischen (bei n platzierten Ländern gibt es
  n+1 Lücken: oben, zwischen je zwei, unten).
- Der Spieler wählt eine Lücke → das Land wird dort **relativ** eingefügt. Es geht **nicht**
  um feste Plätze 1–10, sondern um „über/unter welchem schon platzierten Land".
- **Kein Feedback während des Spiels.** Einmal platziert = fix, kein Verschieben mehr. Genau
  das ist der Skill: committen, ohne zu wissen, was noch kommt.
- Nach dem 10. Land: **Auflösung**. Die Spielerliste wird neben die korrekte Reihenfolge
  gestellt, jede Position grün (richtig) oder rot (falsch), plus Score und Share-String.

### Scoring — wichtige Designentscheidung

**Default: Anzahl Länder auf der korrekten absoluten Endposition (0–10).** Intuitiv
(„7/10 richtig platziert") und gut als Grid teilbar.

Trade-off, den du kennen musst: Beim relativen Einsortieren kann **ein** früh falsch
eingeschätztes Land mehrere absolute Positionen verschieben (du sortierst es z. B. zu weit
oben ein → alles darunter rutscht). Das ist hart, aber thematisch korrekt — Blind-Antizipation
*ist* das Spiel. Wer Lücken klug offenhält, wird belohnt.

Fairere, aber schwerer kommunizierbare Alternative (→ Backlog, nicht v1): Score nach
**paarweise korrekter Reihenfolge** (wie viele der Länderpaare stehen relativ richtig
zueinander). Misst die relative Einschätzung statt absoluter Plätze.

---

## 3. Daily-Logik (deterministisch, kein Backend)

Tagesrätsel muss aus dem Datum reproduzierbar sein: seeded PRNG (mulberry32), geseedet mit
dem Datum, wählt Metrik + 10 Länder + deren Erscheinungsreihenfolge.

```js
function dailySeed(date = new Date()) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  return y * 10000 + m * 100 + d; // z.B. 20260625
}

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

**Auswahl pro Tag:**
1. PRNG mit `dailySeed()` init.
2. Metrik ziehen.
3. 10 Länder ziehen, die **alle einen gültigen Wert** für diese Metrik haben und deren Werte
   **paarweise einen Mindestabstand** wahren (keine zwei fast gleichen Werte — sonst ist die
   Reihenfolge Glückssache und nicht lösbar).
4. Korrekte Lösung = die 10 Länder nach Metrik-Wert sortiert.
5. Erscheinungsreihenfolge = dieselben 10 Länder, mit dem PRNG **gemischt** (Fisher-Yates).

---

## 4. Datenmodell

Start klein und handverifiziert. Einwohnerzahl als Startmetrik ist bewusst gewählt: kommt
sauber aus REST Countries, **keine mühsame Recherche**. Pool ~40–50 Länder, damit täglich
abwechslungsreiche 10er-Sets entstehen.

```json
{
  "countries": [
    {
      "code": "NG",
      "name": "Nigeria",
      "flag": "🇳🇬",
      "metrics": {
        "population": null,        // beim Bau aus REST Countries füllen
        "forest_pct": null,
        "coffee_kg_per_capita": null
      }
    }
  ],
  "metrics": [
    {
      "id": "population",
      "label": "Einwohnerzahl",
      "order": "desc",
      "source": "REST Countries"
    }
  ]
}
```

**Für Claude Code:** `null` sind Platzhalter — echte, recherchierte Werte eintragen, Quelle +
Bezugsjahr vermerken. Keine Zahlen erfinden. Fehlt ein verlässlicher Wert, Land bei dieser
Metrik weglassen (`null` → wird nicht gewählt).

---

## 5. Metriken

**v1 startet mit nur einer Metrik: Einwohnerzahl.** Bewusst, um den Datenteil trivial zu
halten und die Mechanik sauber zu testen.

Sobald die Mechanik steht, als Erweiterung dieselbe Engine mit „Überraschungs-Metriken"
füttern — gleiche Codebasis, nur mehr Daten:
- Waldanteil in % (World Bank)
- Kaffeekonsum pro Kopf (Our World in Data)
- UNESCO-Welterbestätten (UNESCO-Liste)
- Anzahl Zeitzonen (manuell verifizieren)

Pro Metrik klar die Richtung (`asc`/`desc`) und das Label festlegen.

---

## 6. Tech-Stack

- **Vite + React + TypeScript** (leicht, statischer Build, gratis hostbar).
- Styling: Tailwind oder schlichtes CSS, minimal halten.
- **Mobile-first, Hochformat.** Spielfeld muss ohne Scrollen auf einen Portrait-Screen passen
  — auch mit 10 gestapelten Karten am Ende (kompakte Kartenhöhe einplanen!).
- Persistenz: **localStorage** für Streak/Statistik und „heute schon gespielt?". Kein Backend.
- Deploy: Vercel / Netlify / Cloudflare Pages (statisch). In Phase 3.

---

## 7. Scope

**In v1:**
- Ein Spielmodus (Blind-Insertion, 10 Länder).
- Eine Metrik (Einwohnerzahl).
- Tägliches Rätsel via Datums-Seed, „heute schon gespielt?"-Sperre.
- Auflösung mit echten Werten, Quelle und Score (korrekte absolute Positionen).
- Teilbarer Share-String (Grid, ohne Lösung zu verraten).
- Lokaler Streak-Zähler (localStorage).

**NICHT in v1 (Backlog):**
- Survival-/Live-Modus mit Sofort-Feedback (das ist die „TikTok"-Variante A).
- Weitere Metriken & größerer Länderpool.
- Paarweise Scoring-Option.
- Backend, Accounts, globale Leaderboards, i18n, native App.

---

## 8. UI/UX-Details

- **Kopf:** Spielname, Datum, Metrik + Richtung, Fortschritt „Land 4 / 10".
- **Aktuelles Land:** prominent (Flagge + Name), klar als „jetzt einsortieren" markiert.
- **Platzierte Liste:** vertikal, sortiert wie vom Spieler gelegt. Zwischen/über/unter jeder
  Karte eine antippbare **Einfüge-Zone**. Tap fügt das aktuelle Land dort ein → nächstes Land.
- Karten kompakt (10 müssen am Ende auf den Screen passen).
- **Kein** Verschieben bereits platzierter Karten. Optional: die *aktuelle* Karte darf vor dem
  Bestätigen noch die Lücke wechseln, danach fix.
- **Endscreen:** zwei Spalten — „Deine Reihenfolge" vs. „Korrekt", jede Position grün/rot,
  echte Werte eingeblendet, Quelle, Score, Share-Button, Streak.
- **Share-Format** (verrät die Lösung nicht):
  ```
  [DEIN_NAME] #123 — Einwohnerzahl
  🟩🟩🟥🟩🟥🟩🟩🟩🟥🟩
  7/10
  ```

---

## 9. Empfohlene Bau-Reihenfolge

**Phase 1 — Mechanik (hardcoded Rätsel):**
Ein fest verdrahtetes 10-Länder-Set + Metrik. Länder erscheinen einzeln, Einfüge-Lücken,
Blind-Platzierung ohne Feedback, am Ende Auflösung mit grün/rot + Score. Kein Daily, keine
echten Daten nötig. → Ziel: Spielgefühl steht und ist testbar.

**Phase 2 — Daten + Daily:**
Länderpool (40–50, echte Einwohnerzahlen aus REST Countries) anlegen. Daily-Seed-Auswahl +
Mindestabstand-Regel + gemischte Erscheinungsreihenfolge. „Heute schon gespielt?"-Sperre.

**Phase 3 — Politur + Deploy:**
Share-String, Streak/Statistik, Mobile-Feinschliff (10 Karten ohne Scroll!), statischer Build
+ Deploy.

---

## 10. Backlog (später, nicht jetzt)

- **Survival-Modus (Variante A):** Sofort grün/rot je Karte, 3 Leben, „wie weit kommst du".
- **Reverse:** fertige Reihenfolge zeigen, Spieler rät die Metrik.
- Überraschungs-Metriken, größerer Pool, regionale Sub-Pools.
- Paarweise Scoring-Option, i18n, Theming, Sound.

---

## Datenquellen

- REST Countries API — Stammdaten, Flaggen, Codes, **Einwohnerzahl**
- World Bank Open Data — Waldanteil u. a. (für spätere Metriken)
- Our World in Data — Konsummetriken (später)
- UNESCO World Heritage List — Welterbestätten (später)

Pro Metrik Quelle + Bezugsjahr im Datensatz vermerken.
