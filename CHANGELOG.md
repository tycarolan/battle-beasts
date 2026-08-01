# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
