# Imposter-Spiel („Finde den Lügner") — Build-Spec (Prototyp)

> Arbeitstitel: **[DEIN_NAME]** — eigener Name nötig. Vorschläge: *Schwindel*, *Hochstapler*,
> *Bluff*, *Falschmeldung*.
>
> **Design:** Dieses Spiel nutzt dasselbe `DESIGN.md`-Theme wie die anderen (graublaues
> Papier, dunkle Outline-Karten, eine Akzentfarbe nur fürs Feedback). Kein eigenes Styling
> erfinden — das zentrale Theme importieren.

## Wie du diese Datei benutzt (für Claude Code)

1. Lege diese Datei + die `DESIGN.md` in den Projektordner (bzw. nutze das bestehende Projekt
   mit den Tabs, falls dieses Spiel dort als weiterer Tab leben soll).
2. Starte Claude Code im Ordner.
3. Sag: **„Lies die Spec und die DESIGN.md. Baue Phase 1 im Theme der DESIGN.md. Frag nach,
   bevor du Annahmen triffst."**

Mechanik, Lügen-Generierung, Daily-Logik und Scope sind bindend.

---

## 1. Was wir bauen (Vision)

Ein tägliches Geografie-Spiel: Es werden **vier Länder** gezeigt, jedes mit **einem Fakt
derselben Kategorie** (z. B. alle zeigen ihre Hauptstadt). **Drei Fakten stimmen, einer ist
gelogen.** Finde den Lügner.

Der Clou — und der Grund, warum das perfekt zu „daily-skalierbar" passt: Die Lüge wird
**aus echten Strukturdaten automatisch generiert**, nicht von Hand getextet. Der Code nimmt
für den Lügner einen echten Wert eines *anderen* Landes und setzt ihn ein. Dadurch entstehen
aus einem Datensatz praktisch unbegrenzt viele, immer plausible Rätsel.

**Kein Backend** — das Tagesrätsel wird deterministisch aus dem Datum berechnet.

---

## 2. Kern-Mechanik

- Pro Runde: 4 Länderkarten, jede mit Flagge, Name und **einem** Fakt (Label + Wert) aus der
  Kategorie der Runde.
