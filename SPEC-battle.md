# Geo-Battle („Welches ist höher?") — Build-Spec (Prototyp)

> Arbeitstitel: **[DEIN_NAME]** — eigener Name nötig. Vorschläge: *Duell*, *Versus*,
> *Kopf an Kopf*, *Schlagabtausch*.
>
> **Design:** nutzt dasselbe `DESIGN.md`-Theme wie alle anderen Spiele (graublaues Papier,
> dunkle Outline-Karten, eine Akzentfarbe nur fürs Feedback). Kein eigenes Styling erfinden.
>
> **Daten:** identischer Datensatz wie das Ranking-Spiel (Länder × numerische Metriken).
> Falls vorhanden, denselben wiederverwenden, **nicht** neu aufbauen.

## Wie du diese Datei benutzt (für Claude Code)

1. Lege diese Datei + die `DESIGN.md` in den Projektordner (oder nutze das bestehende
   Tab-Projekt, falls dieses Spiel dort als weiterer Tab leben soll).
2. Starte Claude Code im Ordner.
3. Sag: **„Lies die Spec und die DESIGN.md. Baue Phase 1 im Theme der DESIGN.md. Frag nach,
   bevor du Annahmen triffst."**

Mechanik, Daily-Logik und Scope sind bindend.

---

## 1. Was wir bauen (Vision)

Ein tägliches Geografie-Spiel im Top-Trumps-/Quartett-Geist: Zwei Länder treten in **einer
Kategorie** gegeneinander an (z. B. Einwohnerzahl), und der Spieler wählt das **höhere**.
Pro Tag eine zufällig gewählte Kategorie, in der **12 Runden** (Bereich 10–15) gespielt werden.

**Kein Backend** — Kategorie und Paarungen werden deterministisch aus dem Datum berechnet,
für alle gleich.

---

## 2. Kern-Mechanik

- Oben die Frage der Runde, z. B. „Welches Land hat **mehr Einwohner**?".
- Zwei Länderkarten (Flagge + Name), im Hochformat übereinander, dazwischen ein **„VS"**.
- Spieler tippt die Karte, die er für höher hält.
- Sofort Feedback: **beide echten Werte werden enthüllt**, die gewählte Karte wird
  `--correct`/`--wrong` markiert.
- „Weiter" → nächste Runde. Nach 12 Runden Endscreen mit Score **X / 12**.
- **Feste Rundenzahl, kein Sofort-Tod.** Ein Fehler beendet das Spiel nicht — so spielen alle
  gleich viele Runden und die Tagesscores sind vergleichbar (gut fürs Teilen). Eine
  Survival-Variante (ein Fehler = raus, wie weit kommst du) steht im Backlog.

### Kategorie-Wahl — Designentscheidung

