# Daten-Setup — Auftrag für Claude Code

> Ziel: **ein** sauberer Länder-Datensatz als **lokale JSON**, den alle Spiele teilen.
> **Keine Datenbank, kein Backend.** Die Daten sind statisch und winzig (~195 Länder) — eine
> JSON ist hier die richtige und beste Architektur.

## Grundregeln (nicht verhandelbar)

1. **Niemals Werte raten oder erfinden.** Wenn für ein Land/eine Metrik kein verlässlicher
   Wert aus einer der unten genannten Quellen vorliegt: Feld auf `null` lassen und am Ende in
   einer **Lückenliste** melden. Eine plausible erfundene Zahl ist schlimmer als eine Lücke,
   weil sie unsichtbar das Spiel kaputt macht.
2. **Jeder Wert hat eine Quelle + ein Bezugsjahr** (in `meta` hinterlegt).
3. **Reproduzierbar:** Die JSON wird von einem **Build-Skript** erzeugt, nicht von Hand
   geschrieben. So lässt sie sich später neu generieren, wenn Quellen aktualisiert werden.
4. Ein konsolidierter Datensatz (`src/data/countries.json`) für alle Spiele.

---

## Zwei Beschaffungswege

### Weg 1 — automatisch aus REST Countries (per Skript abrufen)

Diese Felder kommen verlässlich aus einem einzigen API-Abruf — hier darf das Skript voll
automatisch arbeiten:

`code` (cca3), `name` (deutsch, falls verfügbar), `flag` (Emoji), `flagImage` (URL),
`capital`, `currencies[]`, `languages[]`, `borders[]`, `tld[]`, `callingCode`, `carSide`.

Abgeleitet: `neighbors = borders.length`.

→ Deckt sofort ab: die Nachbarländer-Metrik **und** alle Imposter-Textfelder **und** die
Flaggen für den visuellen Imposter.

### Weg 2 — Spezial-Stats aus vorgegebenen Quellen (CSV einlesen, nie schätzen)

Diese stehen **nicht** in REST Countries. Workflow: Ich lade die Rohdaten als CSV herunter
und lege sie in `data-raw/`; das Build-Skript liest sie ein und merged sie. Wo ich keine
brauchbare Quelle liefere, bleibt das Feld `null`.

| Metrik | Quelle | Beschaffung |
|--------|--------|-------------|
| `life_exp` | World Bank, Indikator `SP.DYN.LE00.IN` (verifizieren) | CSV-Download von data.worldbank.org |
| `fertility` | World Bank, `SP.DYN.TFRT.IN` (verifizieren) | CSV-Download |
| `forest` | World Bank, `AG.LND.FRST.ZS` (verifizieren) | CSV-Download |
| `mother_age` | Our World in Data | Chart „mean age at first birth" → Download → CSV |
| `beer` | Our World in Data / Kirin Report | OWID-Chart → CSV |
| `coffee` | ICO / Our World in Data | OWID-Chart → CSV |
| `height` | NCD-RisC | ncdrisc.org → Data Downloads (Geschlecht/Kohorte fixieren) |
| `passport` | Henley Passport Index | visafreie Ziele (NICHT den Rang!) |
| `nobel` | Nobel Foundation / Wikipedia „laureates by country" | manuell/scrapen |
| `peak` | Wikipedia „highest point by country" | Tabelle |
| `timezones` | Wikipedia „number of time zones" | Tabelle, manuell |
| `coast` | CIA World Factbook „Coastline" | Factbook-Daten |
| `airports` | CIA World Factbook „Airports" | Factbook-Daten, Bezugsjahr fixieren |
| `temp` | Hauptstadt-Temperatur (siehe INHALT.md) | definierte Klimaquelle |

> Die genauen Indikator-Codes/URLs **vor dem Abruf verifizieren** — nicht aus dem Gedächtnis
> übernehmen. Bei Unsicherheit lieber melden als raten.

---

## Die Mapping-Falle (häufigste Fehlerquelle)

Verschiedene Quellen benennen Länder unterschiedlich („USA" / „United States" / „United
States of America"). **Immer über den ISO-3166-Code (cca3) joinen, nie über den Namen.**
Quellen, die nur Namen liefern, brauchen ein kleines Alias-Mapping auf den ISO-Code. Jedes
Land, das beim Merge **nicht** gematcht werden konnte, explizit in der Lückenliste ausgeben —
nicht stillschweigend überspringen.

---

## Ziel-Struktur

```json
{
  "meta": {
    "generated": "2026-06-29",
    "metrics": {
      "beer":   { "label": "Bierkonsum pro Kopf", "unit": "l/Jahr", "order": "desc",
                  "question": "mehr Bierkonsum pro Kopf", "source": "OWID", "year": 2019 }
      // … je Metrik
    }
  },
  "countries": [
    {
      "code": "CZE",
      "name": "Tschechien",
      "flag": "🇨🇿",
      "flagImage": "https://…",
      "capital": "Prag",
      "currencies": ["Tschechische Krone"],
      "languages": ["Tschechisch"],
      "borders": ["AUT", "DEU", "POL", "SVK"],
      "tld": [".cz"],
      "callingCode": "+420",
      "carSide": "right",
      "metrics": {
        "beer": 188.5,
        "neighbors": 4,
        "life_exp": null    // Lücke, ehrlich als null
      }
    }
  ]
}
```

Metrik-Metadaten (Label, Einheit, Richtung, Quelle, Jahr) zentral in `meta.metrics`, die
Werte je Land schlank in `countries[].metrics`. Das passt zum Datenmodell der Spiel-Specs.

---

## Skript-Aufbau (Vorschlag)

```
scripts/build-data.mjs     # erzeugt src/data/countries.json
data-raw/                  # die heruntergeladenen CSVs (Weg 2)
src/data/countries.json    # das Ergebnis – das laden die Spiele
```

Das Skript: (1) REST Countries abrufen → Basis-Felder, (2) CSVs aus `data-raw/` einlesen und
per ISO-Code mergen, (3) `countries.json` schreiben, (4) am Ende eine **Lückenliste** auf der
Konsole ausgeben: welche Metrik bei welchen Ländern `null` ist und welche Länder nicht
gematcht wurden.

---

## Reihenfolge

1. Build-Skript-Gerüst + REST-Countries-Teil → liefert Basis inkl. Nachbarn, Imposter-Texte, Flaggen.
2. Ich liefere die CSVs für die 🟢-Spezialmetriken; Skript merged sie.
3. Lückenliste ansehen → entscheiden, welche Lücken ok sind und welche Quelle nachgeliefert wird.
4. Die 🟡-Metriken (`temp`, `airports`) mit fixierter Definition ergänzen.
5. Vor Live: je Metrik drei Stichproben gegen die Originalquelle prüfen + Plausibilitäts-Check
   (liegen die Werte in einem sinnvollen Bereich?).

---

## Was du an Claude Code sagst

> „Lies DATEN.md und INHALT.md. Bau das Build-Skript: erst den REST-Countries-Teil komplett,
> dann den CSV-Merge über ISO-Codes. Erfinde unter keinen Umständen Werte — fehlende bleiben
> null, und gib mir am Ende die Lückenliste aus. Frag nach, welche CSVs ich schon abgelegt habe,
> bevor du den Merge-Teil baust."
