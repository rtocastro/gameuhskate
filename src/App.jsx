import React, { useMemo, useState } from "react";
import "./App.css";

const LETTERS = ["S", "K", "A", "T", "E"];
const MAX_PLAYERS = 10;

 
function playSound(type = "click") {
  const audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  const sounds = {
    click: 220,
    flip: 440,
    win: 660,
    miss: 140,
  };

  oscillator.frequency.value = sounds[type] || 220;
  oscillator.type = "square";

  gain.gain.setValueAtTime(0.05, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.12);

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.12);
}

function shuffle(array) {
  return [...array]
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

function createPlayer(name, order = 0) {
  return {
    id: crypto.randomUUID(),
    name: name.trim() || `Skater ${order + 1}`,
    letters: 0,
    eliminated: false,
    eliminatedPlace: null,
    order,
  };
}

function App() {
  const [screen, setScreen] = useState("landing");
  const [mode, setMode] = useState(null); // coin | boards
  const [names, setNames] = useState(["", ""]);
  const [playerCount, setPlayerCount] = useState(2);
  const [players, setPlayers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [setterId, setSetterId] = useState(null);
  const [attemptQueue, setAttemptQueue] = useState([]);
  const [winner, setWinner] = useState(null);
  const [placements, setPlacements] = useState([]);
  const [coinAssignments, setCoinAssignments] = useState(null);
  const [coinWinnerId, setCoinWinnerId] = useState(null);
   const [isTransitioning, setIsTransitioning] = useState(false);



  const activePlayers = useMemo(
    () => players.filter((player) => !player.eliminated),
    [players]
  );

  const currentPlayer = players[currentIndex];
  const settingTrick = !setterId;
  const attemptingTrick = Boolean(setterId);
  const setter = players.find((player) => player.id === setterId);

  function resetAll() {
    setScreen("landing");
    setMode(null);
    setNames(["", ""]);
    setPlayerCount(2);
    setPlayers([]);
    setCurrentIndex(0);
    setSetterId(null);
    setAttemptQueue([]);
    setWinner(null);
    setPlacements([]);
    setCoinAssignments(null);
    setCoinWinnerId(null);
  }

  function goToScreen(nextScreen) {
  setIsTransitioning(true);

  setTimeout(() => {
    setScreen(nextScreen);
  }, 120);

  setTimeout(() => {
    setIsTransitioning(false);
  }, 420);
}

  function chooseMode(nextMode) {
    playSound("click");


    setMode(nextMode);
    if (nextMode === "coin") {
      setNames(["", ""]);
      goToScreen("coinNames");
    } else {
      setPlayerCount(2);
      setNames(["", ""]);
      goToScreen("boardCount");
    }
  }

  function confirmCoinNames() {
    const nextPlayers = names.slice(0, 2).map((name, index) => createPlayer(name, index));
    const assignments = Math.random() < 0.5
      ? { heads: nextPlayers[0].id, tails: nextPlayers[1].id }
      : { heads: nextPlayers[1].id, tails: nextPlayers[0].id };

    setPlayers(nextPlayers);
    setCoinAssignments(assignments);
    goToScreen("coinFlip");
  }

  function flipCoin() {

    playSound("flip");

    const result = Math.random() < 0.5 ? "heads" : "tails";
    const winningId = coinAssignments[result];
    const winningIndex = players.findIndex((player) => player.id === winningId);

    setCoinWinnerId(winningId);
    setCurrentIndex(winningIndex);
    goToScreen("coinResult");

    setTimeout(() => {
      setScreen("game");
    }, 2500);
  }

  function confirmBoardCount() {
    setNames(Array.from({ length: playerCount }, () => ""));
    goToScreen("boardNames");
  }

  function confirmBoardNames() {
    const namedPlayers = names.map((name, index) => createPlayer(name, index));
    const randomized = shuffle(namedPlayers).map((player, index) => ({
      ...player,
      order: index,
    }));

    setPlayers(randomized);
    setCurrentIndex(0);
    goToScreen("boardOrder");

    setTimeout(() => {
      goToScreen("game");
    }, 3000);
  }

  function nextActiveIndex(fromIndex = currentIndex, excludedIds = []) {
    const total = players.length;
    for (let offset = 1; offset <= total; offset++) {
      const nextIndex = (fromIndex + offset) % total;
      const player = players[nextIndex];
      if (player && !player.eliminated && !excludedIds.includes(player.id)) {
        return nextIndex;
      }
    }
    return fromIndex;
  }

  function startAttemptRound(setterPlayer) {
    const queue = players
      .filter((player) => !player.eliminated && player.id !== setterPlayer.id)
      .sort((a, b) => a.order - b.order)
      .map((player) => player.id);

    setSetterId(setterPlayer.id);
    setAttemptQueue(queue);
    const firstAttemptIndex = players.findIndex((player) => player.id === queue[0]);
    setCurrentIndex(firstAttemptIndex);
  }

  function setterMissed() {
    playSound("miss");

    setCurrentIndex(nextActiveIndex());
  }

  function setterLanded() {
    playSound("click");

    startAttemptRound(currentPlayer);
  }

  function resolveAttempt(success) {
    playSound(success ? "click" : "miss");

    const attemptingPlayer = currentPlayer;
    let updatedPlayers = players;
    let updatedPlacements = placements;

    if (!success) {
      updatedPlayers = players.map((player) => {
        if (player.id !== attemptingPlayer.id) return player;
        const newLetters = Math.min(player.letters + 1, LETTERS.length);
        const nowOut = newLetters >= LETTERS.length;
        return {
          ...player,
          letters: newLetters,
          eliminated: nowOut,
          eliminatedPlace: nowOut ? null : player.eliminatedPlace,
        };
      });

      const eliminatedPlayer = updatedPlayers.find(
        (player) => player.id === attemptingPlayer.id && player.eliminated && player.eliminatedPlace === null
      );

      if (eliminatedPlayer) {
        updatedPlacements = [
          {
            ...eliminatedPlayer,
            eliminatedPlace: updatedPlayers.filter((player) => !player.eliminated).length + 1,
          },
          ...updatedPlacements,
        ];

        updatedPlayers = updatedPlayers.map((player) =>
          player.id === eliminatedPlayer.id
            ? { ...player, eliminatedPlace: updatedPlayers.filter((p) => !p.eliminated).length + 1 }
            : player
        );
      }
    }

    const remaining = updatedPlayers.filter((player) => !player.eliminated);

    setPlayers(updatedPlayers);
    setPlacements(updatedPlacements);

    if (remaining.length === 1) {
      setWinner(remaining[0]);
      setSetterId(null);
      setAttemptQueue([]);
      playSound("win");
      goToScreen("winner");
      return;
    }

    const remainingQueue = attemptQueue.filter((id) => id !== attemptingPlayer.id);

    if (remainingQueue.length > 0) {
      const nextId = remainingQueue[0];
      const nextIndex = updatedPlayers.findIndex((player) => player.id === nextId);
      setAttemptQueue(remainingQueue);
      setCurrentIndex(nextIndex);
      return;
    }

    const setterIndex = updatedPlayers.findIndex((player) => player.id === setterId);
    const nextIndex = nextActiveIndex(setterIndex, []);

    setSetterId(null);
    setAttemptQueue([]);
    setCurrentIndex(nextIndex);
  }

  function updateName(index, value) {
    setNames((current) => current.map((name, i) => (i === index ? value : name)));
  }

  return (
    <main className={`app screen-${screen} ${isTransitioning ? "isTransitioning" : ""}`}>
      {screen === "landing" && (
        <section
          className="landing"
          onClick={() => {
            playSound("click");
            goToScreen("modeSelect");;
          }}
        >
          <div className="heroLoop">
            <div className="scanlines" />
            <h1>GAME<br />-UH-<br />SKATE</h1>
            <p>Tap anywhere to begin</p>
          </div>
        </section>
      )}

      {screen === "modeSelect" && (
        <section className="modeSelect portraitScreen">
          <button className="modeCard coinCard" onClick={() => chooseMode("coin")}>
            <span className="miniLabel">1 vs 1</span>
            <strong>Flip Coin</strong>
            <em>Heads or tails decides who sets first.</em>
          </button>

          <button className="modeCard boardCard" onClick={() => chooseMode("boards")}>
            <span className="miniLabel">2–10 Players</span>
            <strong>Flip Boards</strong>
            <em>Randomized order for a full session.</em>
          </button>
        </section>
      )}

      {screen === "coinNames" && (
        <section className="horizontalScreen setupScreen">
          <h2>Enter Skaters</h2>
          <div className="nameGrid twoCol">
            {[0, 1].map((index) => (
              <label key={index}>
                Player {index + 1}
                <input value={names[index]} onChange={(e) => updateName(index, e.target.value)} placeholder={`Skater ${index + 1}`} />
              </label>
            ))}
          </div>
          <button className="primaryButton" onClick={confirmCoinNames}>Confirm Names</button>
        </section>
      )}

      {screen === "coinFlip" && (
        <section className="horizontalScreen centerScreen">
          <h2>Coin Flip</h2>
          <div className="coinAssignments">
            <p><strong>Heads:</strong> {players.find((p) => p.id === coinAssignments?.heads)?.name}</p>
            <p><strong>Tails:</strong> {players.find((p) => p.id === coinAssignments?.tails)?.name}</p>
          </div>
          <button className="coinButton" onClick={flipCoin}>Flip Coin</button>
        </section>
      )}

      {screen === "coinResult" && (
        <section className="horizontalScreen centerScreen resultScreen">
          <p>First Set Goes To</p>
          <h2>{players.find((player) => player.id === coinWinnerId)?.name}</h2>
        </section>
      )}

      {screen === "boardCount" && (
        <section className="horizontalScreen setupScreen">
          <h2>How Many Joining?</h2>
          <input
            className="numberInput"
            type="number"
            min="2"
            max={MAX_PLAYERS}
            value={playerCount}
            onChange={(e) => setPlayerCount(Math.max(2, Math.min(MAX_PLAYERS, Number(e.target.value))))}
          />
          <button className="primaryButton" onClick={confirmBoardCount}>Confirm Count</button>
        </section>
      )}

      {screen === "boardNames" && (
        <section className="horizontalScreen setupScreen scrollable">
          <h2>Enter Skater Names</h2>
          <div className="nameGrid">
            {names.map((name, index) => (
              <label key={index}>
                Player {index + 1}
                <input value={name} onChange={(e) => updateName(index, e.target.value)} placeholder={`Skater ${index + 1}`} />
              </label>
            ))}
          </div>
          <button className="primaryButton" onClick={confirmBoardNames}>Flip Boards</button>
        </section>
      )}

      {screen === "boardOrder" && (
        <section className="horizontalScreen centerScreen orderScreen">
          <h2>Board Order</h2>
          <ol>
            {players.map((player, index) => <li key={player.id}>{index + 1}. {player.name}</li>)}
          </ol>
        </section>
      )}

      {screen === "game" && currentPlayer && (
        <section className="horizontalScreen gameScreen">
          <aside className="scoreboard">
            {players.map((player, index) => (
              <div key={player.id} className={`scoreRow ${player.eliminated ? "out" : ""} ${index === currentIndex ? "active" : ""}`}>
                <span>{player.name}</span>
                <SkateLetters count={player.letters} />
              </div>
            ))}
          </aside>

          <section className="turnPanel">
            <p className="turnLabel">Current Turn</p>
            <h2>{currentPlayer.name}</h2>

            {settingTrick && (
              <div className="actionPanel">
                <p>Try to set a trick.</p>
                <button className="successButton" onClick={setterLanded}>Landed / Set Trick</button>
                <button className="missButton" onClick={setterMissed}>Did Not Land</button>
              </div>
            )}

            {attemptingTrick && (
              <div className="actionPanel">
                <p>Attempting <strong>{setter?.name}</strong>'s trick.</p>
                <button className="successButton" onClick={() => resolveAttempt(true)}>Landed Attempt</button>
                <button className="missButton" onClick={() => resolveAttempt(false)}>Missed Attempt</button>
              </div>
            )}
          </section>
        </section>
      )}

      {screen === "winner" && winner && (
        <section className="horizontalScreen winnerScreen">
          <p>Game Winner</p>
          <h1>{winner.name}</h1>
          <h2>You Won</h2>

          {mode === "boards" && placements.length > 0 && (
            <div className="placements">
              {placements.slice(0, 3).map((player, index) => (
                <p key={player.id}>{index + 2}{index === 0 ? "nd" : index === 1 ? "rd" : "th"} Place: {player.name}</p>
              ))}
            </div>
          )}

          <div className="winnerButtons">
            <button className="primaryButton" onClick={resetAll}>Play Another Game?</button>
            <a className="linkButton" href="https://www.instagram.com/witchcountyspellcasters/" target="_blank" rel="noreferrer" onClick={resetAll}>
              WCSC
            </a>
          </div>
        </section>
      )}


    </main>
  );
}

function SkateLetters({ count }) {
  return (
    <span className="letters" aria-label={`${count} letters`}>
      {LETTERS.map((letter, index) => (
        <span key={letter} className={index < count ? "crossed" : ""}>{letter}</span>
      ))}
    </span>
  );
}


export default App;
