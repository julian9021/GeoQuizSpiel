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

export async function postScore(
  game: GameId,
  score: number
): Promise<boolean> {
  if (!supabase) return false;

  // Prevent double-posting
  const key = `geoquiz_posted_${game}_${todayStr()}`;
  if (localStorage.getItem(key)) return true;

  const { error } = await supabase.from("scores").insert({
    game,
    puzzle_date: todayStr(),
    score: Math.round(Math.max(0, Math.min(1000, score))),
    anon_id: getAnonId(),
  });

  if (error) {
    // Unique constraint violation = already posted (different session)
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

// ── Get percentile ──

export interface PercentileResult {
  percentile: number; // 0–100
  playerCount: number;
}

export async function getPercentile(
  game: GameId,
  score: number
): Promise<PercentileResult | null> {
  if (!supabase) return null;

  const date = todayStr();
  const clampedScore = Math.round(Math.max(0, Math.min(1000, score)));

  const [percRes, countRes] = await Promise.all([
    supabase.rpc("score_percentile", { g: game, d: date, s: clampedScore }),
    supabase.rpc("score_count", { g: game, d: date }),
  ]);

  if (percRes.error || countRes.error) {
    console.warn("Percentile fetch failed:", percRes.error?.message, countRes.error?.message);
    return null;
  }

  return {
    percentile: Math.round((percRes.data as number) * 100),
    playerCount: countRes.data as number,
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
