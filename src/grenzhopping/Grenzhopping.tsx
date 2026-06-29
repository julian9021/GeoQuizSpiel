import { useState, useRef, useEffect, useMemo } from "react";
import type { Country } from "../data/db";
import { ALL_COUNTRIES, BY_CODE, BORDER_GRAPH } from "../data/db";
import { generateGrenzhoppingPuzzle } from "../data/generateGrenzhopping";
import ChainMap from "./ChainMap";
import "./grenzhopping.css";

type Phase = "playing" | "result";

function starsForDelta(delta: number): number {
  if (delta === 0) return 3;
  if (delta === 1) return 2;
  if (delta === 2) return 1;
  return 0;
}

function findCountry(input: string): Country | null {
  const q = input.trim().toLowerCase();
  if (!q) return null;
  for (const c of ALL_COUNTRIES) {
    if (c.code.toLowerCase() === q) return c;
  }
  for (const c of ALL_COUNTRIES) {
    if (c.name.toLowerCase() === q) return c;
  }
  for (const c of ALL_COUNTRIES) {
    if (c.name.toLowerCase().startsWith(q)) return c;
  }
  return null;
}

function getAutocompleteSuggestions(input: string): Country[] {
  const q = input.trim().toLowerCase();
  if (!q) return [];
  return ALL_COUNTRIES.filter(
    (c) =>
      c.borders.length > 0 &&
      (c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q))
  ).slice(0, 6);
}

