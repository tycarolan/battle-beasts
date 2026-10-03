<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md

Orientation map for agents working in this repo. It points at the detailed docs
rather than restating them — when a rule lives elsewhere, this file links to it
and stops.

## Project Overview

Battle Beasts is a real-time lane battler in the shape of Clash Royale's 2016
release, with original animal units. Two sides hold three towers each across a
river, spend regenerating elixir to drop beasts from a four-card hand, and win by
destroying towers. Phone-first, played in a browser, nothing to install.

**What exists today is one battle.** Open the page and you are immediately in it,
against an AI opponent, with no menu in front of it. The simulation is complete —
twenty ticks a second, seeded, twelve units, three towers a side, elixir, the
four-card cycle, projectiles, sudden death — and so is the canvas renderer that
draws it. There are 40 tests and all four gates pass.

**Everything else is specified and does not exist.** No collection, no levelling,
no gold, no ladder or tiers, no deck building, no accounts, no database, no
ledger submission, no real-time play against another person. `specs/card-battler.md`
describes all of it. Read the spec before assuming a missing thing is an
oversight — most of the game is deliberately unbuilt.

Two places where the written record and the code disagree, both known:

- `specs/card-battler.md` specifies **eight** units as the phase-1 slice, chosen
  so the roster forms exactly one legal deck. The code ships **twelve**. The
  twelve are what to trust; the spec's reasoning about why eight was the boundary
  is still worth reading, but the number is stale.
- `ROSTER.md` is a **rejected balance proposal**, not a description of the
  shipped units. It designs eight archetypes that were never implemented and
  says so in its own first line. The shipped roster is `src/lib/units/roster.ts`
  and nothing else.

This app links back to the hub at taiotech.com and is otherwise independent of
it. See the hub's `docs/WORKSHOP.md` for how the repos relate.

It is an arcade entry, so `src/lib/day.ts` is kept — but nothing imports it yet,
because the game submits nothing. When it does, the collectible is the player's
battle result and the contract is `docs/PROFILE_INTEGRATION.md` in
`tycarolan/taiotech`. Link to that document; do not restate it.

## Commands

```bash
npm install        # First, and after any dependency change
npm run dev        # Dev server on http://localhost:3000
npm run build      # Production build — the real compile gate
npm run start      # Serve a production build locally
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run test       # vitest run
npm run test:watch # vitest, watching
```

The four quality gates are typecheck, lint, test, and build. All four must pass
before anything is claimed done.

Node 24 (`.nvmrc`) is what CI and the Vercel build run. `engines` allows 20.9+
because that's the real floor, but a green run on an older Node proves less than
it looks like it does.

## Architecture

The split that matters is **simulation versus rendering**. `src/lib/sim/` decides
what happens; `src/lib/render/` decides what it looks like. The renderer could be
deleted without changing a single outcome, and that is the property to protect —
anything the renderer is allowed to decide is something two machines could decide
differently.

### The simulation — `src/lib/sim/`

1. `math.ts` — the only arithmetic the simulation may use. Read its header before
   touching anything here. Doubles are safe; the transcendental family (`sin`,
   `cos`, `atan2`, `pow`, `exp`, `log`) is not, because engines are permitted to
   disagree in the last bit. Movement is a normalised offset rather than an angle
   so no angle is ever taken.
2. `tick.ts` — one tick, and **the order its phases run in is the battle format**.
   A battle is a seed plus a list of plays, replayed by running this. Reordering
   two phases changes the outcome of every battle ever recorded, so a change here
   is a `SIM_VERSION` bump, not a tidy-up.
3. `phases.ts` — the individual passes. Each is written so its result does not
   depend on array order; where order genuinely matters it breaks ties on entity
   id, which is stable.
4. `state.ts`, `entities.ts`, `constants.ts` — the battle's shape and its numbers.
5. `rng.ts` — the seeded generator. The simulation's only source of randomness.
6. `elixir.ts`, `hand.ts` — the resource and the four-card cycle.
7. `replay.ts` — a whole battle in a seed and a list of plays. The opponent lives
   *inside* the simulation, so its decisions are reproduced rather than stored,
   which is what keeps a four-minute battle a few hundred bytes and leaves
   server-side validation available later without a rebuild.
8. `fingerprint.ts` — FNV-1a over the state, so the determinism tests catch a
   divergence on the tick it happens rather than at the end.

### Everything else

9. `src/lib/arena.ts` — the battlefield in tiles: the river, the bridges, the
   tower placements. Pixels appear only in the renderer; the simulation never
   learns how big the screen is.
