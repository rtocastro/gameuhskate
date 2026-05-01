# SKATE Game Tracker

A mobile-first React/Vite web app for tracking games of **SKATE**, the skateboarding version of HORSE. The app is designed to help skaters keep score, randomize starting order, track missed attempts, and declare a winner without interrupting the actual session.

## Deployed Site

**Live App:** `[https://gameuhskate.onrender.com]`

Example once deployed:

```md
https://gameuhskate.onrender.com
```

## Project Status

This project is currently in early prototype development. The first version focuses on building the core gameplay flow and score-tracking logic before adding the final visual style, animations, branding, and polish.

## Built With

* React
* Vite
* JSX
* CSS
* JavaScript

## App Concept

The app tracks games of **SKATE**, where players take turns setting tricks and attempting each other's tricks.

When a player misses an attempted trick, they receive a letter from the word **SKATE**. Once a player has all five letters, they are eliminated. The last remaining player wins.

## Core Game Modes

### Flip Coin Mode

A 1-on-1 game mode.

Players enter their names, receive either heads or tails, and the app performs a digital coin flip. The winner of the coin toss gets the first chance to set a trick.

### Flip Boards Mode

A multiplayer game mode for 2 to 10 players.

Players enter how many people are joining, add each player's name, and the app randomly assigns the skating order. The order determines who gets the first opportunity to set a trick and how turns rotate throughout the game.

## Current Features

* Mobile-first landing screen
* Tap-to-start flow
* Game mode selection
* 1-on-1 coin flip setup
* Multiplayer board-flip setup
* Random player order generation
* SKATE letter tracking
* Crossed-out letters for missed attempts
* Player elimination after five missed attempts
* Winner screen
* Restart game option
* Placeholder external link button

## Planned Features

* Skate/punk/video-game inspired visual design
* Stronger transition animations between screens
* Landing screen loop or video background
* Coin flip animation
* Board flip animation
* Sound effects
* Improved game-state feedback
* Better winner screen animation
* Custom app name and branding
* Optional trick history log
* Optional session history
* Optional local storage support

## Basic Gameplay Flow

1. User opens the app.
2. Landing screen appears.
3. User taps anywhere to begin.
4. User chooses either:

   * **Flip Coin** for a 1-on-1 game
   * **Flip Boards** for a multiplayer game
5. Players enter their names.
6. The app determines the starting order.
7. Players take turns trying to set tricks.
8. Once a trick is set, the other players attempt it.
9. Missed attempts add letters from **SKATE**.
10. Players are eliminated after receiving all five letters.
11. The final remaining player is declared the winner.

## Installation

Clone the repository:

```bash
git clone [https://github.com/rtocastro/gameuhskate]
```

Navigate into the project folder:

```bash
cd [gameuhskate]
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

## Available Scripts

### Start development server

```bash
npm run dev
```

### Build for production

```bash
npm run build
```

### Preview production build locally

```bash
npm run preview
```

## Deployment Notes

This app is intended to be deployed on Render as a static site.

Suggested Render settings:

```txt
Build Command: npm run build
Publish Directory: dist
```

After deployment, replace the placeholder at the top of this README with the live Render URL.

## Future Visual Direction

The final style direction will lean into a mix of:

* Skateboarding culture
* Arcade/game UI energy
* Punk-inspired graphics
* High-contrast textures
* Fast transition effects
* Gritty but clean mobile-first design

The goal is for the app to feel useful during a real skate session while still having enough personality to feel like a game.

## Author

Created by Rick Torres.

## License

This project is currently for personal and portfolio use. A license can be added later if the project becomes public or open source.
