import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type { Country } from "./data/db";
import { formatPopulation, metricValue } from "./data/db";
import { generateRankingPuzzle } from "./data/generateRanking";
import { normalizeRankingScore } from "./data/scores";
import ScoreComparison from "./components/ScoreComparison";
import "./components/scoreComparison.css";
import Grenzhopping from "./grenzhopping/Grenzhopping";
import Imposter from "./imposter/Imposter";
import Battle from "./battle/Battle";
import "./App.css";

type GameTab = "ranking" | "grenzhopping" | "imposter" | "battle";
type GamePhase = "playing" | "result";

function App() {
  const [activeTab, setActiveTab] = useState<GameTab>("ranking");
  const [roundKeys, setRoundKeys] = useState({ ranking: 0, grenzhopping: 0, imposter: 0, battle: 0 });

  function newRound(game: GameTab) {
    setRoundKeys((k) => ({ ...k, [game]: k[game] + 1 }));
  }

  return (
    <div className="app-shell">
      <nav className="tab-bar">
        <button
          className={`tab ${activeTab === "ranking" ? "active" : ""}`}
          onClick={() => setActiveTab("ranking")}
        >
          📊 Ranking
        </button>
        <button
          className={`tab ${activeTab === "grenzhopping" ? "active" : ""}`}
          onClick={() => setActiveTab("grenzhopping")}
        >
          🗺️ Border Hop
        </button>
        <button
          className={`tab ${activeTab === "imposter" ? "active" : ""}`}
          onClick={() => setActiveTab("imposter")}
        >
          🕵️ Imposter
        </button>
        <button
          className={`tab ${activeTab === "battle" ? "active" : ""}`}
          onClick={() => setActiveTab("battle")}
        >
          ⚔️ Battle
        </button>
      </nav>

      {activeTab === "ranking" && <RankingGame key={roundKeys.ranking} onRestart={() => newRound("ranking")} />}
      {activeTab === "grenzhopping" && <Grenzhopping key={roundKeys.grenzhopping} onRestart={() => newRound("grenzhopping")} />}
      {activeTab === "imposter" && <Imposter key={roundKeys.imposter} onRestart={() => newRound("imposter")} />}
      {activeTab === "battle" && <Battle key={roundKeys.battle} onRestart={() => newRound("battle")} />}
    </div>
  );
}