**Default: eine Kategorie pro Tag**, zufällig gewählt, alle 12 Runden in dieser Kategorie
(„man ist in einer Kategorie unterwegs"). Vorteil: man kommt in einen Flow und entwickelt ein
Gefühl für die Metrik.

Alternative (→ Backlog): **pro Runde** eine andere zufällige Kategorie — abwechslungsreicher,
näher am echten Quartett, aber weniger Flow. Leicht umstellbar, da die Engine gleich bleibt.

---

## 3. Daily-Logik (deterministisch, kein Backend)

Seeded PRNG (mulberry32) mit dem Datum wählt Kategorie + die 12 Paarungen reproduzierbar.

```js
function dailySeed(date = new Date()) {
  const y = date.getFullYear(), m = date.getMonth() + 1, d = date.getDate();
  return y * 10000 + m * 100 + d;
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

**Paar-Generierung — mit Fairness-Regel (wichtig):**

```js
function generiereBattle(rng, pool, schwierigkeit) {
  // schwierigkeit steuert das erlaubte Verhältnis: leicht = klarer Abstand,
  // schwer = knapper. z.B. maxVerhältnis: leicht 0.7, mittel 0.85, schwer 0.95
  let a, b, tief, hoch;
  do {
    [a, b] = waehleZwei(rng, pool);
    hoch = Math.max(a.wert, b.wert);
    tief = Math.min(a.wert, b.wert);
  } while (a.wert === b.wert || tief / hoch > maxVerhältnis(schwierigkeit));
  return { a, b, hoeheres: a.wert > b.wert ? a : b };
}
```

- **Nie zwei (fast) gleiche Werte** gegenüberstellen — das wäre reines Rate-Glück und unfair.
  Der Mindestabstand ist Pflicht.
- **Ansteigende Schwierigkeit:** frühe Runden mit klarem Abstand, spätere knapper. Macht den
  Spannungsbogen.
- Innerhalb eines Tages **kein Land doppelt** verwenden, wenn der Pool groß genug ist.

---

## 4. Datenmodell

Identisch zum Ranking-Spiel — derselbe Pool, dieselben Metriken.

```json
{
  "countries": [
    {
      "code": "BRA",
      "name": "Brasilien",
      "flag": "🇧🇷",
      "metrics": {
        "population": null,   // aus REST Countries
        "area_km2": null,
        "gdp": null,
        "life_expectancy": null
      }
    }
  ],
  "metrics": [
    { "id": "population", "label": "Einwohnerzahl", "question": "mehr Einwohner", "source": "REST Countries" }
  ]
}
```

Jede Metrik braucht zusätzlich einen **Frage-Baustein** (`question`), damit die Rundenfrage
sauber lesbar ist: „Welches Land hat **{question}**?" → „… mehr Einwohner?".

---

## 5. Kategorien

Nur Metriken, bei denen **„höher" eindeutig** ist (sonst wird die Frage missverständlich):

- Einwohnerzahl — „mehr Einwohner"
- Landfläche — „eine größere Fläche"
- BIP — „ein höheres BIP"
- Lebenserwartung — „eine höhere Lebenserwartung"
- (später) Waldanteil, Touristenzahl, Anzahl UNESCO-Stätten …

**Achtung bei Index-Metriken:** Bei Dingen wie „Korruption" ist unklar, ob „höher" gut oder
schlecht ist. Solche Metriken nur aufnehmen, wenn die Richtung in der Frage glasklar wird
(„höherer Korruptionswert"), sonst weglassen.

---

## 6. Tech-Stack

- **Vite + React + TypeScript**, Theme aus `DESIGN.md`.
- Mobile-first, Hochformat: zwei Karten übereinander mit „VS" dazwischen, beide ohne Scrollen.
- Persistenz: **localStorage** (Streak, „heute schon gespielt?"). Kein Backend.
- Deploy: statisch (Vercel/Netlify/Cloudflare). In Phase 3.

---

## 7. Scope

**In v1:**
- Ein Modus: 12 Battles in einer Tageskategorie.
- Paar-Generierung mit Mindestabstand + ansteigender Schwierigkeit.
- Sofort-Feedback mit Enthüllung beider Werte.
- Tägliches Set via Datums-Seed, „heute schon gespielt?"-Sperre.
- Score X/12, teilbarer Share-String, lokaler Streak.

**NICHT in v1 (Backlog):**
- Survival-Variante (ein Fehler = raus).
- Gemischte Kategorien pro Runde.
- Weitere Metriken, regionale Modi.
- Backend, Accounts, Leaderboards, i18n, native App.

---

## 8. UI/UX-Details (im DESIGN.md-Theme)

- **Kopf:** Spielname, Datum, Fortschritt „Runde 5 / 12", aktueller Score. Statusleiste als
  Pille (DESIGN.md).
- **Frage:** prominent über den Karten, z. B. „Welches Land hat mehr Einwohner?".
- **Zwei Karten:** Outline-Karten (DESIGN.md), übereinander, gleich groß. Flagge + Name groß
  (Display-Schrift). Dazwischen ein „VS"-Badge als kleines Battle-Signature.
- **Nach der Wahl:** beide Werte einblenden (Mono-Ziffern, tabellarisch), gewählte Karte
  grün/rot, „Weiter"-Aktion.
- **Endscreen:** Score, Share-Button, Streak.
- **Share-Format** (verrät nichts):
  ```
  [DEIN_NAME] #123 — Einwohnerzahl
  🟩🟩🟥🟩🟩🟩🟥🟩🟩🟩🟩🟩
  10/12
  ```

---

## 9. Empfohlene Bau-Reihenfolge

**Phase 1 — Mechanik (hardcoded Runden):**
Eine feste Kategorie + ein paar fest verdrahtete Länderpaare mit Werten. Karte antippen,
beide Werte enthüllen, Feedback, Score über die Runden, Endscreen. Noch kein Daily, kein
echter Datensatz. → Spielgefühl steht.

**Phase 2 — Daten + Daily:**
Datensatz anbinden (idealerweise der Ranking-Datensatz). Tageskategorie + Paar-Generierung
aus §3 inkl. Mindestabstand und ansteigender Schwierigkeit. „Heute schon gespielt?"-Sperre.

**Phase 3 — Politur + Deploy:**
Share, Streak/Statistik, Mobile-Feinschliff, statischer Build + Deploy.

---

## 10. Backlog (später)

- **Survival-Modus:** ein Fehler beendet das Spiel, Highscore „wie weit kommst du".
- Gemischte Kategorien pro Runde (Quartett-Gefühl).
- „Einsatz"-Mechanik: vor der Antwort setzen, wie sicher man ist.
- Mehr Metriken, regionale Pools.

---

## Hinweise zu den Daten

- **REST Countries API** liefert Einwohnerzahl, Fläche u. a. direkt; weitere Metriken aus
  World Bank / Our World in Data (wie beim Ranking-Spiel).
- Pro Metrik die Richtung eindeutig halten und einen `question`-Baustein hinterlegen.
- Der **Mindestabstand** in §3 ist der wichtigste Fairness-Hebel: ohne ihn entstehen
  unlösbare 50,1-vs-50,0-Millionen-Paare. Lieber etwas großzügiger ansetzen.
