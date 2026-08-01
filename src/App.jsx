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
  const [pendingStartIndex, setPendingStartIndex] = useState(0);

  const [gameMode, setGameMode] = useState("regular");
  const [tournamentMatches, setTournamentMatches] = useState([]);
  const [currentTournamentMatch, setCurrentTournamentMatch] = useState(0);
  const [tournamentRound, setTournamentRound] = useState("quarterfinal");
  const [roundIntro, setRoundIntro] = useState(null);

  const activeTournamentMatch =
    tournamentMatches[currentTournamentMatch];

  const tournamentMatchPlayers = activeTournamentMatch
    ? [activeTournamentMatch.player1, activeTournamentMatch.player2]
    : [];


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
    setGameMode("regular");
    setTournamentMatches([]);
    setCurrentTournamentMatch(0);
    setTournamentRound("quarterfinal");
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
      promptGameMode(winningIndex);
    }, 2500);
  }

  function confirmBoardCount() {
    setNames(Array.from({ length: playerCount }, () => ""));
    goToScreen("boardNames");
  }

  function confirmBoardNames() {
    const namedPlayers = names.map((name, index) =>
      createPlayer(name, index)
    );

    const randomized = shuffle(namedPlayers).map((player, index) => ({
      ...player,
      order: index,
    }));

    setPlayers(randomized);
    setCurrentIndex(0);
    goToScreen("boardOrder");

    setTimeout(() => {
      promptGameMode(0);
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
    const setterIndex = players.findIndex(
      (player) => player.id === setterPlayer.id
    );

    const queue = [];

    // Begin with the player immediately after the setter,
    // continue through the list, and wrap back to the beginning.
    for (let offset = 1; offset < players.length; offset++) {
      const nextIndex = (setterIndex + offset) % players.length;
      const nextPlayer = players[nextIndex];

      if (nextPlayer && !nextPlayer.eliminated) {
        queue.push(nextPlayer.id);
      }
    }

    setSetterId(setterPlayer.id);
    setAttemptQueue(queue);

    if (queue.length > 0) {
      const firstAttemptIndex = players.findIndex(
        (player) => player.id === queue[0]
      );

      setCurrentIndex(firstAttemptIndex);
    }
  }

  function showRoundIntro(round) {
    setRoundIntro(round);
    goToScreen("tournamentRoundIntro");
  }

  function advanceTournamentRound() {
    const roundComplete = tournamentMatches.every(
      (match) => match.winner
    );

    if (!roundComplete) return;

    const advancingPlayers = tournamentMatches.map(
      (match) => match.winner
    );

    if (
      tournamentRound === "quarterfinal" &&
      advancingPlayers.length === 4
    ) {
      const semifinalMatches = [
        {
          id: "semifinal-1",
          round: "semifinal",
          matchNumber: 1,
          player1: advancingPlayers[0],
          player2: advancingPlayers[1],
          winner: null,
        },
        {
          id: "semifinal-2",
          round: "semifinal",
          matchNumber: 2,
          player1: advancingPlayers[2],
          player2: advancingPlayers[3],
          winner: null,
        },
      ];

      setTournamentMatches(semifinalMatches);
      setTournamentRound("semifinal");
      setCurrentTournamentMatch(0);
      setWinner(null);
      showRoundIntro("semifinal");

      return;
    }

    if (
      tournamentRound === "semifinal" &&
      advancingPlayers.length === 2
    ) {
      const finalMatch = [
        {
          id: "final-1",
          round: "final",
          matchNumber: 1,
          player1: advancingPlayers[0],
          player2: advancingPlayers[1],
          winner: null,
        },
      ];

      setTournamentMatches(finalMatch);
      setTournamentRound("final");
      setCurrentTournamentMatch(0);
      setWinner(null);
      showRoundIntro("final");
    }
  }

  function beginTournamentMatch() {
    const match = tournamentMatches[currentTournamentMatch];

    if (!match) return;

    const freshMatchPlayers = [
      {
        ...match.player1,
        letters: 0,
        eliminated: false,
        eliminatedPlace: null,
        order: 0,
      },
      {
        ...match.player2,
        letters: 0,
        eliminated: false,
        eliminatedPlace: null,
        order: 1,
      },
    ];

    setPlayers(freshMatchPlayers);
    setCurrentIndex(0);
    setSetterId(null);
    setAttemptQueue([]);
    setWinner(null);
    setPlacements([]);

    goToScreen("tournamentMatch");
  }

  function finishTournamentMatch(matchWinner) {
    const updatedMatches = tournamentMatches.map((match, index) =>
      index === currentTournamentMatch
        ? {
          ...match,
          winner: matchWinner,
        }
        : match
    );

    setTournamentMatches(updatedMatches);
    setWinner(matchWinner);
    setSetterId(null);
    setAttemptQueue([]);

    goToScreen("tournamentMatchWinner");
  }

  function giveTournamentLetter(playerId) {
    playSound("miss");

    const updatedPlayers = players.map((player) => {
      if (player.id !== playerId || player.eliminated) {
        return player;
      }

      const newLetters = Math.min(
        player.letters + 1,
        LETTERS.length
      );

      return {
        ...player,
        letters: newLetters,
        eliminated: newLetters >= LETTERS.length,
      };
    });

    const remainingPlayers = updatedPlayers.filter(
      (player) => !player.eliminated
    );

    setPlayers(updatedPlayers);

    if (remainingPlayers.length === 1) {
      const matchWinner = remainingPlayers[0];

      playSound("win");
      finishTournamentMatch(matchWinner);
    }
  }

  function undoTournamentLetter(playerId) {
    playSound("click");

    setPlayers((currentPlayers) =>
      currentPlayers.map((player) => {
        if (player.id !== playerId) {
          return player;
        }

        const newLetters = Math.max(
          player.letters - 1,
          0
        );

        return {
          ...player,
          letters: newLetters,
          eliminated: false,
        };
      })
    );
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
      const matchWinner = remaining[0];

      playSound("win");

      if (gameMode === "tournament") {
        finishTournamentMatch(matchWinner);
        return;
      }

      setWinner(matchWinner);
      setSetterId(null);
      setAttemptQueue([]);
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

    setSetterId(null);
    setAttemptQueue([]);

    // After everyone attempts the set trick,
    // control goes back to the original setter.
    // The setter only loses control when they fail to set.
    setCurrentIndex(setterIndex);
  }

  function updateName(index, value) {
    setNames((current) => current.map((name, i) => (i === index ? value : name)));
  }

  function promptGameMode(startIndex = 0) {
    setPendingStartIndex(startIndex);
    goToScreen("modePrompt");
  }

  function startRegularMode() {
    setCurrentIndex(pendingStartIndex);
    goToScreen("game");
  }

  function startEasyMode() {
    setCurrentIndex(pendingStartIndex);
    goToScreen("easyMode");
  }

  function generateTournament(tournamentPlayers) {
    if (tournamentPlayers.length !== 8) {
      console.error("Tournament Mode requires exactly 8 players.");
      return;
    }

    const quarterfinalMatches = [];

    for (let index = 0; index < tournamentPlayers.length; index += 2) {
      quarterfinalMatches.push({
        id: `quarterfinal-${index / 2 + 1}`,
        round: "quarterfinal",
        matchNumber: index / 2 + 1,
        player1: tournamentPlayers[index],
        player2: tournamentPlayers[index + 1],
        winner: null,
      });
    }

    setTournamentMatches(quarterfinalMatches);
    setCurrentTournamentMatch(0);
    setTournamentRound("quarterfinal");
  }

  function startTournamentMode() {
    setGameMode("tournament");
    generateTournament(players);
    showRoundIntro("quarterfinal");
  }


  function giveEasyLetter(playerId) {
    playSound("miss");

    const updatedPlayers = players.map((player) => {
      if (player.id !== playerId || player.eliminated) return player;

      const newLetters = Math.min(player.letters + 1, LETTERS.length);

      return {
        ...player,
        letters: newLetters,
        eliminated: newLetters >= LETTERS.length,
      };
    });

    const remaining = updatedPlayers.filter((player) => !player.eliminated);

    setPlayers(updatedPlayers);

    if (remaining.length === 1) {
      playSound("win");
      setWinner(remaining[0]);
      goToScreen("winner");
    }
  }

  function undoEasyLetter(playerId) {
    playSound("click");

    setPlayers((currentPlayers) =>
      currentPlayers.map((player) => {
        if (player.id !== playerId) return player;

        const newLetters = Math.max(player.letters - 1, 0);

        return {
          ...player,
          letters: newLetters,
          eliminated: false,
        };
      })
    );
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
          <p>First Trick Goes To</p>
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
            {players.map((player) => (
              <li key={player.id}>{player.name}</li>
            ))}
          </ol>
        </section>
      )}

      {screen === "modePrompt" && (
        <section className="horizontalScreen centerScreen modePromptScreen">
          <p className="miniLabel">Choose Game Style</p>
          <h2>Easy Mode?</h2>

          <div className="promptButtons">
            <button className="successButton" onClick={startEasyMode}>
              Easy Mode
            </button>

            <button className="missButton" onClick={startRegularMode}>
              Regular Mode
            </button>

            {players.length === 8 && mode === "boards" && (
              <button
                className="tournamentButton"
                onClick={startTournamentMode}
              >
                Tournament Mode
              </button>
            )}
          </div>

          <p className="helperText">
            Easy Mode only tracks SKATE letters. Turns and trick calls happen outside the app.
          </p>
        </section>
      )}

      {screen === "easyMode" && players.length >= 2 && (
        <section
          className={`easyModeScreen easyPlayerCount-${players.length}`}
          style={{ "--easy-player-count": players.length }}
        >
          {players.map((player) => (
            <div
              key={player.id}
              className={`easyPlayerZone ${player.eliminated ? "out" : ""}`}
              onClick={() => giveEasyLetter(player.id)}
            >
              <div className="easyPlayerInfo">
                <h2>{player.name}</h2>
                <SkateLetters count={player.letters} />
              </div>

              <button
                className="easyUndoButton"
                onClick={(event) => {
                  event.stopPropagation();
                  undoEasyLetter(player.id);
                }}
              >
                Undo Letter
              </button>

              <span className="tapHint">
                Tap this side to give {player.name} a letter
              </span>
            </div>
          ))}
        </section>
      )}

      {screen === "tournamentRoundIntro" && roundIntro && (
        <section
          className="horizontalScreen tournamentRoundIntroScreen"
          onClick={() => goToScreen("tournamentBracket")}
        >
          <p className="miniLabel">Game-Uh-Skate Tournament</p>

          <h1>
            {roundIntro === "quarterfinal"
              ? "Quarterfinals"
              : roundIntro === "semifinal"
                ? "Semifinals"
                : "The Final"}
          </h1>

          <p>Tap anywhere to view the bracket</p>
        </section>
      )}

      {screen === "tournamentBracket" && (
        <section className="horizontalScreen tournamentBracketScreen">
          <p className="miniLabel">Tournament Mode</p>

          <h2>
            {tournamentRound === "quarterfinal"
              ? "Quarterfinal Bracket"
              : tournamentRound === "semifinal"
                ? "Semifinal Bracket"
                : "Final Bracket"}
          </h2>

          <div
            className={`tournamentBracket tournamentBracket-${tournamentRound}`}
          >
            {tournamentMatches.map((match, index) => {
              const player1Won =
                match.winner?.id === match.player1?.id;

              const player2Won =
                match.winner?.id === match.player2?.id;

              const nextMatchIndex = tournamentMatches.findIndex(
                (tournamentMatch) => !tournamentMatch.winner
              );

              const isNextMatch = index === nextMatchIndex;

              return (
                <article
                  className={`tournamentMatch ${match.winner ? "isComplete" : "isPending"
                    } ${isNextMatch ? "isNextMatch" : ""}`}
                  key={match.id}
                  style={{ "--match-index": index }}
                >
                  <div className="matchRail" aria-hidden="true" />

                  <header className="matchHeader">
                    <span className="matchNumber">
                      {String(match.matchNumber).padStart(2, "0")}
                    </span>

                    <span className="matchStatus">
                      {match.winner ? "Complete" : "Waiting"}
                    </span>
                  </header>

                  <div className="matchPlayers">
                    <div
                      className={`matchPlayerSlot ${player1Won ? "isWinner" : ""
                        } ${match.winner && !player1Won ? "isLoser" : ""
                        }`}
                    >
                      <span className="playerSeed">
                        {index * 2 + 1}
                      </span>

                      <span className="playerName">
                        {match.player1?.name || "TBD"}
                      </span>

                      {player1Won && (
                        <span className="winnerMark">ADV</span>
                      )}
                    </div>

                    <div className="matchDivider">
                      <span>VS</span>
                    </div>

                    <div
                      className={`matchPlayerSlot ${player2Won ? "isWinner" : ""
                        } ${match.winner && !player2Won ? "isLoser" : ""
                        }`}
                    >
                      <span className="playerSeed">
                        {index * 2 + 2}
                      </span>

                      <span className="playerName">
                        {match.player2?.name || "TBD"}
                      </span>

                      {player2Won && (
                        <span className="winnerMark">ADV</span>
                      )}
                    </div>
                  </div>

                  {match.winner && (
                    <footer className="matchAdvance">
                      <span>Advancing</span>
                      <strong>{match.winner.name}</strong>
                    </footer>
                  )}
                </article>
              );
            })}
          </div>

          {tournamentMatches.some((match) => !match.winner) ? (
            <button
              className="primaryButton"
              onClick={() => {
                const nextMatchIndex = tournamentMatches.findIndex(
                  (match) => !match.winner
                );

                const match = tournamentMatches[nextMatchIndex];

                const freshMatchPlayers = [
                  {
                    ...match.player1,
                    letters: 0,
                    eliminated: false,
                    eliminatedPlace: null,
                    order: 0,
                  },
                  {
                    ...match.player2,
                    letters: 0,
                    eliminated: false,
                    eliminatedPlace: null,
                    order: 1,
                  },
                ];

                setCurrentTournamentMatch(nextMatchIndex);
                setPlayers(freshMatchPlayers);
                setCurrentIndex(0);
                setSetterId(null);
                setAttemptQueue([]);
                setWinner(null);
                setPlacements([]);

                goToScreen("tournamentMatch");
              }}
            >
              Start Match{" "}
              {tournamentMatches.findIndex((match) => !match.winner) + 1}
              {" "}of {tournamentMatches.length}
            </button>
          ) : (
            <button
              className="primaryButton"
              onClick={() => {
                if (tournamentRound === "final") {
                  const champion = tournamentMatches[0]?.winner;

                  if (!champion) return;

                  setWinner(champion);
                  goToScreen("tournamentChampion");
                  return;
                }

                advanceTournamentRound();
              }}
            >
              {tournamentRound === "quarterfinal"
                ? "Start Semifinals"
                : tournamentRound === "semifinal"
                  ? "Start Final"
                  : "Tournament Complete"}
            </button>
          )}
        </section>
      )}

      {screen === "tournamentMatch" && activeTournamentMatch && players.length === 2 && (
        <section className="tournamentEasyMatchScreen">
          <header className="tournamentMatchHeader">
            <p className="miniLabel">Tournament Mode</p>

            <h2>
              {tournamentRound === "quarterfinal"
                ? "Quarterfinal"
                : tournamentRound === "semifinal"
                  ? "Semifinal"
                  : "Final"}{" "}
              Match {currentTournamentMatch + 1} of {tournamentMatches.length}
            </h2>
          </header>

          <div className="tournamentEasyPlayers">
            {players.map((player) => (
              <div
                key={player.id}
                className={`tournamentEasyPlayer ${player.eliminated ? "out" : ""
                  }`}
                onClick={() => giveTournamentLetter(player.id)}
              >
                <div className="tournamentEasyPlayerInfo">
                  <h3>{player.name}</h3>
                  <SkateLetters count={player.letters} />
                </div>

                <button
                  className="easyUndoButton"
                  onClick={(event) => {
                    event.stopPropagation();
                    undoTournamentLetter(player.id);
                  }}
                >
                  Undo Letter
                </button>

                <span className="tapHint">
                  Tap this side to give {player.name} a letter
                </span>
              </div>
            ))}
          </div>
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

      {screen === "tournamentChampion" && winner && (
        <section className="horizontalScreen winnerScreen tournamentChampionScreen">
          <p className="miniLabel">Game-Uh-Skate Tournament</p>

          <h2>Tournament Champion</h2>

          <h1>{winner.name}</h1>

          <p className="championMessage">
            Winner of the eight-skater bracket
          </p>

          <div className="winnerButtons">
            <button className="primaryButton" onClick={resetAll}>
              Start Another Tournament
            </button>

            <a
              className="linkButton"
              href="https://www.instagram.com/witchcountyspellcasters/"
              target="_blank"
              rel="noreferrer"
            >
              WCSC
            </a>
          </div>
        </section>
      )}

      {screen === "tournamentMatchWinner" && winner && (
        <section className="horizontalScreen centerScreen resultScreen">
          <p className="miniLabel">
            Quarterfinal Match {currentTournamentMatch + 1} Complete
          </p>

          <h2>{winner.name}</h2>
          <p>Advances to the next round</p>

          <button
            className="primaryButton"
            onClick={() => {
              const nextMatchIndex = tournamentMatches.findIndex(
                (match) => !match.winner
              );

              if (nextMatchIndex === -1) {
                goToScreen("tournamentBracket");
                return;
              }

              const match = tournamentMatches[nextMatchIndex];

              const freshMatchPlayers = [
                {
                  ...match.player1,
                  letters: 0,
                  eliminated: false,
                  eliminatedPlace: null,
                  order: 0,
                },
                {
                  ...match.player2,
                  letters: 0,
                  eliminated: false,
                  eliminatedPlace: null,
                  order: 1,
                },
              ];

              setCurrentTournamentMatch(nextMatchIndex);
              setPlayers(freshMatchPlayers);
              setCurrentIndex(0);
              setSetterId(null);
              setAttemptQueue([]);
              setWinner(null);
              setPlacements([]);

              goToScreen("tournamentMatch");
            }}
          >
            {tournamentMatches.some((match) => !match.winner)
              ? `Start Match ${tournamentMatches.findIndex((match) => !match.winner) + 1
              } of ${tournamentMatches.length}`
              : `View Completed ${tournamentRound === "quarterfinal"
                ? "Quarterfinals"
                : tournamentRound === "semifinal"
                  ? "Semifinals"
                  : "Final"
              }`}
          </button>
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