- Genau **eine** Karte zeigt einen falschen Wert.
- Spieler tippt die Karte, die er für den Lügner hält.
- Sofort Feedback: gewählte Karte grün (richtig erkannt) oder rot (daneben); die echte
  Lügner-Karte wird markiert und der **korrekte Wert** eingeblendet („Lissabon, nicht Porto").
- Ein **Daily besteht aus 5 Runden** (steigende Schwierigkeit), Score **X / 5**, am Ende
  teilbar. (Eine einzelne Runde wäre als Tagesrätsel zu kurz.)

---

## 3. Die Lügen-Generierung (das Herzstück)

Datengetrieben, mit **strenger Korrektheits-Garantie**. Das ist die wichtigste Stelle des
ganzen Spiels: Ein einziger Fehler — eine „Lüge", die zufällig doch wahr ist, oder eine
„Wahrheit", die falsch ist — zerstört das Vertrauen ins Spiel sofort.

```js
function generiereRunde(rng, laender, kategorie) {
  // 1. nur Länder, die einen gültigen Wert für diese Kategorie haben
  const pool = laender.filter(l => hatWert(l, kategorie));
  const vier = waehleN(rng, pool, 4);

  // 2. einen davon zum Lügner bestimmen
  const luegner = vier[Math.floor(rng() * 4)];

  // 3. falschen Wert finden: Wert eines ANDEREN Landes, der NICHT auf den Lügner zutrifft
  let falsch;
  do {
    const quelle = waehleEines(rng, pool.filter(l => l !== luegner));
    falsch = wertVon(quelle, kategorie);
  } while (istWahrFuer(luegner, kategorie, falsch)); // <-- Pflicht-Validierung

  // 4. Anzeige: die 3 anderen zeigen ihren echten Wert, der Lügner zeigt `falsch`
  return { vier, luegner, falsch, korrekt: wertVon(luegner, kategorie) };
}
```

**`istWahrFuer` ist nicht verhandelbar.** Bei mehrwertigen Feldern (mehrere Amtssprachen,
mehrere Währungen, mehrere Nachbarländer) muss gegen die **gesamte** echte Liste geprüft
werden: Ein „falscher" Nachbar darf nicht doch in der echten Nachbarliste stehen; eine
„falsche" Sprache nicht doch Amtssprache sein. Genauso müssen die 3 wahren Karten **eindeutig
wahre** Werte zeigen.

---

## 4. Daily-Logik (deterministisch, kein Backend)

Seeded PRNG (mulberry32) mit dem Datum erzeugt die 5 Runden des Tages reproduzierbar.

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

Pro Tag: PRNG init → 5 Runden generieren, dabei Kategorien mischen und in der Schwierigkeit
ansteigend ordnen (siehe §6). Innerhalb eines Tages kein Land doppelt als Lügner.

---

## 5. Datenmodell

Wie bei den anderen Spielen: einmal aus REST Countries ziehen, als lokales JSON ablegen,
auf souveräne Staaten beschränken. Alle nötigen Felder stecken in dem einen Datensatz.

```json
{
  "countries": [
    {
      "code": "PRT",
      "name": "Portugal",
      "flag": "🇵🇹",
      "capital": "Lissabon",
      "region": "Europa",
      "currencies": ["Euro"],
      "languages": ["Portugiesisch"],
      "borders": ["ESP"]
    }
  ]
}
```

Mehrwertige Felder bewusst als **Arrays** halten (`currencies`, `languages`, `borders`) —
die Validierung in §3 braucht die vollständige Liste.

---

## 6. Kategorien & Schwierigkeit

Start mit Kategorien, die direkt aus REST Countries kommen und leicht zu validieren sind:

- **Hauptstadt** — leicht (vertauschte Hauptstadt eines anderen Landes).
- **Kontinent / Region** — leicht bis mittel.
- **Währung** — mittel.
- **Amtssprache** — mittel.
- **Nachbarland** („grenzt an …") — schwer (Lügner zeigt ein Nicht-Nachbarland).

Schwierigkeit der 5 Runden ansteigend: vorne Hauptstadt/Region, hinten Nachbarland.
Eine *schwerere Lügen-Variante* (statt fremdem Wert eine andere **echte Stadt desselben
Landes** als falsche „Hauptstadt", z. B. Porto statt Lissabon) ist reizvoll, braucht aber
Zusatzdaten (große Städte je Land) → Backlog.

---

## 7. Tech-Stack

- **Vite + React + TypeScript**, Theme aus `DESIGN.md` (gemeinsam mit den anderen Spielen).
- Mobile-first, Hochformat; 4 Karten ohne Scrollen auf den Screen.
- Persistenz: **localStorage** (Streak, „heute schon gespielt?"). Kein Backend.
- Deploy: statisch (Vercel/Netlify/Cloudflare). In Phase 3.

---

## 8. Scope

**In v1:**
- Ein Modus: 5 Runden „finde den Lügner".
- Automatische, validierte Lügen-Generierung (fremder echter Wert).
- Kategorien aus §6, ansteigende Schwierigkeit.
- Tägliches Set via Datums-Seed, „heute schon gespielt?"-Sperre.
- Sofort-Feedback + Auflösung mit korrektem Wert.
- Score X/5, teilbarer Share-String, lokaler Streak.

**NICHT in v1 (Backlog):**
- Schwere Lügen-Variante (anderer echter Wert desselben Landes).
- Weitere Kategorien (Flagge, Hymne, Wahrzeichen …).
- Backend, Accounts, Leaderboards, i18n, native App.

---

## 9. UI/UX-Details (im DESIGN.md-Theme)

- **Kopf:** Spielname, Datum, Fortschritt „Runde 2 / 5", Score. Statusleiste als Pille
  (wie im DESIGN.md beschrieben).
- **Kategorie-Hinweis:** klar oben, z. B. „Welche Hauptstadt stimmt nicht?".
- **4 Länderkarten:** Outline-Karten (DESIGN.md). Flagge + Ländername (Display-Schrift) +
  darunter Label + Wert. Gleich hohe Karten, antippbar.
- **Feedback:** gewählte Karte `--correct`/`--wrong`-Outline; die echte Lügner-Karte wird
  markiert, der korrekte Wert eingeblendet.
- **Zwischen Runden:** kurze „Weiter"-Aktion; am Ende Endscreen mit Score, Share, Streak.
- **Share-Format** (verrät nichts):
  ```
  [DEIN_NAME] #123
  🟩🟥🟩🟩🟩
  4/5
  ```

---

## 10. Empfohlene Bau-Reihenfolge

**Phase 1 — Mechanik (hardcoded Runden):**
3–5 fest verdrahtete Runden mit je 4 Ländern + einem markierten Lügner. Karten antippen,
Feedback, Auflösung, Score über die Runden. Noch keine Auto-Generierung, kein Daily, kein
echter Datensatz. → Spielgefühl steht.

**Phase 2 — Daten + Auto-Generierung + Daily:**
Datensatz aus REST Countries (lokal). Lügen-Generierung aus §3 **inklusive der
`istWahrFuer`-Validierung** — diese zuerst mit Tests absichern. Daily-Seed für 5 Runden,
„heute schon gespielt?"-Sperre.

**Phase 3 — Politur + Deploy:**
Share, Streak/Statistik, Mobile-Feinschliff, statischer Build + Deploy.

---

## 11. Backlog (später)

- Schwere Lügen-Variante (echter, aber falscher Wert desselben Landes).
- Mehr Kategorien, regionale Modi.
- „Wie sicher bist du?"-Einsatz für Bonuspunkte.

---

## Hinweise zu den Daten

- **REST Countries API** liefert Hauptstadt, Region, Währungen, Sprachen und `borders` —
  alles, was §6 braucht, in einem Datensatz.
- Mehrwertige Felder als Arrays speichern (Validierung!).
- Vor dem Live-Gang ein paar generierte Runden stichprobenartig prüfen: Ist die „Lüge"
  wirklich falsch? Sind alle drei „Wahrheiten" eindeutig wahr? Diese Stichprobe ist der
  beste Schutz gegen peinliche Fehler.
