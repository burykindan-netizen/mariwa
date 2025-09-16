# 8-bit Platformer

Simple 8-bit style HTML5 canvas platformer with Mario-like movement, enemies, coins, hazards, flags, and multiple levels.

## Run
- Open `index.html` in a modern browser.
- Or serve locally (recommended for Audio):
  - Python: `python3 -m http.server` then open `http://localhost:8000`
  - Node: `npx serve` then open the provided URL

## Controls
- Left/Right or A/D: Move
- Z or Space: Jump
- P: Pause
- R: Reset level

## Features
- Tile-based collisions with coyote time and jump buffering
- Camera follow, two example levels
- Enemies with patrol AI; stomp to defeat
- Coins, score, lives, hazard tiles (lava)
- Minimal HUD; simple WebAudio 8-bit-like SFX

## Editing Levels
- See `LEVELS` in `main.js`. Tiles:
  - 0 empty, 1 ground, 2 brick, 3 coin, 4 enemy spawn, 5 flag, 6 lava
- `spawn` sets the player starting tile.

## Notes
- This is a learning/demo project, not affiliated with Nintendo.
