# Playback Test Checklist

Use this checklist for manual playback QA after changes to Spotify playback.

## Environment

- Confirm `.env.local` has `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `NEXTAUTH_URL`, and `NEXTAUTH_SECRET`.
- Confirm the Spotify app redirect URI matches `NEXTAUTH_URL`.
- Run `npm run lint` and `npm run build` before manual QA.

## Manual Tests

- Desktop Chrome + Spotify Premium:
  - Log in with a Premium Spotify account.
  - Select a Flow Mode.
  - Select a recommended track.
  - Press `Play in FlowState`.
  - Confirm the status moves through loading/connecting/transferring/playing.
  - Confirm the Now Playing area shows cover art, title, artist, mode, and playing status.

- Non-Premium account behavior:
  - Log in with a non-Premium Spotify account.
  - Select a recommendation and press `Play in FlowState`.
  - Confirm the app shows `Spotify Premium may be required to play inside FlowState.`
  - Confirm recommendations remain visible.
  - Confirm `Open in Spotify` remains available.

- Unsupported browser behavior:
  - Open the app in a browser where Spotify Web Playback SDK is unavailable or blocked.
  - Select a recommendation and press `Play in FlowState`.
  - Confirm the app shows `Playback inside FlowState works best on desktop Chrome with Spotify Premium.`
  - Confirm `Open in Spotify` remains available.

- Expired session behavior:
  - Log in, then invalidate or expire the Spotify session.
  - Try to play a selected recommendation.
  - Confirm the app shows `Spotify needs a fresh login. Please log out and log in again.`
  - Confirm the app does not crash.

- Play first recommendation:
  - Load recommendations for a saved or newly selected Flow Mode.
  - Choose the first recommendation.
  - Press `Play in FlowState`.
  - Confirm playback starts and Now Playing updates.

- Pause/resume:
  - Start playback.
  - Press `Pause`.
  - Confirm playback pauses and the button changes to `Resume`.
  - Press `Resume`.
  - Confirm playback resumes and the button changes to `Pause`.

- Rapid double-click prevention:
  - Select a recommendation.
  - Rapidly click `Play in FlowState`.
  - Confirm only one transfer/play request sequence is sent.
  - Confirm loading states clear after success or failure.

- Open in Spotify fallback:
  - Select any recommendation with a Spotify URL.
  - Press `Open in Spotify`.
  - Confirm Spotify opens in a new tab.
  - Confirm the fallback link remains visible after playback errors.

- Reload page during saved Flow session:
  - Select a Flow Mode and allow the Flow session to persist.
  - Reload the page.
  - Confirm the resume badge appears.
  - Resume the Flow session.
  - Confirm recommendations and playback controls still work.

- Voice mood to recommendation to playback flow:
  - Use voice mood input.
  - Confirm the detected mode updates recommendations.
  - Select a recommendation.
  - Confirm `Play in FlowState` and `Open in Spotify` both remain available.

## Development Diagnostics

In development mode only, the browser console should show `[FlowState playback]`
logs for SDK load, player readiness, device ID availability, transfer requests,
play requests, pause/resume requests, and SDK/player errors. These logs should
not appear in production builds.

## Lockfile Warning

Next.js previously warned about multiple lockfiles because it detected
`/Users/zayeez/package-lock.json` above this repo and inferred the workspace root
as `/Users/zayeez`. Deleting that parent lockfile would be outside this project
and could affect other work, so the safer local fix is in `next.config.ts`:
`turbopack.root` is set to the current project directory.
