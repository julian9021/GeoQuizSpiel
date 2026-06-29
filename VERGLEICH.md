# Score-Vergleich („du vs. alle heute") — mit Supabase

> Ziel: nach dem Spiel sehen, wie man im Vergleich zu allen anderen abgeschnitten hat.
> Das ist die **eine** Funktion, die ein gehostetes Backend braucht. Supabase übernimmt das;
> das statische Hosting der Spiele bleibt unverändert.

## Was sich ändert — und was nicht

- Die App bleibt **statisch** (Vercel/Netlify). Supabase ist ein **gehostetes** Backend, das
  du nicht selbst betreibst — aus deiner Sicht weiter „serverless". Die App spricht per HTTPS
  direkt mit Supabase.
- Es sind nur **zwei Operationen** nötig: Score schreiben, Verteilung lesen.
- Gilt für **alle** Spiele gemeinsam — eine Tabelle, ein Score-System.

---

## Datenmodell (eine Tabelle für alle Spiele)

```sql
create table scores (
  id          bigint generated always as identity primary key,
  game        text not null,          -- 'rank' | 'battle' | 'imposter' | 'grenzhopping'
  puzzle_date date not null,          -- das Tagesrätsel
  score       int  not null check (score >= 0 and score <= 1000),
  anon_id     uuid not null,          -- anonyme Browser-ID
  created_at  timestamptz default now(),
  unique (game, puzzle_date, anon_id) -- ein Eintrag pro Browser pro Tag/Spiel
);
```

`check` und `unique` sind nicht Deko — sie verhindern absurde Scores und Mehrfach-Spam vom
selben Browser.

---

## Die zwei Operationen

1. **Score posten** — ein einfaches INSERT nach Spielende.
2. **Vergleich lesen** — *nicht* alle Rohscores an den Client schicken, sondern eine
   **Postgres-Funktion (RPC)**, die nur eine Zahl zurückgibt: den Perzentilrang.

```sql
-- gibt zurück: Anteil der Spieler mit kleinerem/gleichem Score (0..1)
create or replace function score_percentile(g text, d date, s int)
returns numeric language sql security definer as $$
  select coalesce(avg((score <= s)::int), 0)
  from scores where game = g and puzzle_date = d;
$$;
```

So bekommt der Client „du warst besser als 73 %", ohne dass die Rohdaten je das Backend
verlassen. Datensparsam und schlank.

---

## Sicherheit — der eigentlich knifflige Teil

- **Row Level Security (RLS) ist Pflicht.** Der Supabase-„anon key" steht offen im
  Frontend-Code (so ist es vorgesehen). **Ohne RLS ist deine Datenbank offen** für jeden, der
  den Key aus dem Code liest — der häufigste Supabase-Anfängerfehler.
- Policy: **INSERT erlaubt, direktes SELECT auf die Tabelle gesperrt.** Gelesen wird nur über
  die `score_percentile`-Funktion. So kann niemand die Rohscores abgreifen.
- **Ehrliche Wahrheit zum Cheaten:** Bei einem rein clientseitigen Spiel lässt sich der Score
  nicht hart verifizieren — theoretisch kann jemand per Direktaufruf einen Fantasiescore
  posten. Perfekter Schutz ginge nur mit **serverseitiger Score-Nachrechnung** (Edge Function,
  die die Spiellogik dupliziert) — viel Aufwand.
  Für ein **Verteilungs-Histogramm** ist das nicht nötig: Ein paar gefälschte Einträge unter
  Hunderten sind Rauschen. Die `check`- und `unique`-Regeln fangen den Gelegenheits-Schummler.
  Erst ein echtes Namens-Leaderboard mit Preisen würde die harte Validierung verlangen.

---

## Identität ohne Login

- Eine **zufällige UUID im localStorage** als `anon_id`. Begrenzt Doppel-Einträge, ist aber
  nicht fälschungssicher (Cookies löschbar, mehrere Geräte zählen getrennt). Fürs Histogramm
  völlig ausreichend.
- Optional robuster: Supabase **anonyme Auth**. Für v1 nicht nötig.
- **Datensparsam bleiben** (du bist in der EU): kein Name, keine IP speichern — nur Score +
  anonyme ID. Damit ist die Sache datenschutzrechtlich unkritisch.

---

## Kaltstart — das unterschätzte Problem

Am Tag des Starts mit drei Spielern ist die Verteilung sinnlos („du warst besser als 100 %").
Der Vergleich wird erst mit Volumen aussagekräftig. Milderungen:

- Vergleich **erst ab N Spielern** (z. B. 20) anzeigen, vorher „noch zu wenige Daten heute".
- Oder über die **letzten Tage aggregieren**, bis genug Tageswerte da sind.
- Lokale Statistik (eigene Trefferquote, Streak) läuft parallel weiter — die funktioniert ab
  Spieler 1 und trägt die ersten Tage.

---

## Build-Schritte für Claude Code

1. **Du:** Supabase-Projekt anlegen (Dashboard) → bekommst Projekt-URL + anon key.
2. **Claude Code schreibt die SQL-Migration**, **du** führst sie im Supabase-SQL-Editor aus:
   Tabelle + Constraints + RLS-Policies + `score_percentile`-Funktion.
3. **Claude Code:** `@supabase/supabase-js` einbinden, URL/Key als **Env-Variablen** (`.env`,
   nicht ins Git committen).
4. Nach Spielende: Score posten → dann `score_percentile` aufrufen → Endscreen zeigt
   „besser als X %".
5. localStorage-Flag „heute gepostet", damit ein erneutes Öffnen nicht doppelt postet.

---

## Was du an Claude Code sagst

> „Lies VERGLEICH.md. Richte den Score-Vergleich über Supabase ein: schreib mir zuerst die
> SQL-Migration (Tabelle, Constraints, RLS-Policies, score_percentile-Funktion), die ich im
> Dashboard ausführe. Dann bau die Anbindung mit @supabase/supabase-js, Keys über .env. RLS
> muss aktiv sein — die Tabelle darf nicht direkt lesbar sein, nur über die Funktion. Frag mich
> nach Projekt-URL und anon key, wenn du sie brauchst."

> Reihenfolge-Tipp: erst **ein** Spiel anbinden und live testen, dann die anderen drei
> dasselbe System nutzen lassen.
