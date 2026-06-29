# Design-Spezifikation — [DEIN_NAME]

> Ziel: **eine** durchgängige Designsprache für **alle** Spiele (Ranking, Grenzhopping,
> künftige). Aktuell sehen die Spiele unterschiedlich aus — das ist das Hauptproblem.
> Diese Datei ist die verbindliche visuelle Referenz. Bau zuerst ein zentrales Theme
> (CSS-Variablen / Theme-Modul), das jedes Spiel importiert, statt pro Spiel eigene Styles.

## Wie du diese Datei benutzt (für Claude Code)

1. Lege ein zentrales Theme an (`src/theme.css` oder ein Token-Modul) mit den Tokens unten.
2. Vereinheitliche **beide** vorhandenen Spiele auf dieses Theme — entferne alle abweichenden
   Farben, Radien, Schatten und Schriften, die nicht hier definiert sind.
3. Halte dich strikt an die Tokens. Keine zusätzlichen Farben, keine `shadow-lg`-Defaults,
   keine zufälligen Border-Radien.

---

## Charakter in einem Satz

Flach, hoher Kontrast, selbstbewusst. Dunkle Outlines tragen die Struktur, kaum Schatten,
kühles graublaues Papier als Bühne, viel Luft. Ruhig und klar wie ein gut gemachtes
Tageszeitungs-Spiel — nicht verspielt, nicht „app-bunt".

---

## 1. Farben (Tokens)

```css
:root {
  --paper:    #E5EAEF;  /* Seitenhintergrund, blasses entsättigtes Graublau */
  --surface:  #FFFFFF;  /* Karten/Buttons-Füllung, reines Weiß (Kontrast zum BG) */
  --ink:      #1B2A33;  /* Text + alle Outlines, dunkle petrol-getönte Tinte (kein reines Schwarz) */
  --muted:    #5E6B73;  /* sekundärer Text, Labels wie „pts" */
  --pill:     #D4DDE3;  /* Hintergrund der Statusleiste oben, gleiche Familie wie --paper */

  /* funktionale Zustände – gedämpft, nicht neon */
  --correct:  #2E7D46;  /* richtig */
  --wrong:    #C2412B;  /* falsch */
  --hover:    #EDF1F4;  /* sehr dezenter Hover-Hintergrund */
}
```

