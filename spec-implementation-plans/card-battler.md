# Card Battler — Implementation Plan

> **Spec**: `specs/card-battler.md`
> **Created**: 2026-07-31

## Summary

Builds the phase 1 vertical slice: a deterministic lane-battle simulation, eight
units forming one fixed deck, AI opponents across four tiers, and a levels-1-to-3
progression loop backed by the game's own Supabase project.

The approach that shapes every phase below: **the entire simulation lives in
`src/lib/` as pure modules with no browser dependency, and the canvas draws a
state it cannot influence.** That split is already the workshop convention — the
template's `vitest.config.mts` covers `src/**` in Node and says the rules belong
in pure modules — and here it is doing double duty, because a simulation that
cannot reach the DOM, the clock, or a global random source is a simulation that
is deterministic by construction rather than by discipline.

Phases are ordered so the riskiest thing is proven first. Nothing about the
battle being *fun* is known until phase 4 runs, and every phase before it exists
to get there.

## Progress

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0: Repo and scaffold | **Blocked** | `POST /orgs/taiotech/repos` 404s from this session. Code staged at `staged-game/` on the feature branch instead — see its README |
| Phase 1: Simulation core | **Done, less the tick phases that need units** | Tick order, seeded RNG, safe arithmetic, elixir, the four-card cycle, replay, fingerprint. 40 tests, all four gates green |
| Phase 2: Units, towers, combat | Not Started | Fills tick phases 5–12, whose slots are already fixed |
| Phase 3: Rendering and input | Not Started | |
| Phase 4: AI opponents | Not Started | First playable |
| Phase 5: Accounts and progression | Not Started | |
| Phase 6: Surfaces and ledger | Not Started | |

**Last updated**: 2026-07-31
**Current phase**: 1 complete; 2 is next and needs the roster settled
**Blocked**: Partly — phase 0 needs a repo this session cannot create, and the
name. Neither blocks phases 1–2, because no simulation module names the game.

## Files

Paths are in the game's own repo, generated from `TaioTech/app-template`.

### Phase 0

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `package.json` | Name |
| Modify | `.claude/launch.json` | Name |
| Modify | `src/app/layout.tsx` | Metadata, subdomain, viewport zoom lock (this is a phone-first game with controls at the screen edge, so the lock is right) |
| Modify | `src/app/globals.css` | The dark-only rationale that is true for *this* app; uncomment the mobile-gesture block |
| Modify | `AGENTS.md` | Replace every `TEMPLATE:` block; link to `PROFILE_INTEGRATION.md` rather than restating it |
| Modify | `README.md`, `CHANGELOG.md` | Replace wholesale |
| Modify | `src/lib/day.ts` | Keep — this is an arcade entry. Set this game's own epoch |
| Move | `specs/card-battler.md` | From the hub, with its history |
| Move | `spec-implementation-plans/card-battler.md` | This file |

### Phase 1

| Action | Path | Purpose |
|--------|------|---------|
| Create | `src/lib/sim/rng.ts` | Seeded generator carried in battle state |
| Create | `src/lib/sim/vec.ts` | Positions and distances in tile space |
| Create | `src/lib/sim/state.ts` | The battle state, and what is inside versus outside it |
| Create | `src/lib/sim/tick.ts` | The fixed phase order, and the clock |
| Create | `src/lib/sim/elixir.ts` | Accrual, the cap, and the double-elixir schedule |
| Create | `src/lib/sim/hand.ts` | Deck of eight, hand of four, the deterministic cycle |
| Create | `src/lib/sim/replay.ts` | Seed plus ordered plays; run a record back |
| Create | `src/lib/sim/*.test.ts` | Determinism, cycle, elixir schedule |

### Phase 2

| Action | Path | Purpose |
|--------|------|---------|
| Create | `src/lib/arena.ts` | Dimensions, river, bridges, tower placement, deploy zones |
| Create | `src/lib/units/roster.ts` | The eight units and their stats |
| Create | `src/lib/units/budget.ts` | The stat budget formula — the retuning lever |
| Create | `src/lib/sim/pathing.ts` | Bridge routing for ground, straight flight for air |
| Create | `src/lib/sim/targeting.ts` | Sight, acquisition, retention, buildings-only |
| Create | `src/lib/sim/combat.ts` | Hit resolution, splash, death |
| Create | `src/lib/sim/towers.ts` | Princess and King, dormancy, crowns |
| Create | `src/lib/sim/victory.ts` | Regular time, sudden death, draw |

