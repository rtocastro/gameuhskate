import React, { useMemo, useState } from "react";

const LETTERS = ["S", "K", "A", "T", "E"];
const MAX_PLAYERS = 10;

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

  function chooseMode(nextMode) {
    setMode(nextMode);
    if (nextMode === "coin") {
      setNames(["", ""]);
      setScreen("coinNames");
    } else {
      setPlayerCount(2);
      setNames(["", ""]);
      setScreen("boardCount");
    }
  }

  function confirmCoinNames() {
    const nextPlayers = names.slice(0, 2).map((name, index) => createPlayer(name, index));
    const assignments = Math.random() < 0.5
      ? { heads: nextPlayers[0].id, tails: nextPlayers[1].id }
      : { heads: nextPlayers[1].id, tails: nextPlayers[0].id };

    setPlayers(nextPlayers);
    setCoinAssignments(assignments);
    setScreen("coinFlip");
  }

  function flipCoin() {
    const result = Math.random() < 0.5 ? "heads" : "tails";
    const winningId = coinAssignments[result];
    const winningIndex = players.findIndex((player) => player.id === winningId);

    setCoinWinnerId(winningId);
    setCurrentIndex(winningIndex);
    setScreen("coinResult");

    setTimeout(() => {
      setScreen("game");
    }, 2500);
  }

  function confirmBoardCount() {
    setNames(Array.from({ length: playerCount }, () => ""));
    setScreen("boardNames");
  }

  function confirmBoardNames() {
    const namedPlayers = names.map((name, index) => createPlayer(name, index));
    const randomized = shuffle(namedPlayers).map((player, index) => ({
      ...player,
      order: index,
    }));

    setPlayers(randomized);
    setCurrentIndex(0);
    setScreen("boardOrder");

    setTimeout(() => {
      setScreen("game");
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
    setCurrentIndex(nextActiveIndex());
  }

  function setterLanded() {
    startAttemptRound(currentPlayer);
  }

  function resolveAttempt(success) {
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
      setScreen("winner");
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
    <main className={`app screen-${screen}`}>
      {screen === "landing" && (
        <section className="landing" onClick={() => setScreen("modeSelect")}>
          <div className="heroLoop">
            <div className="scanlines" />
            <h1>SKATE<br />TRACKER</h1>
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
              Click Here
            </a>
          </div>
        </section>
      )}

      <style>{styles}</style>
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

const styles = `
  * { box-sizing: border-box; }
  body { margin: 0; background: #080808; color: #f6f1e8; font-family: Inter, system-ui, sans-serif; }
  button, input, a { font: inherit; }
  button { cursor: pointer; }
  .app { min-height: 100vh; overflow: hidden; background: radial-gradient(circle at top, #252525, #050505 65%); }
  .landing { min-height: 100vh; display: grid; place-items: center; text-align: center; cursor: pointer; }
  .heroLoop { position: relative; width: 100%; min-height: 100vh; display: grid; place-items: center; padding: 2rem; background: linear-gradient(135deg, #111, #242424, #0a0a0a); overflow: hidden; }
  .heroLoop:before { content: ""; position: absolute; inset: -30%; background: conic-gradient(from 90deg, transparent, rgba(255,255,255,.12), transparent); animation: spin 8s linear infinite; }
  .scanlines { position: absolute; inset: 0; background: repeating-linear-gradient(to bottom, rgba(255,255,255,.04), rgba(255,255,255,.04) 1px, transparent 1px, transparent 5px); mix-blend-mode: overlay; }
  .heroLoop h1 { position: relative; font-size: clamp(3rem, 16vw, 9rem); line-height: .85; letter-spacing: -.08em; margin: 0; text-transform: uppercase; }
  .heroLoop p { position: absolute; bottom: 2.5rem; letter-spacing: .08em; text-transform: uppercase; opacity: .75; }
  .portraitScreen { min-height: 100vh; display: grid; grid-template-rows: 1fr 1fr; gap: 1rem; padding: 1rem; }
  .modeCard { border: 1px solid rgba(255,255,255,.15); color: #f6f1e8; border-radius: 28px; padding: 2rem; display: flex; flex-direction: column; justify-content: center; align-items: flex-start; text-align: left; background: rgba(255,255,255,.06); box-shadow: 0 18px 70px rgba(0,0,0,.4); transition: transform .25s ease, background .25s ease; }
  .modeCard:hover { transform: scale(.98); background: rgba(255,255,255,.1); }
  .modeCard strong { font-size: clamp(2.5rem, 12vw, 6rem); text-transform: uppercase; line-height: .9; letter-spacing: -.06em; }
  .modeCard em { margin-top: 1rem; opacity: .75; font-style: normal; }
  .miniLabel { margin-bottom: 1rem; text-transform: uppercase; letter-spacing: .14em; opacity: .65; }
  .horizontalScreen { min-height: 100vh; display: grid; padding: 1.25rem; animation: pageIn .45s ease both; }
  .setupScreen, .centerScreen { place-items: center; text-align: center; gap: 1rem; }
  .setupScreen h2, .centerScreen h2 { font-size: clamp(2.5rem, 8vw, 5.5rem); line-height: .9; margin: 0; text-transform: uppercase; letter-spacing: -.05em; }
  .nameGrid { width: min(950px, 100%); display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: .9rem; }
  .twoCol { grid-template-columns: repeat(2, minmax(180px, 1fr)); }
  label { display: grid; gap: .4rem; text-align: left; color: rgba(246,241,232,.75); text-transform: uppercase; font-size: .78rem; letter-spacing: .1em; }
  input { width: 100%; border: 1px solid rgba(255,255,255,.14); background: rgba(255,255,255,.08); color: #fff; border-radius: 16px; padding: 1rem; outline: none; }
  .numberInput { max-width: 220px; font-size: 3rem; text-align: center; }
  .primaryButton, .coinButton, .successButton, .missButton, .linkButton { border: 0; border-radius: 999px; padding: 1rem 1.4rem; text-decoration: none; color: #090909; background: #f6f1e8; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
  .coinButton { width: 150px; height: 150px; border-radius: 50%; animation: coinPulse 1.5s ease infinite; }
  .coinAssignments { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; }
  .resultScreen h2 { font-size: clamp(3rem, 12vw, 8rem); }
  .orderScreen ol { columns: 2; list-style-position: inside; font-size: 1.2rem; text-align: left; }
  .gameScreen { grid-template-columns: minmax(260px, 38%) 1fr; gap: 1rem; align-items: stretch; }
  .scoreboard, .turnPanel { border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.06); border-radius: 28px; padding: 1rem; }
  .scoreboard { display: grid; gap: .5rem; align-content: start; overflow: auto; }
  .scoreRow { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .8rem; border-radius: 18px; background: rgba(255,255,255,.06); }
  .scoreRow.active { outline: 2px solid rgba(255,255,255,.65); }
  .scoreRow.out { filter: grayscale(1); opacity: .35; }
  .letters { display: inline-flex; gap: .15rem; font-size: 1.35rem; font-weight: 900; letter-spacing: .03em; }
  .crossed { position: relative; opacity: .45; }
  .crossed:after { content: ""; position: absolute; left: -2px; right: -2px; top: 50%; height: 3px; background: currentColor; transform: rotate(-12deg); }
  .turnPanel { display: grid; place-items: center; text-align: center; }
  .turnLabel { text-transform: uppercase; letter-spacing: .18em; opacity: .65; }
  .turnPanel h2 { font-size: clamp(3rem, 10vw, 8rem); line-height: .85; margin: 0; text-transform: uppercase; letter-spacing: -.07em; }
  .actionPanel { display: flex; flex-wrap: wrap; justify-content: center; gap: .8rem; }
  .successButton { background: #f6f1e8; }
  .missButton { background: #2a2a2a; color: #f6f1e8; border: 1px solid rgba(255,255,255,.16); }
  .winnerScreen { place-items: center; text-align: center; background: radial-gradient(circle, rgba(255,255,255,.16), transparent 55%); }
  .winnerScreen h1 { font-size: clamp(4rem, 16vw, 11rem); line-height: .78; margin: 0; letter-spacing: -.09em; text-transform: uppercase; }
  .winnerScreen h2 { margin: 0; text-transform: uppercase; letter-spacing: .2em; }
  .winnerButtons { display: flex; gap: .8rem; flex-wrap: wrap; justify-content: center; margin-top: 1rem; }
  .linkButton { background: transparent; color: #f6f1e8; border: 1px solid rgba(255,255,255,.2); }
  .placements { opacity: .75; }
  .scrollable { overflow-y: auto; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pageIn { from { opacity: 0; transform: translateY(24px) scale(.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes coinPulse { 0%, 100% { transform: rotateY(0deg) scale(1); } 50% { transform: rotateY(180deg) scale(1.05); } }
 @media (orientation: portrait) { .horizontalScreen { min-height: 100dvh; width: 100%; }
    .gameScreen { grid-template-columns: 1fr; overflow-y: auto; }
    .turnPanel h2 { font-size: clamp(2.5rem, 14vw, 5rem); }
  }
  @media (min-width: 900px) {
    .portraitScreen { grid-template-columns: 1fr 1fr; grid-template-rows: none; }
  }
`;

export default App;
