# Battle Beasts

A real-time lane battler. Twelve animal units, three towers a side, a river with
two bridges, and a hand of four cards paid for out of elixir that fills back up
whether you spend it or not.

Clash Royale's 2016 shape, original animals. Phone-first, in a browser, nothing
to install.

**Play: https://battlebeasts.taiotech.com**

Prototype — one battle against an AI, and not much else yet. See
[What exists](#what-exists).

## Quick start

```bash
npm install
npm run dev      # http://localhost:3000
```

Narrow the window, or open it on a phone. Tap a card, then tap where you want
the beast to land.

## What exists

One complete battle, and no menu in front of it:

- A **deterministic simulation** at a fixed twenty ticks a second, driven by a
  seeded generator. A battle is stored as a seed and a list of plays and replays
  exactly from them.
- **Twelve beasts** — Grubs, Spears, Brute, Bats, Hammer, Behemoth, Runner,
  Ashcaster, Skyhulk, Ogre, Nest and Blast — spanning ground and air, single
  target and splash, troops and a building.
- **The arena**: two princess towers and a king tower a side, a river no ground
  unit may enter, and two bridges they must cross by.
- **Elixir**, the four-card cycle, projectiles with travel time, and sudden
  death.
- **An AI opponent** that plays legibly rather than well, on three independent
  difficulty axes — reaction delay, elixir discipline, and card level.
- **Canvas rendering**, each beast drawn from vector paths into a cached sprite.

Not built, and specified in [specs/card-battler.md](specs/card-battler.md): the
collection, levelling, gold, the ladder and its tiers, deck building, accounts, a
database, submission to the hub's profile ledger, and real-time play against
another person.

That last one is the reason for all the determinism. Two machines agreeing on a
battle is a networking problem if the simulation is deterministic from the start,
and a rewrite if it is not — so the simulation never calls `Math.random`, never
reads the clock, and never uses trigonometry. `src/lib/sim/math.ts` explains why
trigonometry in particular is the one that would bite.

## Commands

```bash
npm run dev        # Dev server
npm run build      # Production build
npm run start      # Serve a production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run test       # vitest run
```

All four gates must pass before anything is called done.

## Two documents that will mislead you

- **[specs/card-battler.md](specs/card-battler.md)** specifies eight units. The
  game ships twelve. The spec's reasoning about *why* eight was drawn as the
  boundary is still worth reading; the number is stale.
- **[ROSTER.md](ROSTER.md)** is a rejected balance proposal for eight archetypes
  that were never built. It is not a description of the twelve beasts in the
  game. `src/lib/units/roster.ts` is.

## Where it came from

Written in a remote session that could not create a repository, so it was parked
inside the hub at `TaioTech/taiotech` under `staged-game/` rather than lost, and
moved here afterwards.

---

Part of [taiotech.com](https://taiotech.com).
