// Score submission & percentile comparison via Supabase

import { supabase } from "./supabase";

type GameId = "ranking" | "battle" | "imposter" | "grenzhopping";

// ── Anonymous ID (persisted in localStorage) ──

function getAnonId(): string {
  const KEY = "geoquiz_anon_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

// ── Today's date as YYYY-MM-DD ──

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ── Post score ──

// Set to false for production (daily challenge mode: one score per game per day)
const TEST_MODE = true;

export async function postScore(
  game: GameId,
  score: number
): Promise<boolean> {
  if (!supabase) return false;

  if (!TEST_MODE) {
    // Production: prevent double-posting (one score per day)
    const key = `geoquiz_posted_${game}_${todayStr()}`;
    if (localStorage.getItem(key)) return true;

    const { error } = await supabase.from("scores").insert({
      game,
      puzzle_date: todayStr(),
      score: Math.round(Math.max(0, Math.min(1000, score))),
      anon_id: getAnonId(),
    });

    if (error) {
      if (error.code === "23505") {
        localStorage.setItem(key, "1");
        return true;
      }
      console.warn("Score post failed:", error.message);
      return false;
    }

    localStorage.setItem(key, "1");
    return true;
  }

  // Test mode: every round counts as a new "player"
  const { error } = await supabase.from("scores").insert({
    game,
    puzzle_date: todayStr(),
    score: Math.round(Math.max(0, Math.min(1000, score))),
    anon_id: crypto.randomUUID(),
  });

  if (error) {
    console.warn("Score post failed:", error.message);
    return false;
  }

  return true;
}

// ── Get score stats ──

export interface HistogramBucket {
  bucket: number; // 0–9 (0 = scores 0–99, 9 = scores 900–1000)
  count: number;
}

export interface ScoreStats {
  percentile: number; // 0–100
  rank: number;
  playerCount: number;
  histogram: HistogramBucket[];
  playerBucket: number; // which bucket the player falls in
}

export async function getScoreStats(
  game: GameId,
  score: number
): Promise<ScoreStats | null> {
  if (!supabase) return null;

  const date = todayStr();
  const clampedScore = Math.round(Math.max(0, Math.min(1000, score)));

  const [percRes, countRes, rankRes, histRes] = await Promise.all([
    supabase.rpc("score_percentile", { g: game, d: date, s: clampedScore }),
    supabase.rpc("score_count", { g: game, d: date }),
    supabase.rpc("score_rank", { g: game, d: date, s: clampedScore }),
    supabase.rpc("score_histogram", { g: game, d: date }),
  ]);

  if (percRes.error || countRes.error) {
    console.warn("Stats fetch failed:", percRes.error?.message, countRes.error?.message);
    return null;
  }

  // Parse histogram, fill empty buckets with 0
  const rawHist: HistogramBucket[] = histRes.data ?? [];
  const histogram: HistogramBucket[] = [];
  const bucketMap = new Map(rawHist.map((b) => [b.bucket, b.count]));
  for (let i = 0; i <= 9; i++) {
    histogram.push({ bucket: i, count: bucketMap.get(i) ?? 0 });
  }

  return {
    percentile: Math.round((percRes.data as number) * 100),
    rank: (rankRes.data as number) ?? 1,
    playerCount: (countRes.data as number) ?? 0,
    histogram,
    playerBucket: Math.min(Math.floor(clampedScore / 100), 9),
  };
}

// ── Normalize scores to 0–1000 for each game ──

export function normalizeRankingScore(correctCount: number, total: number): number {
  return Math.round((correctCount / total) * 1000);
}

export function normalizeBattleScore(correctCount: number, total: number): number {
  return Math.round((correctCount / total) * 1000);
}

export function normalizeImposterScore(correctCount: number, total: number): number {
  return Math.round((correctCount / total) * 1000);
}

export function normalizeGrenzhoppingScore(steps: number, optimal: number): number {
  // Perfect = 1000, each extra step reduces score
  if (optimal === 0) return 1000;
  const ratio = optimal / steps;
  return Math.round(Math.min(1, ratio) * 1000);
}
