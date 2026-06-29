import { useState, useMemo } from "react";
import type { ImposterCard } from "../data/generateImposter";
import { generateImposterPuzzle } from "../data/generateImposter";
import "./imposter.css";

type RoundPhase = "guessing" | "feedback";
type GamePhase = "playing" | "result";

export default function Imposter({ onRestart }: { onRestart?: () => void }) {
  const rounds = useMemo(() => generateImposterPuzzle(), []);
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundPhase, setRoundPhase] = useState<RoundPhase>("guessing");
  const [gamePhase, setGamePhase] = useState<GamePhase>("playing");
  const [chosenCode, setChosenCode] = useState<string | null>(null);
  const [results, setResults] = useState<boolean[]>([]);

  const round = rounds[roundIndex];
  const totalRounds = rounds.length;

  function handlePick(card: ImposterCard) {
    if (roundPhase !== "guessing") return;
    setChosenCode(card.code);
    setRoundPhase("feedback");
    setResults([...results, card.isLiar]);
  }

  function handleNext() {
    const next = roundIndex + 1;
    if (next >= totalRounds) {
      setGamePhase("result");
    } else {
      setRoundIndex(next);
      setRoundPhase("guessing");
      setChosenCode(null);
    }
  }

  function handleRestart() {
    if (onRestart) {
      onRestart();
    }
  }

  if (gamePhase === "result") {
    const score = results.filter(Boolean).length;
    return (
      <div className="imp-game">
        <header className="imp-header">
          <h1>Imposter</h1>
          <div className="imp-score-final">{score} / {totalRounds}</div>
        </header>

        <div className="imp-result-rounds">
          {rounds.map((r, i) => (
            <div key={i} className={`imp-result-row ${results[i] ? "correct" : "wrong"}`}>
              <span className="imp-result-icon">{results[i] ? "🟩" : "🟥"}</span>
              <span className="imp-result-cat">{r.category}</span>
            </div>
          ))}
        </div>

        <button className="imp-btn-primary" onClick={handleRestart}>
          Play again
        </button>
      </div>
    );
  }

  const liarCard = round.cards.find((c) => c.isLiar)!;

  return (
    <div className="imp-game">
      <header className="imp-header">
        <h1>Imposter</h1>
        <div className="imp-status">
          <span>Round {roundIndex + 1} / {totalRounds}</span>
          <span className="imp-status-sep">|</span>
          <span>{results.filter(Boolean).length} pts</span>
        </div>
      </header>

      <div className="imp-question">{round.category}</div>

      <div className="imp-cards">
        {round.cards.map((card) => {
          let cardClass = "imp-card";
          if (roundPhase === "feedback") {
            if (card.isLiar && chosenCode === card.code) {
              cardClass += " imp-correct";
            } else if (card.isLiar && chosenCode !== card.code) {
              cardClass += " imp-reveal";
            } else if (!card.isLiar && chosenCode === card.code) {
              cardClass += " imp-wrong";
            }
          }

          return (
            <button
              key={card.code}
              className={cardClass}
              onClick={() => handlePick(card)}
              disabled={roundPhase === "feedback"}
            >
              <div className="imp-card-top">
                <span className="imp-card-flag">{card.flag}</span>
                <span className="imp-card-name">{card.name}</span>
              </div>
              <div className="imp-card-fact">
                <span className="imp-card-label">{card.label}</span>
                <span className="imp-card-value">{card.value}</span>
              </div>
              {roundPhase === "feedback" && card.isLiar && card.correctValue && (
                <div className="imp-card-correction">
                  Correct: {card.correctValue}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {roundPhase === "feedback" && (
        <button className="imp-btn-primary" onClick={handleNext}>
          {roundIndex + 1 < totalRounds ? "Next" : "Results"}
        </button>
      )}
    </div>
  );
}
