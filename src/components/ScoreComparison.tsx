import { useEffect, useState } from "react";
import { postScore, getScoreStats, type ScoreStats } from "../data/scores";

interface Props {
  game: "ranking" | "battle" | "imposter" | "grenzhopping";
  normalizedScore: number; // 0–1000
}

const MIN_PLAYERS = 1;
const BUCKET_LABELS = [
  "0–99", "100–199", "200–299", "300–399", "400–499",
  "500–599", "600–699", "700–799", "800–899", "900–1000",
];

export default function ScoreComparison({ game, normalizedScore }: Props) {
  const [stats, setStats] = useState<ScoreStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function submit() {
      await postScore(game, normalizedScore);
      const result = await getScoreStats(game, normalizedScore);
      if (!cancelled) {
        setStats(result);
        setLoading(false);
      }
    }

    submit();
    return () => { cancelled = true; };
  }, [game, normalizedScore]);

  if (loading) {
    return <div className="score-comparison loading">Comparing scores…</div>;
  }

  if (!stats || stats.playerCount < MIN_PLAYERS) {
    return (
      <div className="score-comparison few-players">
        {stats
          ? `${stats.playerCount} player${stats.playerCount === 1 ? "" : "s"} today — need ${MIN_PLAYERS} for comparison`
          : "Score saved!"}
      </div>
    );
  }

  const maxCount = Math.max(...stats.histogram.map((b) => b.count), 1);

  return (
    <div className="score-comparison">
      <div className="sc-stats">
        <div className="sc-rank">
          <span className="sc-rank-value">{stats.rank}</span>
          <span className="sc-rank-sep">/</span>
          <span className="sc-rank-total">{stats.playerCount}</span>
          <span className="sc-rank-label">players</span>
        </div>
        <div className="sc-percentile">
          Better than <strong>{stats.percentile}%</strong>
        </div>
      </div>

      <div className="sc-histogram">
        <div className="sc-bars">
          {stats.histogram.map((b) => {
            const isPlayer = b.bucket === stats.playerBucket;
            const height = maxCount > 0 ? (b.count / maxCount) * 100 : 0;
            return (
              <div key={b.bucket} className="sc-bar-col">
                <div className="sc-bar-count">{b.count > 0 ? b.count : ""}</div>
                <div
                  className={`sc-bar ${isPlayer ? "sc-bar-you" : ""}`}
                  style={{ height: `${Math.max(height, 2)}%` }}
                />
                <div className="sc-bar-label">{BUCKET_LABELS[b.bucket]}</div>
              </div>
            );
          })}
        </div>
        <div className="sc-histogram-legend">
          <span className="sc-legend-you" /> You
        </div>
      </div>
    </div>
  );
}