function RankingGame({ onRestart }: { onRestart: () => void }) {
  const puzzle = useMemo(() => generateRankingPuzzle(), []);
  const { countries: presentationOrder, correctOrder, metric } = puzzle;

  const [placed, setPlaced] = useState<Country[]>([presentationOrder[0]]);
  const [currentIndex, setCurrentIndex] = useState(1);
  const [phase, setPhase] = useState<GamePhase>("playing");
  const [justPlacedIndex, setJustPlacedIndex] = useState<number | null>(0);

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverZone, setDragOverZone] = useState<number | null>(null);
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 });
  const dropZoneRefs = useRef<(HTMLDivElement | null)[]>([]);

  const current = presentationOrder[currentIndex];
  const totalCountries = presentationOrder.length;

  useEffect(() => {
    if (justPlacedIndex !== null) {
      const t = setTimeout(() => setJustPlacedIndex(null), 350);
      return () => clearTimeout(t);
    }
  }, [justPlacedIndex]);

  const handleInsert = useCallback(
    (position: number) => {
      const newPlaced = [...placed];
      newPlaced.splice(position, 0, current);
      setPlaced(newPlaced);
      setJustPlacedIndex(position);

      const nextIndex = currentIndex + 1;
      if (nextIndex >= totalCountries) {
        setPhase("result");
      }
      setCurrentIndex(nextIndex);
    },
    [placed, current, currentIndex, totalCountries]
  );

  const findDropZone = useCallback((clientY: number): number | null => {
    for (let i = 0; i < dropZoneRefs.current.length; i++) {
      const el = dropZoneRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientY >= rect.top - 10 && clientY <= rect.bottom + 10) {
        return i;
      }
    }
    let closest = null;
    let closestDist = Infinity;
    for (let i = 0; i < dropZoneRefs.current.length; i++) {
      const el = dropZoneRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const mid = (rect.top + rect.bottom) / 2;
      const dist = Math.abs(clientY - mid);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    }
    return closest;
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);
      setGhostPos({ x: e.clientX, y: e.clientY });
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      setGhostPos({ x: e.clientX, y: e.clientY });
      setDragOverZone(findDropZone(e.clientY));
    },
    [isDragging, findDropZone]
  );

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    if (dragOverZone !== null) {
      handleInsert(dragOverZone);
    }
    setIsDragging(false);
    setDragOverZone(null);
  }, [isDragging, dragOverZone, handleInsert]);

  if (phase === "result") {
    return <ResultScreen placed={placed} correctOrder={correctOrder} metric={metric} onRestart={onRestart} />;
  }

  const isLastCountry = currentIndex >= totalCountries;

  return (
    <div
      className="game"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <header className="header">
        <h1>Ranking</h1>
        <div className="meta">
          {metric.label} &mdash; {metric.direction}
        </div>
        <div className="progress">
          Country {Math.min(currentIndex + 1, totalCountries)} / {totalCountries}
        </div>
      </header>

      {!isLastCountry && (
        <>
          <div className="current-label">Drag to sort</div>
          <div
            className={`current-country ${isDragging ? "dragging" : ""}`}
            onPointerDown={handlePointerDown}
          >
            <span className="current-flag">{current.flag}</span>
            <span className="current-name">{current.name}</span>
          </div>
        </>
      )}

      {isDragging && (
        <div
          className="drag-ghost"
          style={{ left: ghostPos.x, top: ghostPos.y }}
        >
          <span className="current-flag">{current.flag}</span>
          <span className="current-name">{current.name}</span>
        </div>
      )}

      <div className="placed-list">
        <div className="direction-hint">&#9650; highest</div>

        {!isLastCountry && (
          <DropZone
            index={0}
            active={isDragging}
            isOver={dragOverZone === 0}
            ref={(el) => { dropZoneRefs.current[0] = el; }}
          />
        )}

        {placed.map((country, i) => (
          <div key={country.code}>
            <div
              className={`placed-card ${justPlacedIndex === i ? "just-placed" : ""}`}
            >
              <span className="placed-flag">{country.flag}</span>
              <span className="placed-name">{country.name}</span>
            </div>
            {!isLastCountry && (
              <DropZone
                index={i + 1}
                active={isDragging}
                isOver={dragOverZone === i + 1}
                ref={(el) => { dropZoneRefs.current[i + 1] = el; }}
              />
            )}
          </div>
        ))}

        <div className="direction-hint">&#9660; lowest</div>
      </div>
    </div>
  );
}

import { forwardRef } from "react";

const DropZone = forwardRef<
  HTMLDivElement,
  { index: number; active: boolean; isOver: boolean }
>(function DropZone({ active, isOver }, ref) {
  return (
    <div
      ref={ref}
      className={`drop-zone ${active ? "drag-active" : ""} ${isOver ? "drag-over" : ""}`}
    />
  );
});

function ResultScreen({
  placed,
  correctOrder,
  metric,
  onRestart,
}: {
  placed: Country[];
  correctOrder: Country[];
  metric: { key: string; label: string; direction: string; unit: string };
  onRestart: () => void;
}) {
  let score = 0;
  placed.forEach((country, i) => {
    if (country.code === correctOrder[i].code) score++;
  });

  function formatVal(c: Country): string {
    if (metric.key === "population") return formatPopulation(c.population);
    if (metric.key === "area") return c.area.toLocaleString() + " km²";
    const v = metricValue(c, metric.key);
    if (metric.unit) return v.toLocaleString() + " " + metric.unit;
    return v.toLocaleString();
  }

  return (
    <div className="game">
      <header className="header">
        <h1>Ranking</h1>
        <div className="meta">
          {metric.label} &mdash; {metric.direction}
        </div>
        <div className="score">
          {score} / {placed.length}
        </div>
      </header>

      <div className="result-grid">
        <div className="result-header">
          <span className="col-rank">#</span>
          <span className="col-yours">Your order</span>
          <span className="col-correct">Correct</span>
        </div>

        {placed.map((country, i) => {
          const isCorrect = country.code === correctOrder[i].code;
          return (
            <div
              key={i}
              className={`result-row ${isCorrect ? "correct" : "wrong"}`}
            >
              <span className="col-rank">{i + 1}</span>
              <span className="col-yours">
                {country.flag} {country.name}
                <span className="pop-value">
                  {formatVal(country)}
                </span>
              </span>
              <span className="col-correct">
                {correctOrder[i].flag} {correctOrder[i].name}
                <span className="pop-value">
                  {formatVal(correctOrder[i])}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <ScoreComparison game="ranking" normalizedScore={normalizeRankingScore(score, placed.length)} />
      <button className="restart-btn" onClick={onRestart}>
        Play again
      </button>
    </div>
  );
}

export default App;