Regeln:
- Hintergrund immer `--paper`, Karten/Buttons immer `--surface`.
- **Outlines und Text sind dasselbe `--ink`** — das ist der Kern des Looks.
- Akzentfarben (`--correct`/`--wrong`) NUR für Spielfeedback, nie für Deko.
- Keine Farbverläufe. Keine **gesättigten** lila/blauen UI-Akzente auf Buttons, Links o. Ä.
  (das war der alte „vibe coded"-Look). Der blasse Graublau-Hintergrund ist bewusst
  entsättigt und zählt nicht dazu.

---

## 2. Typografie

Zwei Rollen, bewusst kontrastarm gehalten:

- **Display / Überschriften / Ländernamen:** eine kräftige, leicht eigenwillige Sans.
  Empfehlung: **Bricolage Grotesque** (700/800). Alternative: **Space Grotesk**.
- **Body / Buttons / Labels:** eine neutrale, sehr lesbare Sans. Empfehlung: **Public Sans**
  oder **IBM Plex Sans** (500/600 für Button-Labels).
- **Zahlen / Codes (optional, als Detail):** **IBM Plex Mono** für Statuswerte, Schrittzähler,
  Ländercodes — tabellarische Ziffern (`font-variant-numeric: tabular-nums`).

Type-Skala (Richtwerte, mobile-first):
```
Ländername / H1   28–32px, Bold
Button-Label      17–18px, SemiBold
Statusleiste      15–16px, Medium
Sekundär/Labels   13–14px, Medium, --muted
```
Optionslabels und Buttons in **Satzform/Title Case**, nicht GROSSBUCHSTABEN (außer kurze
System-Labels wie „pts").

---

## 3. Form & Struktur

```css
:root {
  --radius:        14px;   /* Karten und Buttons – durchgängig gleich */
  --radius-pill:   999px;  /* nur die Statusleiste oben */
  --border-width:  2px;    /* die schwarzen Outlines */
  --border:        var(--border-width) solid var(--ink);

  --gap:           10px;   /* Abstand zwischen Listeneinträgen */
  --pad-card:      16px 20px;
  --maxw:          560px;  /* zentrierte Inhaltsspalte */
}
```

- **Ein** Radius-Wert für alles außer der Pille (`--radius`). Nicht mischen — das war ein
  Hauptgrund für den uneinheitlichen Eindruck.
- **Schatten: praktisch keine.** Die schwarze Outline ersetzt den Schatten. Höchstens ein
  minimaler Schatten bei aktiven/gedrückten Zuständen.
- Inhalt zentriert, max. `--maxw` breit, großzügige vertikale Luft.

---

## 4. Komponenten

**Statusleiste (oben):**
Eine Pille (`--pill`-Hintergrund, `--radius-pill`), Inhalt zentriert: „1 / 8" und „0 pts",
getrennt durch einen dünnen vertikalen Strich in `--muted`. Rechts daneben Icon-Buttons
(Statistik, Hilfe) als schlichte Outline-Glyphen in `--ink`.

**Hero (Frage/Subjekt):**
Zentriert: Flagge (feste Breite, ~150px, leichte Outline), darunter der Ländername in der
Display-Schrift, fett. Das ist der Anker jeder Runde.

**Options-/Listen-Buttons (der Signature-Baustein):**
- Volle Breite, `--surface`-Füllung, `--border`, `--radius`.
- Emoji-Icon links, dann Label in Body-Schrift SemiBold, linksbündig.
- Abstand untereinander: `--gap`.
- **Hover:** Hintergrund `--hover`, Outline bleibt.
- **Aktiv/gewählt:** Outline und Text in der Zustandsfarbe (`--correct`/`--wrong`),
  optional zarte Tönung der Füllung.
- Feste, gleiche Höhe für alle Einträge.

**Eingabefeld (Grenzhopping):**
Gleiche Outline-Sprache wie die Buttons (`--border`, `--radius`, `--surface`). Primär-Button
daneben (z. B. „Hinzufügen") = `--ink`-Füllung mit `--paper`-Text — der einzige „gefüllte"
Button, als klarer Haupt-CTA.

**Karten-/Kettenglieder:**
Gleiche Outline-Karten. Erreichte/korrekte Glieder in `--correct`-Outline; das Ziel als
Karte mit **gestrichelter** Outline, bis es erreicht ist.

---

## 5. Signature

Das Wiedererkennbare ist die **durchgängige dunkle Outline-Sprache auf kühlem graublauem
Papier** — jede Fläche ist ein klar umrandetes Kärtchen, nichts schwebt auf Schatten. Diese eine
Konsequenz hält alle Spiele zusammen. Spar dir alle anderen Effekte; lass die Outlines und
die Typo die Arbeit machen.

Optionales Detail mit Charakter: Ländercodes/Zahlen in IBM Plex Mono (z. B. „RUS", „1 / 8",
Schrittzähler), das gibt der ansonsten ruhigen Fläche einen kartografischen Akzent.

---

## 6. Sprache / Microcopy

- **Alles auf Deutsch, konsequent.** Aktuell mischt Grenzhopping Englisch/Deutsch
  („Neighbor of Portugal…", „Add", „GOAL", „Steps") — das vereinheitlichen:
  - „Neighbor of Portugal…" → „Nachbar von Portugal …"
  - „Add" → „Hinzufügen"
  - „GOAL" → „Ziel"
  - „Steps: 0" → „Schritte: 0"
- Aktive Verben, Satzform, kein Füllwort. Buttons sagen, was passiert.
- Fehlermeldungen erklären sachlich, was nicht geht („Belgien grenzt nicht an Portugal"),
  ohne sich zu entschuldigen.

---

## 7. Qualitäts-Boden (nicht verhandelbar)

- Responsiv bis Handy-Hochformat; Inhalt nie abgeschnitten.
- Sichtbarer Tastatur-Fokus auf allen interaktiven Elementen.
- `prefers-reduced-motion` respektieren; Animation sparsam (kurze Hover-/Press-Übergänge,
  ~120–160ms, mehr nicht).
- Kontrast ausreichend (Text `--ink` auf `--surface`/`--paper`).

---

## Konsistenz-Checkliste (vor jedem „fertig")

- [ ] Beide Spiele nutzen dasselbe Theme-File, keine lokalen Sonderfarben.
- [ ] Nur `--radius` für Karten/Buttons, nur die Pille ist rund.
- [ ] Keine Schatten außer minimal bei Press/Active.
- [ ] Outlines = Text = `--ink`, durchgängig `--border-width`.
- [ ] Display- und Body-Schrift wie definiert, keine dritte Schrift eingeschlichen.
- [ ] Alle Texte Deutsch, Satzform, aktive Verben.
