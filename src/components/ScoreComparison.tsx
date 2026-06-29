import { useEffect, useState } from "react";
import { postScore, getPercentile, type PercentileResult } from "../data/scores";

interface Props {
  game: "ranking" | "battle" | "imposter" | "grenzhopping";
  normalizedScore: number; // 0–1000
}

const MIN_PLAYERS = 1;

export default function ScoreComparison({ game, normalizedScore }: Props) {
  const [result, setResult] = useState<PercentileResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function submit() {
      await postScore(game, normalizedScore);
      const perc = await getPercentile(game, normalizedScore);
      if (!cancelled) {
        setResult(perc);
        setLoading(false);
      }
    }

    submit();
    return () => { cancelled = true; };
  }, [game, normalizedScore]);

  if (loading) {
    return <div className="score-comparison loading">Comparing scores…</div>;
  }

  if (!result || result.playerCount < MIN_PLAYERS) {
    return (
      <div className="score-comparison few-players">
        {result
          ? `${result.playerCount} player${result.playerCount === 1 ? "" : "s"} today — need ${MIN_PLAYERS} for comparison`
          : "Score saved!"}
      </div>
    );
  }

  return (
    <div className="score-comparison">
      <div className="percentile-text">
        Better than <strong>{result.percentile}%</strong> of players today
      </div>
      <div className="player-count">{result.playerCount} players</div>
    </div>
  );
}
