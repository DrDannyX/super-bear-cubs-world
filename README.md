# Super Bear Cubs World

A colourful 8-bit platformer starring the Bear Cubs — **A** and **P**. Run, jump and stomp
your way through three worlds collecting golden bear claws, then make it home to the den.

Everything (graphics, music, sound effects) is generated in code, so there are no assets
to manage and no build step. It runs straight from the files in this folder.

## Controls

| Action        | Keyboard                | Xbox controller        |
|---------------|-------------------------|------------------------|
| Move          | Arrow keys / A, D       | Left stick / D-pad     |
| Jump          | Z / Space / Up / W      | A (or Y)               |
| Run           | X / Shift               | X / B / triggers       |
| Pause / Start | Enter / Esc / P         | Menu (≡)               |
| Mute          | M                       | View (⧉)               |

Touch buttons appear automatically on phones and tablets.

Hold jump for a higher jump, and hold run to go faster. Stomp on beetles and bees.

## The game

- **Cubs:** A is the *super jumper*, P is the *speedy runner*.
- **Bear claws:** collect 100 for an extra life. Paw blocks hide claws and power-ups.
- **Honey pot:** gives your cub a honey crown — you can smash bricks and survive one hit.
- **Super berry:** a few seconds of invincibility (and faster music!).
- **Red mushrooms:** bounce pads. Hold jump to bounce higher.
- **Worlds:** 1 Sunny Meadow, 2 Honeycomb Caves, 3 Snowy Peaks — each has a checkpoint flag halfway.

## Play locally

ES modules need to be served over HTTP (opening `index.html` directly won't work):

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

Testing shortcut: `http://localhost:8000/?play&world=2&cub=P` jumps straight into a world.

## Deploy to GitHub Pages

1. Create a new repository on GitHub (e.g. `super-bear-cubs-world`).
2. Push this folder to its `main` branch:
   ```sh
   git init -b main
   git add .
   git commit -m "Super Bear Cubs World"
   git remote add origin https://github.com/<your-username>/super-bear-cubs-world.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. The included workflow (`.github/workflows/deploy.yml`) publishes on every push to `main`.
   Your game will be live at `https://<your-username>.github.io/super-bear-cubs-world/`.

## Making it your own

- **Levels** live in `js/levels.js` — each world is a short list of builder calls
  (`ground`, `row`, `log`, `stairs`, `spikes`, `spring`, `enemy`, `arc`, `checkpoint`, `goal`).
- **Cub colours and abilities** are in `CUBS` at the top of `js/sprites.js`.
- **Music** is in `js/audio.js` — melodies are written as note names, one per 16th note.
