import { useState, useMemo } from "react";
import { generateBattlePuzzle } from "../data/generateBattle";
import "./battle.css";

type RoundPhase = "choosing" | "feedback";
type GamePhase = "playing" | "result";

export default function Battle({ onRestart }: { onRestart?: () => void }) {
  const puzzle = useMemo(() => generateBattlePuzzle(), []);
  const { chain, config } = puzzle;

  const [champion, setChampion] = useState(chain[0]);
  const [challengerIndex, setChallengerIndex] = useState(1);
  const [roundPhase, setRoundPhase] = useState<RoundPhase>("choosing");
  const [gamePhase, setGamePhase] = useState<GamePhase>("playing");
  const [chosenCode, setChosenCode] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);

  const totalRounds = chain.length - 1;
  const roundIndex = challengerIndex - 1;
  const challenger = chain[challengerIndex];

  const champValue = config.getValue(champion);
  const challValue = config.getValue(challenger);

  function handlePick(code: string) {
    if (roundPhase !== "choosing") return;
    setChosenCode(code);
    setRoundPhase("feedback");
    const higher = champValue >= challValue ? champion : challenger;
    setResults([...results, code === higher.code]);
  }

  function handleNext() {
    setChampion(challenger);
    const nextIdx = challengerIndex + 1;
    if (nextIdx >= chain.length) {
      setGamePhase("result");
    } else {
      setChallengerIndex(nextIdx);
      setRoundPhase("choosing");
      setChosenCode(null);
    }
  }

  function handleRestart() {
    if (onRestart) onRestart();
  }

  if (gamePhase === "result") {
    const score = results.filter(Boolean).length;
    return (
      <div className="bat-game">
        <header className="bat-header">
          <h1>Battle</h1>
          <div className="bat-score-final">{score} / {totalRounds}</div>
          <div className="bat-category-label">{config.label}</div>
        </header>
        <div className="bat-result-grid">
          {results.map((correct, i) => (
            <span key={i} className="bat-result-dot">{correct ? "🟩" : "🟥"}</span>
          ))}
        </div>
        <button className="bat-btn-primary" onClick={handleRestart}>
          Play again
        </button>
      </div>
    );
  }

  const higher = champValue >= challValue ? champion : challenger;

  function cardClass(code: string) {
    if (roundPhase !== "feedback") return "bat-card";
    const isHigher = code === higher.code;
    const wasChosen = code === chosenCode;
    if (wasChosen && isHigher) return "bat-card bat-correct";
    if (wasChosen && !isHigher) return "bat-card bat-wrong";
    if (!wasChosen && isHigher) return "bat-card bat-reveal";
    return "bat-card";
  }

  return (
    <div className="bat-game">
      <header className="bat-header">
        <h1>Battle</h1>
        <div className="bat-status">
          <span>Round {roundIndex + 1} / {totalRounds}</span>
          <span className="bat-status-sep">|</span>
          <span>{results.filter(Boolean).length} pts</span>
        </div>
      </header>

      <div className="bat-question">{config.question}</div>

      <div className="bat-arena">
        <button
          className={cardClass(champion.code)}
          onClick={() => handlePick(champion.code)}
          disabled={roundPhase === "feedback"}
        >
          <span className="bat-card-flag">{champion.flag}</span>
          <span className="bat-card-name">{champion.name}</span>
          <span className="bat-card-value">{config.format(champValue)}</span>
        </button>

        <div className="bat-vs">VS</div>

        <button
          className={cardClass(challenger.code)}
          onClick={() => handlePick(challenger.code)}
          disabled={roundPhase === "feedback"}
        >
          <span className="bat-card-flag">{challenger.flag}</span>
          <span className="bat-card-name">{challenger.name}</span>
          {roundPhase === "feedback" ? (
            <span className="bat-card-value">{config.format(challValue)}</span>
          ) : (
            <span className="bat-card-value bat-hidden">???</span>
          )}
        </button>
      </div>

      {roundPhase === "feedback" && (
        <button className="bat-btn-primary" onClick={handleNext}>
          {roundIndex + 1 < totalRounds ? "Next" : "Results"}
        </button>
      )}
    </div>
  );
}