### Phase 3

| Action | Path | Purpose |
|--------|------|---------|
| Create | `src/components/Battle.tsx` | The client component that owns the canvas and the loop |
| Create | `src/lib/render/draw.ts` | Pure draw-a-state-to-a-context; holds no rules |
| Create | `src/lib/render/interpolate.ts` | Between-tick positions for rendering only |
| Create | `src/components/Hand.tsx` | Four cards, the next card, affordability |
| Create | `src/app/battle/page.tsx` | The battle route |

### Phase 4

| Action | Path | Purpose |
|--------|------|---------|
| Create | `src/lib/ai/policy.ts` | Evaluation and decision, pure and seeded |
| Create | `src/lib/ai/threat.ts` | Threat classification and the counter table |
| Create | `src/lib/ai/placement.ts` | Where a defence and a push go |
| Create | `src/lib/ai/opponents.ts` | The four named opponents and their configurations |

### Phase 5

| Action | Path | Purpose |
|--------|------|---------|
| Create | `supabase/migrations/*` | Accounts, collection, currencies, trophies |
| Create | `src/lib/db.ts` | The client, lazy, null without credentials |
| Create | `src/lib/progression/levels.ts` | The 1-to-3 ladder and its costs |
| Create | `src/lib/progression/rewards.ts` | Gold and duplicates per result |
| Create | `src/lib/progression/trophies.ts` | Gain, loss, tier floors |
| Create | `src/app/api/...` | Progression reads and writes |

### Phase 6

| Action | Path | Purpose |
|--------|------|---------|
| Create | `src/app/page.tsx` | Home — play, and the collection. Keep the footer link home |
| Create | `src/components/Collection.tsx` | The eight units, levels, upgrade |
| Create | `src/lib/ledger.ts` | Submission per the hub contract; queue and retry |
| Modify | Hub `src/lib/projects.ts` | Append the arcade entry |
| Modify | Hub `docs/WORKSHOP.md` | Add the repo to the table |

## Phases

### Phase 0: Repo and scaffold

**Goal**: The repo exists, the four gates pass green on an untouched template, and
the spec lives with the code.

- [ ] Settle the name — this is what unblocks everything
- [ ] Generate from `TaioTech/app-template`, default branch `master`
- [ ] Work the template's setup checklist top to bottom
- [ ] Move the spec and this plan across with their history
- [ ] Create the Vercel project, point the subdomain at it

**Gate**: `npm run typecheck && npm run lint && npm run test && npm run build` on a
fresh clone, and CI green on a push to `master` — not only on a pull request.
Confirm the workflow's push trigger names `master`, because a mismatch runs
nothing on a push and looks healthy from a PR.

---

### Phase 1: Simulation core

**Goal**: A battle can be stepped, produces identical state from identical input
on any machine, and replays exactly from a seed and a play list. Nothing is drawn
and no unit exists yet.

- [ ] Seeded generator, carried in state — no global random source anywhere
- [ ] The battle state, with the inside/outside boundary written down as a rule an
      implementer can apply, not just a list
- [ ] Fixed tick order, with the ordering hazards handled explicitly: simultaneous
      deaths, a unit that dies in the tick it attacks, a spell hitting something
      already dying, a deploy landing on the tick of a death
- [ ] Elixir accrual, cap, overflow discard, and the double schedule
- [ ] Deck cycle: eight, hand of four, next visible, deterministic after four plays
- [ ] A replay record that round-trips
- [ ] **Determinism test in CI** — run a battle twice from one seed and assert
      identical state hashes at every tick; run a recorded battle back and assert
      it lands on the same result

**Gate**: The determinism test passes and is part of `npm run test`.

---

### Phase 2: Units, towers, combat

**Goal**: Two AI-less sides can be handed scripted plays and the battle resolves
correctly to a winner. Still nothing drawn.

- [ ] Arena geometry: tiles, river, bridges, tower positions, deploy zones and the
      expansion when a Princess Tower falls
- [ ] The stat budget formula, before any individual stat
- [ ] The eight units against it
- [ ] Pathing: ground to nearest bridge and across; air straight
- [ ] Targeting: sight, acquisition, retention, and buildings-only ignoring troops
- [ ] Combat: hit speed, splash, death, and spells applying once at a point
- [ ] Towers: Princess, King dormancy, crowns
- [ ] Victory: regular time, sudden death at double elixir, draw

