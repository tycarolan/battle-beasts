# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Towers are drawn as masonry rather than as coloured blocks. Six of them hold
  most of the screen for a whole battle, so they were the one thing on the field
  that could not afford to be a rectangle — and they carry the arena's sense of
  scale, which is what decides whether the beasts walking past them read as
  animals or as counters. A tapered shaft, an overhanging parapet that casts a
  shadow down it, staggered courses, arrow slits, a plinth, and the owner's
  colour moved off the stone and onto a hanging banner, because two armies built
  the same keep and only the flag over it differs.

  The constraint worth recording is that a tower's whole height has to fit
  between the ground it stands on and the end of the arena, and the king stands
  three tiles from its end. That budget — not taste — is why the structure comes
  in under one footprint diameter tall, why the king says king with width, five
  merlons and a crown rather than with height, and why the drawn width is about
  three quarters of the collision footprint: at full width the silhouette came
  out wider than it was tall, which is a gatehouse. The footprint still decides
  what can be hit; the new number only decides what is seen.

- Units move rather than slide. A two-beat bounce while a body is actually
  covering ground, a hover for anything airborne, and a lunge toward the target
  on the frames just after a blow lands. All three are derived in the renderer
  from state it only reads, run on wall-clock time rather than the tick count,
  and are never fed back — a renderer that skipped all three resolves every
  battle identically, which is the test any animation here has to pass.

- Shots are drawn travelling. The simulation does not move a projectile: it
  fires one, counts down, and applies the damage where the target is standing
  when the count reaches zero. That is the right model — a shot bound to its
  target is what makes overkill real — but drawn literally it put a dot on the
  archer for the whole flight and then nothing at all. The flight is now the
  renderer's, interpolated from the launch point to wherever the target is now,
  with a short tail. The arrival is still the simulation's, on the same tick.

- The river has banks and the bridges have posts. The water is cut into the
  ground rather than laid over it, and a crossing is held up by something.

### Added

- This repository, generated from `TaioTech/app-template`.
- The deterministic battle simulation: a 20Hz fixed timestep, a seeded
  generator, and a fixed tick phase order that is the battle's storage format.
  Battles record as a seed plus a list of plays and replay from them.
- The arena — three towers a side, a river, two bridges — and the twelve-beast
  roster.
- Elixir, the four-card hand and its cycle, projectiles, and sudden death.
- An AI opponent that lives inside the simulation, so its decisions replay
  without being stored. Three independent difficulty axes.
- Canvas rendering with a per-beast sprite drawn from `Path2D` paths, cached and
  blitted rather than traced per frame.
- One battle as the whole surface, with no menu in front of it.
- 40 simulation tests, covering determinism, the generator, elixir and the hand.

### Notes

- Moved here from `TaioTech/taiotech`, where it had been staged under
  `staged-game/` because the repo could not be created from the session that
  wrote it. The hub's two accommodations for it — a `tsconfig.json` exclude and
  an `eslint.config.mjs` ignore — are reverted as part of the same move.
