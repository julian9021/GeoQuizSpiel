-- ============================================================
-- GeoQuiz Score Comparison — Supabase Migration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Create the scores table
create table scores (
  id          bigint generated always as identity primary key,
  game        text not null,
  puzzle_date date not null,
  score       int  not null check (score >= 0 and score <= 1000),
  anon_id     uuid not null,
  created_at  timestamptz default now(),
  unique (game, puzzle_date, anon_id)
);

-- 2. Index for fast percentile lookups
create index idx_scores_game_date on scores (game, puzzle_date);

-- 3. Enable Row Level Security
alter table scores enable row level security;

-- 4. RLS Policy: allow anonymous INSERTs (via anon key), block all SELECTs
-- The anon role can insert scores but CANNOT read raw data
create policy "Allow anonymous inserts"
  on scores for insert
  to anon
  with check (true);

-- No SELECT policy = no direct reads. Data is only accessible via the RPC function below.

-- 5. Percentile function (called via supabase.rpc)
-- Returns the fraction of players with score <= s (0.0 to 1.0)
-- security definer = runs with the function owner's privileges, bypassing RLS
create or replace function score_percentile(g text, d date, s int)
returns numeric
language sql
security definer
as $$
  select coalesce(
    (select count(*)::numeric from scores where game = g and puzzle_date = d and score <= s)
    /
    nullif((select count(*) from scores where game = g and puzzle_date = d), 0),
    0
  );
$$;

-- 6. Player count function (to handle cold start — only show comparison with enough data)
create or replace function score_count(g text, d date)
returns int
language sql
security definer
as $$
  select count(*)::int from scores where game = g and puzzle_date = d;
$$;
