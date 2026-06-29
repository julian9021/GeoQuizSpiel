# Grenz-Hopping-Spiel — Build-Spec (Prototyp)

> Arbeitstitel: **[DEIN_NAME]** — bitte eigenen Namen wählen, *nicht* "Travle"
> (existierendes Spiel desselben Genres). Vorschläge: *Grenzgang*, *Landweg*, *Überland*, *Grenzhüpfer*.

## Wie du diese Datei benutzt

1. Lege diese Datei in einen **neuen, leeren Ordner** (z. B. `GeoGrenzHopping`) — **nicht**
   in den Ordner des anderen Spiels.
2. Starte Claude Code in diesem Ordner.
3. Sag: **„Lies die Spec-Datei in diesem Ordner und baue Phase 1. Frag nach, wenn etwas
   unklar ist, bevor du Annahmen triffst."**
4. Nach jeder Phase testen, dann zur nächsten.

Mechanik, Daily-Logik und Scope sind bindend. Reine Code-Entscheidungen darf Claude Code
selbst treffen.

---

## 1. Was wir bauen (Vision)

Ein tägliches Geografie-Spiel: Du bekommst ein **Startland** und ein **Zielland** und musst
dich über **gemeinsame Landgrenzen** von A nach B durchhangeln — mit möglichst **wenigen
Schritten**. Beispiel: von Portugal nach Polen über die Kette der Nachbarländer.

Ein Rätsel pro Tag, für alle identisch, teilbar. **Kein Backend** — Start/Ziel werden
deterministisch aus dem Datum berechnet.

Der technische Kern ist ein **Graph**: jedes Land ist ein Knoten, jede gemeinsame Landgrenze
eine Kante. „Wenigste Schritte" ist der kürzeste Pfad — den berechnet der Code per
Breitensuche (BFS) in Millisekunden. Dadurch kennen wir immer das Optimum und können den
Spieler fair dagegen messen.

---

## 2. Kern-Mechanik

- Start **A** und Ziel **B** sind vorgegeben und stehen fest sichtbar oben.
- Der Spieler baut eine **Kette**, beginnend bei A. Jedes hinzugefügte Land muss an das
  **aktuelle Ende der Kette grenzen** (gemeinsame Landgrenze).
- Eingabe über ein **Textfeld mit Autocomplete** (Länder-Dropdown). Akzeptiere gängige
  Schreibvarianten/Aliase (siehe UI).