10. `src/lib/units/roster.ts` — the twelve beasts and their stats. The single
    source of truth for the roster.
11. `src/lib/ai/opponent.ts` — a policy, not a search, and holds no randomness so
    a replay reproduces it. Three independent difficulty axes: reaction delay,
    elixir discipline, card level.
12. `src/lib/render/beasts.ts` — each beast as SVG path strings drawn through
    `Path2D`. Layers name a role (`dark`, `base`, `light`, `detail`, `accent`) and
    the side's palette supplies the colours, so one design serves both armies.
13. `src/lib/render/draw.ts`, `field.ts`, `sprites.ts`, `palette.ts`,
    `feedback.ts` — the canvas. Sprites are cached and blitted; nothing traces a
    vector path per frame.
14. `src/components/Battle.tsx` — the only client component. Owns the animation
    frame loop and the input, and no rules.

### The rule that is easiest to break

**Nothing under `src/lib/sim/` may call `Math.random`, read the clock, or use
trig.** Determinism is what keeps real-time PvP a networking job later rather
than a rewrite. Rendering may change freely — it holds no rules.

The rules live in pure modules under `src/lib/` and the browser-touching parts
hold none, which is what makes the test setup in `vitest.config.mts` a deliberate
choice rather than laziness. Breaking that split quietly makes the test suite a
lie.

Everything is a server component unless it genuinely needs state, effects, or a
browser API. If a change appears to need `"use client"`, that is a signal worth
questioning before acting on it.

The palette is deliberately dark-only. `src/app/globals.css` records why, and
that comment is meant to carry *this app's* reason rather than the house one.

## Working with Claude

<scope>
Do what was asked. No unsolicited refactoring, no scope expansion. Read the
existing code before proposing changes to it.
</scope>

<communication>
Terse and code-first. Explain the why when a decision involves a trade-off.
Ask rather than assume when requirements are ambiguous.
</communication>

<delegation>
Delegate to a subagent only for genuinely independent, parallelizable work. A
repo this size rarely warrants one.
</delegation>

<written_deliverables>
Specs, plans, and any document meant to outlive the conversation get written to
disk, not left in chat. Specs describe behavior in prose; they do not carry code
blocks, which go stale.
</written_deliverables>

## Conventions

- Two-space indentation, never tabs. LF endings, final newline (`.editorconfig`).
- Self-documenting names over comments. Comments earn their place by explaining
  a non-obvious *why* — the note in `globals.css` about the dark-only palette is
  the bar.
- TSDoc on exported types and components.
- Commit messages: `type(scope): summary`, lowercase, imperative. Types in use:
  `feat`, `fix`, `docs`, `refactor`, `style`, `chore`, `spec`. Scope is optional
  for repo-wide changes.
- Copy is written for someone who has never seen the project. Two sentences per
  blurb: what it is, then how it runs.

## Slash Commands

| Command | Purpose |
| --- | --- |
| `/0-write-spec` | Write a feature spec to `specs/` |
| `/2-plan-spec` | Turn an approved spec into a plan in `spec-implementation-plans/` |
| `/4-review-diff` | Review the working diff or branch against `master` |

Most work needs none of them — see the thresholds in
`docs/SPEC_DRIVEN_DEVELOPMENT.md` before reaching for a spec.

## Definition of Done

- `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` all
  pass.
- A change with a visible surface has been looked at in a browser, not just
  compiled.
- `CHANGELOG.md` has an entry under `[Unreleased]`.
- This file updated only if the orientation actually changed.

## Pointers

- [README.md](README.md) — human-facing overview and quick start
- [CHANGELOG.md](CHANGELOG.md) — what has shipped
- [specs/card-battler.md](specs/card-battler.md) — the whole game, most of which
  is unbuilt. Note the two drifts recorded under Project Overview.
- [ROSTER.md](ROSTER.md) — a **rejected** balance proposal, kept for its method.
  Not the shipped roster.
- [docs/SPEC_DRIVEN_DEVELOPMENT.md](docs/SPEC_DRIVEN_DEVELOPMENT.md) — when a
  spec is required and the workflow around it
- [docs/SPEC_TEMPLATE.md](docs/SPEC_TEMPLATE.md),
  [docs/PLAN_TEMPLATE.md](docs/PLAN_TEMPLATE.md)
- `tycarolan/taiotech` → `docs/WORKSHOP.md` — every repo in the workshop and the
  boundary between them. Start there when a task reaches past this repo.