export default function Grenzhopping({ onRestart }: { onRestart?: () => void }) {
  const puzzle = useMemo(() => generateGrenzhoppingPuzzle(), []);
  const startCountry = BY_CODE[puzzle.startCode];
  const endCountry = BY_CODE[puzzle.endCode];
  const optimal = { distance: puzzle.optimalDistance, path: puzzle.optimalPath };

  const [chain, setChain] = useState<Country[]>([startCountry]);
  const [phase, setPhase] = useState<Phase>("playing");
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<Country[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const chainEnd = chain[chain.length - 1];
  const chainCodes = new Set(chain.map((c) => c.code));

  useEffect(() => {
    if (input.trim()) {
      setSuggestions(getAutocompleteSuggestions(input));
      setSelectedIdx(-1);
    } else {
      setSuggestions([]);
    }
  }, [input]);

  function tryAdd(country: Country) {
    setError(null);
    const neighbors = BORDER_GRAPH[chainEnd.code] ?? [];
    if (!neighbors.includes(country.code)) {
      setError(`${country.name} doesn't border ${chainEnd.name}`);
      return;
    }
    if (chainCodes.has(country.code)) {
      setError(`${country.name} is already in your chain`);
      return;
    }
    const newChain = [...chain, country];
    setChain(newChain);
    setInput("");
    setSuggestions([]);

    if (country.code === puzzle.endCode) {
      setPhase("result");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIdx >= 0 && selectedIdx < suggestions.length) {
      tryAdd(suggestions[selectedIdx]);
      return;
    }
    const country = findCountry(input);
    if (!country) {
      setError("Country not found");
      return;
    }
    tryAdd(country);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, -1));
    }
  }

  function handleUndo() {
    if (chain.length <= 1) return;
    setChain(chain.slice(0, -1));
    setError(null);
  }

  function handleRestart() {
    if (onRestart) {
      onRestart();
    }
  }

  if (phase === "result") {
    const steps = chain.length - 1;
    const delta = steps - optimal.distance;
    const stars = starsForDelta(delta);

    return (
      <div className="gh-game">
        <header className="gh-header">
          <h1>Border Hop</h1>
          <div className="gh-route">
            {startCountry.flag} {startCountry.name} → {endCountry.flag}{" "}
            {endCountry.name}
          </div>
        </header>

        <div className="gh-result-score">
          <div className="gh-stars">{"⭐".repeat(stars)}{"☆".repeat(3 - stars)}</div>
          <div className="gh-steps">
            {steps} steps (optimal: {optimal.distance})
          </div>
          {delta === 0 && <div className="gh-perfect">Perfect!</div>}
        </div>

        <ChainMap
          chainCodes={chain.map((c) => c.code)}
          goalCode={puzzle.endCode}
        />

        <div className="gh-result-section">
          <div className="gh-result-label">Your route</div>
          <div className="gh-chain">
            {chain.map((c, i) => (
              <div key={i} className="gh-chain-item">
                <span className="gh-chain-flag">{c.flag}</span>
                <span className="gh-chain-name">{c.name}</span>
                {i < chain.length - 1 && <span className="gh-chain-arrow">↓</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="gh-result-section">
          <div className="gh-result-label">Optimal route</div>
          <div className="gh-chain gh-chain-optimal">
            {optimal.path.map((code, i) => {
              const c = BY_CODE[code];
              return (
                <div key={i} className="gh-chain-item">
                  <span className="gh-chain-flag">{c.flag}</span>
                  <span className="gh-chain-name">{c.name}</span>
                  {i < optimal.path.length - 1 && (
                    <span className="gh-chain-arrow">↓</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button className="gh-restart-btn" onClick={handleRestart}>
          Play again
        </button>
      </div>
    );
  }

  return (
    <div className="gh-game">
      <header className="gh-header">
        <h1>Border Hop</h1>
        <div className="gh-route">
          {startCountry.flag} {startCountry.name} → {endCountry.flag}{" "}
          {endCountry.name}
        </div>
        <div className="gh-step-count">Steps: {chain.length - 1}</div>
      </header>

      {/* Chain */}
      <div className="gh-chain">
        {chain.map((c, i) => (
          <div
            key={i}
            className={`gh-chain-item ${i === 0 ? "start" : ""} ${
              c.code === puzzle.endCode ? "end" : ""
            }`}
          >
            <span className="gh-chain-flag">{c.flag}</span>
            <span className="gh-chain-name">{c.name}</span>
            {i < chain.length - 1 && <span className="gh-chain-arrow">↓</span>}
          </div>
        ))}
        {chain[chain.length - 1].code !== puzzle.endCode && (
          <div className="gh-chain-item goal">
            <span className="gh-chain-flag">{endCountry.flag}</span>
            <span className="gh-chain-name">{endCountry.name}</span>
            <span className="gh-goal-label">Goal</span>
          </div>
        )}
      </div>

      {/* Map */}
      <ChainMap
        chainCodes={chain.map((c) => c.code)}
        goalCode={puzzle.endCode}
      />

      {/* Input area */}
      <div className="gh-input-area">
        {(() => {
          const availableNeighbors = (BORDER_GRAPH[chainEnd.code] ?? []).filter(
            (code) => !chainCodes.has(code)
          );
          const isStuck = availableNeighbors.length === 0;

          if (isStuck) {
            return (
              <>
                <div className="gh-stuck">
                  Dead end! {chainEnd.name} has no unvisited neighbors.
                </div>
                <button className="gh-undo-btn" onClick={handleUndo}>
                  ↩ Undo last step
                </button>
              </>
            );
          }

          return (
            <>
              <form onSubmit={handleSubmit} className="gh-form">
                <input
                  ref={inputRef}
                  type="text"
                  className="gh-input"
                  placeholder={`Neighbor of ${chainEnd.name}…`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <button type="submit" className="gh-submit-btn">
                  Add
                </button>
              </form>

              {suggestions.length > 0 && (
                <div className="gh-suggestions">
                  {suggestions.map((c, i) => (
                    <button
                      key={c.code}
                      className={`gh-suggestion ${i === selectedIdx ? "selected" : ""}`}
                      onClick={() => tryAdd(c)}
                      onMouseEnter={() => setSelectedIdx(i)}
                    >
                      <span>{c.flag}</span> {c.name}
                    </button>
                  ))}
                </div>
              )}

              {error && <div className="gh-error">{error}</div>}

              {chain.length > 1 && (
                <button className="gh-undo-btn" onClick={handleUndo}>
                  ↩ Undo
                </button>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