**Gate**: Scripted battles produce the expected winner. Tower time-to-kill and
unit time-to-die match the numbers the spec's stat work derived — if they do not,
the formula is wrong, not the test.

---

### Phase 3: Rendering and input

**Goal**: A human can play a battle against nothing. This is the first time the
game is visible.

- [ ] Canvas component owning a render loop decoupled from React's render cycle —
      simulation state must not round-trip through React state per tick
- [ ] Interpolation between ticks, in rendering only, never read back by the sim
- [ ] Hand: four cards, next card, affordability, drag-or-tap to place
- [ ] Deploy-zone feedback, and rejection of an illegal placement
- [ ] Sanity check: dropped frames change nothing about the outcome

**Gate**: `npm run build` passes, and a battle is playable on an actual phone.

---

### Phase 4: AI opponents — first playable

**Goal**: The game is playable end to end and the central question — is this fun —
can finally be answered.

- [ ] Threat classification and the counter table
- [ ] Placement for defence and for a push
- [ ] The policy, pure and seeded, reading only simulation state
- [ ] Four named opponents, one per tier, personality emergent from configuration
- [ ] Reaction delay, card levels and wasted elixir as three independently tunable axes
- [ ] Confirm the AI stays inside determinism: no clock, no global random, decisions
      a pure function of state plus the seeded generator

**Gate**: All four opponents beatable and distinguishable. **Then stop and play it.**
Everything after this point is scaffolding around a game that either works or does
not, and finding out late is the expensive version.

---

### Phase 5: Accounts and progression

**Goal**: Progress persists, and survives a new device.

- [ ] Supabase project, schema, migrations
- [ ] Anonymous account on first arrival — no sign-in between landing and playing
- [ ] Email attach later, keeping the same account
- [ ] The 1-to-3 ladder, duplicate and gold costs by rarity
- [ ] Rewards on win and on loss, weighted duplicate draws
- [ ] Trophies, tiers, and the floor that a tier cannot fall below
- [ ] Opponent difficulty tracking the player's tier

**Gate**: A battle result moves the collection, and the same account on a second
device shows the same progress.

---

### Phase 6: Surfaces and ledger

**Goal**: It is a finished thing on the hub.

- [ ] Home, collection, unit detail and upgrade, opponent select, result
- [ ] The footer link home — half the boundary between this repo and the hub
- [ ] Ledger submission per the contract's five rules: after the local write, never
      blocking play, day's best not day's last, queued and retried on failure
- [ ] Production origin into the hub's `ALLOWED_ORIGINS`
- [ ] Arcade entry appended to the hub's `projects`
- [ ] Repo added to the hub's `docs/WORKSHOP.md`

**Gate**: All four gates, played on a phone, changelog entry, and a submission
landing in the hub's ledger for real.

## Decisions

| Decision | Rationale |
|----------|-----------|
| Eight units, one fixed deck | A deck holds eight cards. Fewer is not a smaller game, it is a broken one; exactly eight removes deck building from the slice rather than shipping it half-built |
| Levels capped at 3 | Enough to feel progress and exercise the whole upgrade path. Levels 4-9 add duration, not mechanism |
| Tiers gate opponent difficulty, not unlocks | Every unit is owned from the first battle, so there is nothing to unlock. A tier that gates nothing is worse than one that gates difficulty |
| AI opponents, not real-time PvP | Real-time needs a persistent authoritative server outside Vercel — the largest cost in the project, and not worth paying before the battle is proven fun |
| Deterministic simulation from the first line | Nearly free now, a rewrite later. It is what makes phase-3 PvP a networking job, and it makes the AI and the battle testable in Node |
| Whole simulation in `src/lib/`, canvas draws only | Already the workshop convention, and here it makes determinism structural rather than a thing to remember |
| No chest economy | Timed unlocks are monetisation scaffolding, and we do not monetise. Rewards pay on the spot |
| Rarity sets scarcity, not a power ceiling | Avoids the original's pay-to-win pressure while keeping rarity meaningful as difficulty-to-level |
| Own Supabase, anonymous-first accounts | Cross-device progress needs a real account; nothing may sit between arriving and the first battle |
| Client reports the result, and is trusted | Against an AI a cheat only cheats the cheater. Determinism keeps server validation available later as a change rather than a rebuild |
