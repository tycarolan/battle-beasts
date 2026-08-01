<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md

Orientation map for agents working in this repo. It points at the detailed docs
rather than restating them — when a rule lives elsewhere, this file links to it
and stops.

> **TEMPLATE**: every section below marked `TEMPLATE:` is a prompt, not content.
> Replace it. An `AGENTS.md` that still describes the template is worse than none,
> because a session will believe it. The README's checklist tracks this.

## Project Overview

TEMPLATE: two or three paragraphs. What this app is, who it is for, and what it
does *today* as opposed to what is specified. Lead with what someone can actually
use — the single most useful thing this file does is stop a session assuming a
missing feature is an oversight when it is unbuilt on purpose.

State the spec's location and say plainly which parts of it exist. Both games do
this well: "Streaks and sharing are specified and do not exist. Read the spec
before assuming a missing thing is an oversight."

This app links back to the hub at taiotech.com and is otherwise independent of
it. See the hub's `docs/WORKSHOP.md` for how the repos relate.

TEMPLATE (arcade only): name this app's collectible and say that it writes to the
hub's ledger. The contract is `docs/PROFILE_INTEGRATION.md` in `TaioTech/taiotech`
— link to it, do not restate it. A contract copied into four repos is a contract
that drifts.

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

TEMPLATE: a numbered list of the modules that matter and what each owns. Aim for
the level of "this file is the single source of truth for X", not a directory
listing — a session can run `ls` itself. Name the boundaries that are easy to
violate.

The convention worth keeping whatever else changes: **the rules live in pure
modules under `src/lib/` and the browser-touching parts hold no rules.** That is
what makes the test setup in `vitest.config.ts` a deliberate choice rather than
laziness — the canvas, the storage and the buttons go untested because there is
nothing in them to test. Breaking that split quietly makes the test suite a lie.

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
- [docs/SPEC_DRIVEN_DEVELOPMENT.md](docs/SPEC_DRIVEN_DEVELOPMENT.md) — when a
  spec is required and the workflow around it
- [docs/SPEC_TEMPLATE.md](docs/SPEC_TEMPLATE.md),
  [docs/PLAN_TEMPLATE.md](docs/PLAN_TEMPLATE.md)
- `TaioTech/taiotech` → `docs/WORKSHOP.md` — every repo in the workshop and the
  boundary between them. Start there when a task reaches past this repo.
