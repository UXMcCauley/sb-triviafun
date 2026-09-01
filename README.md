# Seinfeld Trivia

A real-time, host-and-players trivia game. Pick a pack, spin up a room, humiliate your friends with facts you'll forget by Tuesday.

**[Host a game](https://sb-triviafun.vercel.app/)** · **[Join as player](https://sb-triviafun.vercel.app/play)**

## How to Play

### 1) Host (the benevolent dictator)

Go to the home page, pick one or more packs, tune the settings, and hit Create game.
You'll get a room code and a QR code. Players can join from their phones at `/play`.

### 2) Players (the chaos gremlins)

Join using the room code (or scan the QR), choose a name, and wait in the lobby.
When the host starts, you'll answer each question before the timer expires. Speed matters. So does not panicking.

### Scoring (aka: consequences)

You earn points for correct answers. Faster answers usually score higher. Wrong answers score nothing, but do score you shame.
At the end, the leaderboard crowns winners and highlights the "big loser" moments we'll all pretend are "character building."

### Pro tips

- Pick packs intentionally. Mixing packs can be hilarious. It can also be unhinged. Choose your vibe.
- Use audience mode if you want non-players to react without affecting the game.
- If something's wrong, report it on the [Report](https://sb-triviafun.vercel.app/report) page.

**Quick links:** [Theme packs](https://sb-triviafun.vercel.app/packs) · [Account](https://sb-triviafun.vercel.app/account) · [Report / feedback](https://sb-triviafun.vercel.app/report)

---

## Architecture

Built with Next.js 16 (App Router) and React 19, with a real-time multiplayer layer separate from the persistence layer:

- **Real-time sync (Pusher):** Host and player clients communicate over Pusher channels — question advances, timer state, and live scoring push out to every connected player without polling. This is what makes the lobby → live game → leaderboard flow feel instant across devices.
- **Persistence (Neon serverless Postgres):** Room, player, and live-game state are backed by Neon, with dedicated `db:init` and `db:seed` scripts for schema setup and pack seeding. The `db/` directory holds the schema and client setup; runtime game state (rooms, players, scores) lives here.
- **Content (`data/packs/`):** Trivia packs are static JSON content, decoupled from the database layer — packs can be authored, versioned, and verified independently of live game state.
- **Component layer:** Material Web Components (`@material/web`) composed with Tailwind CSS v4, rather than a from-scratch component library — UI primitives come from Google's Material Web system, styled and assembled into the game's specific screens (lobby, question view, leaderboard, host controls).
- **QR join flow:** `qrcode.react` generates the room-join QR code shown to the host, so players can join from a phone camera without typing a room code.

## Content Pipeline: AI-Assisted Answer Verification

Trivia packs are QA'd with a standalone script, `scripts/verify-questions.ts`, that is **not** part of the running app:

1. Reads all JSON packs from `data/packs/`
2. Sends questions to Claude (`claude-sonnet-4-20250514`) in batches of 10
3. Asks Claude to judge each marked answer as correct, incorrect, or ambiguous
4. Prints a summary and writes full results to `data/verification-results.json`

Run manually with `npx tsx scripts/verify-questions.ts` (requires `ANTHROPIC_API_KEY`) — it's a content-authoring/QA tool, not a gameplay feature. The Claude SDK has no role in live gameplay, matchmaking, or scoring.

## Tech Stack

- **Framework:** Next.js 16 (App Router), React 19
- **Real-time:** Pusher / Pusher-js
- **Database:** Neon serverless Postgres
- **UI:** Material Web Components, Tailwind CSS v4
- **Content QA:** Anthropic Claude SDK (offline script only)
- **Other:** `qrcode.react` for room-join QR codes, `uuid` for identifiers

## Running Locally

```bash
npm install
npm run db:init      # set up schema
npm run db:seed      # seed trivia packs
npm run dev
```