- Ungültige Eingabe (Land grenzt nicht ans Kettenende, oder existiert nicht) wird **abgelehnt**
  mit kurzem Hinweis (z. B. „Belgien grenzt nicht an Spanien") — zählt nicht als Schritt.
- **Undo** entfernt das zuletzt hinzugefügte Land.
- Die Runde ist **gewonnen**, sobald das hinzugefügte Land **B** ist (B grenzt also ans
  vorige Kettenende und wird als letztes Glied eingegeben).
- **Score = Anzahl der Grenzübertritte** in der Kette (= Anzahl Länder ohne das Startland).
  Verglichen mit dem **BFS-Optimum**.

### Bewertung — Designentscheidung

**Default: kein hartes Verlieren.** Der Spieler darf so lange bauen, bis er B erreicht; das
Ergebnis zeigt seine Schrittzahl neben dem Optimum, plus eine Effizienz-Wertung:

- Optimum getroffen → Bestwertung (z. B. 3 Sterne / „Perfekt")
- +1 Schritt → 2 Sterne, +2 → 1 Stern, darüber → 0

Das hält v1 entspannt und fair. Eine spannungsreichere Variante mit **Fehlbudget** (begrenzte
Anzahl Sackgassen/Fehlversuche, sonst verloren) steht im Backlog — erst einbauen, wenn die
Grundmechanik sich gut anfühlt.

---

## 3. Daily-Logik (deterministisch, kein Backend)

Start/Ziel müssen aus dem Datum reproduzierbar sein: seeded PRNG (mulberry32) wählt ein
**gültiges** A–B-Paar.

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

**Auswahl pro Tag — mit Gültigkeits-Constraints:**
1. PRNG mit `dailySeed()` init.
2. Zufällig A und B wählen, **beide mit mindestens einer Landgrenze** (keine reinen Inseln).
3. **BFS** von A nach B rechnen. Verwerfen und neu würfeln, wenn:
   - **kein Pfad existiert** (A und B liegen in getrennten Land-Clustern, z. B. Amerika vs.
     Eurasien-Afrika), oder
   - das Optimum **< 3** ist (zu trivial), oder
   - das Optimum **> 7** ist (zu zäh).
4. Das per BFS gefundene Optimum für die spätere Bewertung merken.

So ist jedes Daily garantiert lösbar und angenehm dosiert.

---

## 4. Datenmodell (der Graph)

Die Grenzdaten kommen fertig aus REST Countries: jedes Land hat ein `borders`-Feld mit den
Codes seiner Nachbarn. Daraus baust du eine **Adjazenzliste**.

```json
{
  "countries": [
    {
      "code": "DEU",
      "name": "Deutschland",
      "flag": "🇩🇪",
      "borders": ["AUT", "BEL", "CZE", "DNK", "FRA", "LUX", "NLD", "POL", "CHE"]
    }
  ]
}
```

**Wichtig für Claude Code:**
- Daten **einmal** von REST Countries ziehen und als **lokale JSON-Datei** ablegen — nicht zur
  Laufzeit live fetchen (offline-fähig, deterministisch, schnell).
- Pool auf **souveräne Staaten** beschränken, um kuriose Territorien-Kanten zu vermeiden.
- Der Graph ist **ungerichtet**: wenn A B als Nachbar listet, gilt die Kante auch umgekehrt —
  beim Einlesen Symmetrie sicherstellen (beidseitig eintragen).

---

## 5. Pfadprüfung & Optimum (BFS)

Das Herzstück. Zwei Verwendungen: (a) beim Daily-Generieren Existenz + Länge prüfen,
(b) am Ende den Score des Spielers vergleichen.

```js
// kürzeste Anzahl Grenzübertritte von start zu ziel; null falls kein Pfad
function kuerzesterPfad(graph, start, ziel) {
  const queue = [[start, 0]];
  const besucht = new Set([start]);
  while (queue.length) {
    const [land, dist] = queue.shift();
    if (land === ziel) return dist;
    for (const nachbar of graph[land] ?? []) {
      if (!besucht.has(nachbar)) {
        besucht.add(nachbar);
        queue.push([nachbar, dist + 1]);
      }
    }
  }
  return null;
}
```

Die Eingabe-Validierung im Spiel ist simpel: das neue Land muss in `graph[aktuellesEnde]` sein.

---

## 6. Tech-Stack

- **Vite + React + TypeScript** (gleich wie das andere Spiel, für Konsistenz).
- Styling: Tailwind oder schlichtes CSS, minimal.
- **Mobile-first, Hochformat.** Kette + Eingabefeld müssen bequem aufs Handy passen.
- Persistenz: **localStorage** für Streak/Statistik und „heute schon gespielt?". Kein Backend.
- Deploy: Vercel / Netlify / Cloudflare Pages (statisch). In Phase 3.

---

## 7. Scope

**In v1:**
- Ein Spielmodus (Kette A→B über Landgrenzen).
- Tägliches A–B-Paar via Datums-Seed mit Gültigkeits-Constraints.
- Autocomplete-Eingabe, Grenz-Validierung, Undo.
- BFS-Optimum + Effizienz-Bewertung.
- Endscreen mit deiner Kette, Optimum und (optional) einem möglichen optimalen Pfad.
- Teilbarer Share-String, lokaler Streak.

**NICHT in v1 (Backlog):**
- Interaktive Weltkarte (die Kette nur als Flaggen-Liste, noch keine echte Karte).
- Twists: gesperrtes Land / Pflicht-Durchgangsland.
- Fehlbudget-/Survival-Variante.
- Backend, Accounts, Leaderboards, i18n, native App.

---

## 8. UI/UX-Details

- **Kopf:** Spielname, Datum, „Von 🇵🇹 Portugal nach 🇵🇱 Polen", Schrittzähler.
- **Kette:** Reihe aus Flaggen + Ländernamen, von A bis zum aktuellen Ende; wächst nach unten/
  rechts. A optisch als Start markiert, B als Ziel angedeutet.
- **Eingabe:** Textfeld mit Autocomplete-Dropdown (gefiltert nach Tippeingabe). Aliase
  zulassen (z. B. „USA" → Vereinigte Staaten, englische wie deutsche Namen).
- **Fehlerhinweis:** bei ungültiger Eingabe kurze, freundliche Meldung, warum es nicht passt.
- **Undo-Button** für das letzte Glied.
- **Endscreen:** deine Kette + Schrittzahl, Optimum, Sterne/Effizienz, optional ein optimaler
  Pfad zum Vergleich, Share-Button, Streak.
- **Share-Format** (verrät den Lösungsweg nicht):
  ```
  [DEIN_NAME] #123
  🇵🇹 → 🇵🇱
  6 Schritte (Optimum: 5) ⭐⭐
  ```

---

## 9. Empfohlene Bau-Reihenfolge

**Phase 1 — Mechanik (hardcoded Rätsel + Mini-Graph):**
Ein fest verdrahtetes A→B-Paar und ein kleiner, hartcodierter Beispiel-Graph (ein paar Dutzend
Länder reichen). Ketten-Bauen mit Grenz-Validierung, Autocomplete, Undo, BFS-Optimum,
Endscreen mit Score. Noch kein Daily, keine echten Volldaten, keine Karte.
→ Ziel: Spielgefühl steht und ist testbar.

**Phase 2 — Echte Daten + Daily:**
Vollständigen Graphen aus REST Countries ziehen und als lokales JSON ablegen (souveräne
Staaten, symmetrische Kanten). Daily-Seed-Auswahl mit den Gültigkeits-Constraints aus §3.
„Heute schon gespielt?"-Sperre.

**Phase 3 — Politur + Deploy:**
Share-String, Streak/Statistik, Mobile-Feinschliff, statischer Build + Deploy.

---

## 10. Backlog (später, nicht jetzt)

- **Interaktive Weltkarte:** die Kette live auf einer Karte einzeichnen (z. B. d3-geo /
  react-simple-maps mit world-atlas TopoJSON). Schönes Upgrade, aber nicht trivial.
- **Twists:** „komm von A nach B, aber Land X ist gesperrt" oder „du musst durch Land Y" —
  ändert den optimalen Pfad und erzeugt aus demselben Graphen endlos neue Rätsel.
- **Fehlbudget / Survival:** begrenzte Sackgassen, sonst verloren.
- Schwierigkeits-Stufen über die Optimum-Länge, regionale Modi, i18n.

---

## Hinweise zu den Daten

- **REST Countries API** liefert `borders` (Nachbar-Codes), `cca3` (Code), Namen und Flaggen —
  das ist der komplette Graph in einem Datensatz.
- Bekannte Stolpersteine, die der Daily-Constraint in §3 aber automatisch abfängt:
  - **Inselstaaten** (Island, Australien, Japan, Madagaskar …) haben keine Landgrenzen → nie
    als Start/Ziel.
  - **Getrennte Cluster:** Amerika hängt nur über die Landenge von Panama zusammen und ist
    **nicht** per Land mit Eurasien/Afrika verbunden → A und B müssen im selben Cluster liegen
    (BFS gibt sonst `null`).
  - Schöne Engpässe für knifflige Rätsel: Panama (Nord-/Südamerika), Ägypten (Afrika↔Asien).
