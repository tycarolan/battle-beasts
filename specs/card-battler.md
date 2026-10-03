# Card Battler — Phase 1

> **Status**: Draft
> **Dependencies**: A new repo generated from `tycarolan/app-template`; a Supabase project owned by that repo
> **Date**: 2026-07-31

## Summary

A real-time lane battler in the shape of Clash Royale's 2016 release: two
players hold three towers each across a river, spend a regenerating resource to
drop units from a four-card hand, and win by destroying towers. Phase 1 is a
deliberately minimal vertical slice — eight units forming exactly one deck,
levels capped at three, and AI opponents — built so that the parts that come
later extend it rather than replace it.

Real-time play against another person is not in this phase. The simulation is
specified as deterministic from the first line precisely so that adding it later
is a networking job rather than a rewrite; that is the one decision here which is
nearly free now and very expensive to retrofit.

The game has no name yet. This spec uses "the game" throughout; the name sets
the repo, the subdomain and the permanent slug, and none of the design below
depends on it.

---

## The slice, and why it is drawn here

The instinct with a game of this shape is to build the full roster and the full
ladder, because a lane battler with too few units has no strategy in it. That
instinct is right about the roster and wrong about everything else, and the
boundary falls in a specific place:

**Eight units, because a deck holds eight cards.** Fewer than eight and there is
no legal deck; exactly eight and there is precisely one, which removes deck
building from the slice entirely rather than shipping it half-built. The ninth
unit is what creates a *choice*, and that is when deck building has to exist.
This is the load-bearing number in the whole phase — a roster of four would not
have produced a smaller game, it would have produced a broken one.

**Levels 1 to 3, because the loop is what is being proven, not the grind.**
Three levels is enough to feel a unit get stronger, to make gold worth having,
and to exercise every part of the upgrade path. Levels 4 to 9 add duration, not
mechanism.

**Tiers gate opponent difficulty, not unit unlocks.** With all eight units owned
from the start there is nothing to unlock, so the ladder's job in the slice is
to make opponents harder. When the roster grows past eight, tiers take on their
usual job as well.

Everything cut here is cut because it adds duration or surface, not because it
adds mechanism. Nothing in the slice is a throwaway.

## The daily mould, and breaking it

Every arcade entry in the workshop so far is a daily game — one session a day,
the same for everyone, derived from the date. That was never a rule, but it had
started to read as one, and the ledger's shape reinforced it: one row per player,
per app, per day.

This game is not a daily and is not going to become one. It is a ladder, played
in whatever quantity someone wants, and the collection persists across sessions
rather than resetting at local midnight. That is a deliberate widening of what
the arcade is for, taken because the daily shape had begun to restrict what could
be built rather than describe what had been.

Nothing about the ledger contract has to change to accommodate it. The contract
takes a day number the app asserts and stores named quantities it does not
interpret; a game with no natural day boundary can still report what it minted
today. What changes is only the assumption that an arcade entry *is* a daily,
which was an accident of the first two games rather than a decision.

---

## Scope

### In Scope

- **The battle.** One arena, three towers a side, a river with two bridges,
  elixir regeneration, an eight-card deck cycling through a four-card hand, and
  a full unit simulation — movement, target selection, pathing, combat, death.
- **Eight units** across three rarities, forming exactly one legal deck, and
  between them a complete game: a win condition, an answer to swarms, an answer
  to air, and an answer to a tank.
- **AI opponents.** Named opponents with fixed decks and legible behaviour,
  whose card levels and competence scale with the player's tier.
- **The collection.** Owning units and levelling them from 1 to 3 with
  duplicates and gold.
- **Progression.** Gold and duplicate cards paid immediately on a result,
  trophies won and lost per battle, and tiers that gate opponent difficulty.
- **Accounts.** Anonymous on first play, upgradeable to an email account so
  progress survives a new device. Progression is stored server-side.
- **Ledger submission** to the hub, per `docs/PROFILE_INTEGRATION.md` in
  `tycarolan/taiotech`.

### Out of Scope

- **Real-time play against another person.** It needs a persistent authoritative
  server, which is a separate deployment and the largest single cost in this
  project. It is not worth paying before the battle is proven fun. Everything in
  "Determinism" below exists to keep the door open.
- **Deck building, and units nine to fourteen.** A roster of exactly eight has
  one legal deck, so there is no choice to build a surface around. The two ship
  together, and neither is a rewrite of anything in this phase — the deck is
  already a list of eight that the battle reads, it simply becomes a list the
  player chooses.
- **Levels four to nine.** The ladder extends; nothing about it changes shape.
- **The chest economy.** Timed unlocks, chest slots and a chest cycle are
  monetisation scaffolding rather than game design; they make a won battle feel
  like the start of a wait. Rewards here are paid on the spot.
- **Special abilities, evolutions, and champions.** These are the later
  additions that made the original more complex, and this phase is explicitly
  the game as originally released.
- **Legendary rarity.** It arrived after launch and its only real function is
  scarcity, which three rarities already provide.
- **Clans, tournaments, chat, emotes, spectating, replays as a surface.**
- **Monetisation of any kind.** No purchases, no currency for money, no ads.
- **Anything traceable to Supercell.** No unit names, silhouettes, art, sounds,
  or copied stat values. The mechanics of a lane battler are not ownable; the
  Hog Rider is. Every unit here is defined by role, and named from this game's
  own world.

---

## Acceptance Criteria

### The battle

1. A battle runs for three minutes of regular time. Elixir regenerates at one
   per 2.8 seconds for the first two minutes and one per 1.4 seconds for the
   third.
2. Each side starts a battle with five elixir and can hold at most ten.
   Regeneration continues to run while at the cap and the overflow is discarded.
3. Each side holds two Princess Towers forward and one King Tower centred
   behind. Destroying a Princess Tower scores one crown; destroying the King
   Tower ends the battle immediately and scores three.
4. The King Tower does not attack until it has taken damage or one of its own
   Princess Towers has fallen.
5. At the end of regular time the side with more crowns wins. If crowns are
   level, a sixty-second sudden death period follows at double elixir, in which
   the first tower to fall decides the battle. If no tower falls, the battle is
   a draw.
6. A deck holds eight cards. Four are in hand and the next is visible. Playing a
   card sends it to the back of the queue and promotes the next — so after the
   first four plays the order is fully determined, and a player who is counting
   knows exactly what is coming.
7. A card can only be played if its elixir cost is currently affordable. An
   unaffordable card is visibly unaffordable rather than silently inert.
8. Units may be deployed anywhere on the player's own half of the arena.
   Destroying an enemy Princess Tower opens that half of the enemy's side to
   deployment for the rest of the battle.
9. Ground units path to the nearest bridge, cross, and continue toward their
   target. Air units ignore the river entirely.
10. A unit engages the first valid enemy that enters its sight range, and
    resumes its advance when that enemy dies. A unit whose targeting is
    buildings-only ignores enemy units completely and is never distracted by
    them.
11. A spell applies its effect once, immediately, at the point it is played, to
    everything within its radius on both sides.

### The roster

12. The roster is exactly eight units across three rarities, and every player
    owns all eight from the first battle. They form the one legal deck, so
    entering a battle requires no decision.
13. The eight between them cover every threat class: at least one win condition,
    at least one answer to a swarm, at least one answer to air, and at least one
    answer to a tank. No unit carries a stat that nothing in the roster can
    exercise — nothing targets air unless something flies.
14. No unit in the roster is without an answer, and no answer is so cheap that
    the unit it answers is unplayable.

### The collection and progression

15. Every unit levels from 1 to 3. Each level adds a fixed percentage to that
    unit's hitpoints and damage, compounding, and changes nothing else.
16. Levelling a unit costs duplicates of that unit and gold. Rarity sets how
    many duplicates and how much gold, and nothing else — a level 3 common and a
    level 3 epic are equally far along their ladders.
17. Towers are fixed strength for both sides and never level. The player's card
    levels and the opponent's card levels are the only things that change.
18. Winning a battle pays gold and duplicate cards immediately, with no timer and
    no wait. Losing pays a smaller amount, so that a losing session still moves.
19. Drawn duplicates are weighted by rarity, so commons arrive ordinarily, rares
    notably, and epics rarely — which is what makes levelling an epic feel
    different from levelling a common when the ladders are otherwise identical.
20. Trophies rise on a win and fall on a loss, and cannot fall below the floor
    of the player's highest reached tier — a bad run costs progress toward the
    next tier, never the tier already earned.
21. Reaching a tier raises opponent difficulty and nothing else. With all eight
    units owned from the start there is nothing for a tier to unlock, and a tier
    that gates nothing is worse than one that gates difficulty.
22. Progression — collection, levels, gold, trophies — is stored server-side
    against the player's account and survives a new device once the account is
    attached to an email.
23. A first-time player is playing within one interaction of arriving. Account
    creation is anonymous and implicit; attaching an email is offered later and
    never blocks play.

### The opponents

24. Every battle is against a named AI opponent, drawn from the set appropriate
    to the player's tier.
25. An opponent's card levels and competence scale with the player's tier, so
    that difficulty tracks progression rather than being outrun by it.
26. An opponent defends before it attacks: it answers a threat in its own half
    before committing elixir to its own push, and it counter-pushes with what
    survives.
27. An opponent's mistakes are legible. When it loses a tower the player can
    tell what it did wrong — overcommitted, answered a swarm with a
    single-target unit, spent its last elixir on the wrong lane. Those mistakes
    are produced by the policy's own configuration rather than bolted on as
    random blunders.

### Determinism

28. The simulation advances on a fixed timestep and produces identical results
    from identical inputs on any device. All randomness derives from a seed
    fixed at the start of the battle.
29. A battle is fully described by its seed and an ordered list of plays, each
    carrying the tick it happened on, which card, and where. A battle can be
    replayed exactly from that record alone — the opponent is inside the
    simulation, so its decisions are derived rather than recorded.
30. Nothing in the simulation reads the wall clock, the frame rate, or the
    device's locale. Rendering may drop frames without changing the outcome.

---

## Implementation Steps

### The arena

The arena is eighteen tiles wide and thirty-two long, in the game's own
coordinates rather than pixels, so that rendering scale is a display concern and
never a simulation one. A river runs across the middle, crossed by two bridges
positioned symmetrically, each three tiles wide. Each side holds two Princess
Towers set forward and left and right of centre, and one King Tower centred
behind them.

Tiles are the unit of distance for every stat below — range, sight, speed. The
arena is not a grid for movement: units move continuously and the tile is only a
measure.

### The simulation

A fixed timestep at twenty ticks per second. **Every stat is expressed in whole
ticks and the simulation never sees seconds** — hit speed, deploy time, spell
duration, building lifetime. Elapsed time is derived from the tick count rather
than accumulated, because accumulation is how a fixed timestep quietly stops
being one. Rendering interpolates between ticks and is free to run at whatever
rate the device manages; the simulation does not care and must not be able to
tell.

Each tick runs a fixed sequence of phases. Fixing that order is what makes the
result reproducible, and changing it later changes the outcome of every stored
battle — so the order is part of the format, and altering it is a versioned
change rather than a refactor. The sequence covers, in order: elixir accrual;
queued plays applied; opponent decisions emitted into the same queue rather than
applied directly; target acquisition; **path and waypoint advance**; movement;
**separation**; attack resolution; damage application; deaths; victory check.

Two of those phases are easy to leave out and expensive to add back:

- **Separation.** Nothing else stops two ground units occupying the same point,
  and units converging on a bridge mouth is the normal case in an arena this
  wide, not an edge case. Movement computed from a single position snapshot
  guarantees the overlap rather than avoiding it.
- **Path advance.** Choosing a bridge and progressing along the route toward it
  is a decision that has to happen somewhere, with its own tie-break for a unit
  equidistant from both.

Both are order-dependent by nature, which is exactly the hazard the rest of the
tick order is built to eliminate. Both must therefore read from a snapshot and
write after, iterate in a fixed entity order, and run a fixed number of passes
rather than to convergence — a loop that runs until it settles will settle after
a different number of passes on a different machine.

**Damage is committed to a buffer and applied in a later phase**, so two units
that kill each other on the same tick both die, rather than whichever holds the
lower identifier surviving. The same applies to a spell landing on something
already dying.

Randomness — deploy scatter for multi-unit cards, tie-breaks between equidistant
targets — comes from a seeded generator carried in the battle state. Nothing
calls a global random source, and nothing reads the clock.

Target selection: each unit holds its current target until that target dies or
leaves its sight range. When it has no target, it takes the nearest valid enemy
within sight range, broken by a stated rule rather than by whichever the loop
reached first, and otherwise continues toward the enemy tower it is advancing on.
A buildings-only unit skips this entirely and only ever advances.

**Attacks travel.** A projectile is an entity in the battle state with its own
advance phase between movement and attack resolution, and its impact commits
into the same damage buffer as a melee hit. A unit may declare zero travel time
and land instantly, which is what melee does.

The decision goes this way round because the two directions are not equally
reversible. Shipping projectiles and giving a unit no travel time is a stat;
shipping instant hits and adding travel later is a state-shape change, a new
phase in the tick order, and a versioned break of both the replay and the
fingerprint format. It is also the more interesting game — a projectile that can
be outrun makes a ranged unit behave differently from one whose damage simply
appears, and three of the eight units are ranged.

### The units

Fourteen units. Roles are fixed by this spec; exact hitpoints, damage and hit
speed are tuning, and belong to implementation against the invariants below.
Names come with the world and are not fixed here.

**Common — six.** These are the vocabulary of every deck.

| Role | Cost | Count | Targets | Notes |
|---|---|---|---|---|
| Swarm | 1 | 3 | Ground | Very fragile, near-free. Distraction and chip. |
| Line infantry | 3 | 1 | Ground | Medium hitpoints, medium damage. The reliable answer. |
| Ranged pair | 3 | 2 | Ground and air | Long range, fragile. The default air answer. |
| Air swarm | 3 | 3 | Ground and air | Flying, fragile, high combined damage. |
| Raider | 2 | 2 | Ground | Very fast, high damage, almost no hitpoints. |
| Light spell | 2 | — | Both sides | Small radius, low damage, brief stun. Clears swarms. |

**Rare — five.** These are what a deck is built *around*.

| Role | Cost | Count | Targets | Notes |
|---|---|---|---|---|
| Tank | 5 | 1 | Buildings only | Very high hitpoints, low damage. Primary win condition. |
| Splash melee | 4 | 1 | Ground | Hits everything around it. The swarm answer. |
| Defensive building | 3 | — | Ground | Limited lifetime, cannot be moved. Pulls tanks off lane. |
| Charger | 4 | 1 | Buildings only | Fast, high single-target damage. Second win condition. |
| Heavy spell | 4 | — | Both sides | Large radius, high damage, chips a tower. |

**Epic — three.** Distinctive rather than strong; scarcity is the rarity, not power.

| Role | Cost | Count | Targets | Notes |
|---|---|---|---|---|
| Splash ranged | 5 | 1 | Ground and air | High area damage at range, very fragile. |
| Bruiser | 7 | 1 | Ground | Huge hitpoints and damage, very slow, splash melee. |
| Air tank | 5 | 1 | Buildings only | Flying, high hitpoints. The air win condition. |

**Balance invariants**, which are what the tuning has to satisfy:

- No single unit answers every threat. Each of swarm, air, and tank has at least
  two distinct answers in the roster, and no unit is an answer to all three.
- A tank pushed alone into an undamaged lane loses to correct defence at even or
  favourable elixir. A tank with support does not.
- Both spells kill at least one whole unit outright at equal level, and neither
  destroys a Princess Tower from full on its own — a spell chips, it does not
  win.
- The cheapest four cards in any legal deck can be cycled fast enough that
  reaching a specific card is a real plan, which is what makes the deterministic
  cycle a skill rather than trivia.

### The towers

Fixed strength for both sides, never levelled. Princess Towers have longer range
and a faster hit speed than the King Tower and target both ground and air. The
King Tower is dormant — it does not acquire targets at all — until it takes
damage or one of its own Princess Towers falls, at which point it behaves as a
slower, longer-lived Princess Tower for the rest of the battle.

Tower placement, range and the deploy line together decide whether a player can
place a unit safely behind their own tower, and that relationship is the single
most load-bearing piece of arena tuning. It is worth getting right before any
unit is tuned at all.

### The opponents

An opponent is a fixed deck plus a described policy, not a search. A policy
holds: what it will spend on defence versus a push, how much elixir it holds
before committing, which unit it prefers as an answer to each threat class, and
how quickly it reacts.

Reaction delay is what makes an opponent beatable and what makes it feel like a
person rather than a reflex. It is a stated property of each opponent, not an
artefact.

Difficulty rises across tiers on three axes: card levels, reaction delay, and
how much elixir the policy wastes. An early opponent overcommits and answers
badly; a late one holds elixir, answers correctly, and punishes a bad push. The
roster of opponents is content, and adding one is a deck plus a policy plus a
name.

### Progression and storage

The game owns a Supabase project. It holds, per account: the collection as owned
units with a count and a level each, gold, trophies, highest tier reached, and
the current deck. The server is authoritative for every write to it.

Accounts are anonymous on creation, so a first-time player plays immediately.
Attaching an email later keeps the same account and its progress. Nothing about
the sign-in flow may sit between arriving and the first battle.

**The battle result is reported by the client, and the client is trusted.**
Against AI opponents a player who falsifies a result only cheats themselves,
which is why this is acceptable now and would not be against another person. It
is recorded here as a known property rather than an oversight: acceptance
criteria 26 to 28 exist partly so that server-side validation stays available as
a later change instead of a rebuild. This mirrors the position the hub already
takes on results in `docs/PROFILE_INTEGRATION.md`.

### The hub ledger

The game is an arcade entry and submits to the hub's ledger under the contract
in `docs/PROFILE_INTEGRATION.md`, which is the single source of truth for it and
must be read before anything is written. The five rules there are binding — in
particular, submission happens after the local write and never blocks play, and
a failed submission is queued and retried on next load rather than lost.

The game mints crowns as its collectible. It reports the day's best rather than
the day's last, which is what makes a retried submission harmless.

Two identities exist and are not linked in phase 1: the game's own account, and
the hub's cookie-scoped player. See the open questions.

### Rendering and the surface

Phone-first, dark, portrait. A battle has a few dozen moving entities at once,
which is a canvas job rather than a DOM one; that makes the battle surface an
interactive client component, which is normal for an app repo even though the
hub itself is entirely server-rendered.

Units are drawn from art this project authors. Fourteen units, three rarities
and a set of tower and arena pieces is a real quantity of work and is on the
critical path for shipping — a geometric, silhouette-first style is what makes
it tractable, and it is a constraint on the art direction rather than an
afterthought.

Surfaces outside the battle: the collection, a unit's own detail and upgrade
view, deck building, the opponent select, and the post-battle result. Plus the
footer link home, which is half the boundary between this repo and the hub.

---

## File Summary

This spec is destined for the game's own repo, generated from
`tycarolan/app-template`. It is drafted here only because the repo is unnamed;
the file summary belongs to the plan, written there.

### Docs

| Path | Changes |
|------|---------|
| `docs/WORKSHOP.md` | Add the repo to the table once it exists |
| `src/lib/projects.ts` | Append the arcade entry — which is also what makes it a known game to the ledger |
| `CHANGELOG.md` | Entry under `## [Unreleased]` |

---

## Gotchas

- **The deterministic simulation is the load-bearing decision in phase 1, and
  it is only cheap if it is made first.** Reading the wall clock, using a global
  random source, or letting the render loop drive the simulation each work
  perfectly against an AI opponent and each make real-time play a rewrite rather
  than an addition. This is the one thing in this spec that is expensive to fix
  later and nearly free to get right now.
- **Tick order is part of the contract, not an implementation detail.**
  Reordering the phases of a tick changes the outcome of every battle and
  invalidates every stored replay. If it has to change, it is a versioned change.
- **Floating-point drift only matters across machines, and only once results
  cross the wire.** Within one device the same code gives the same answer.
  Deciding between fixed-point arithmetic and accepting the risk is worth doing
  deliberately, and the cost of fixed-point is much lower before the simulation
  exists than after.
- **Cross-subdomain identity cannot be tested on a preview deployment.**
  `vercel.app` is on the Public Suffix List, so no cookie spans `*.vercel.app`.
  Ledger submission is testable locally against shared hostnames or in
  production, and nowhere in between.
- **The production origin must reach the hub's `ALLOWED_ORIGINS` or every
  submission returns 403** — and the origin allowlist is enforced on the write,
  not just on the response.
- **A collectible name is permanent once shipped.** Renaming "crowns" later does
  not migrate the rows already stored under the old name; the profile would show
  both.
- **The CI push trigger and the default branch must name the same branch.**
  `master` is the workshop convention. A mismatch runs the gates on pull
  requests and nothing at all on a direct push, which looks healthy from a PR
  and reports nothing the rest of the time.
- **A deck holds eight cards, so the roster cannot be smaller than eight.** This
  is the constraint that sets the size of the whole slice, and it is easy to miss
  when scoping down — "a few units to start" produces a game with no legal deck.
  Eight is simultaneously the smallest playable roster and the largest one that
  needs no deck-building surface.
- **Balance is not a phase.** Eight units interact sixty-four ways, and no amount
  of up-front tuning substitutes for playing it. Building the levers to retune
  quickly matters more than the initial numbers being right — and the stat budget
  formula is that lever, which is why it is specified ahead of any single stat.
- **Card levels against fixed towers can trivialise the game if opponent levels
  do not track the player's tier.** Criterion 23 is what prevents progression
  from outrunning difficulty, and it is easy to leave until last and then find
  the whole middle of the ladder is free.

---

## Done Checklist

- [ ] A battle runs to three minutes with the elixir, tower, crown and sudden
      death rules of criteria 1–5
- [ ] The eight-card deck cycles through a four-card hand with a visible next
      card, deterministically (criteria 6–7)
- [ ] Deployment, pathing, targeting and spells behave per criteria 8–11
- [ ] Eight units exist across three rarities, cover every threat class, and
      satisfy the balance invariants (criteria 12–14)
- [ ] Levelling, rewards, trophies and tiers behave per criteria 15–21
- [ ] Progression persists server-side and survives a new device once an email
      is attached (criteria 22–23)
- [ ] AI opponents behave per criteria 24–27 across every tier
- [ ] A battle replays exactly from its seed and play list (criteria 28–30)
- [ ] Ledger submission follows the five rules in `docs/PROFILE_INTEGRATION.md`
- [ ] Played on a phone, not just compiled
- [ ] `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` pass
- [ ] `CHANGELOG.md` entry added under `## [Unreleased]`
- [ ] The repo added to the hub's `docs/WORKSHOP.md` and to `projects`
- [ ] The production origin added to the hub's `ALLOWED_ORIGINS`

---

## Open Questions

| # | Question | Context | Decision |
|---|----------|---------|----------|
| 1 | What is the game called? | Sets the repo, the subdomain and the permanent slug. Four rounds of candidates have not landed; the working assumption is that a name arrives once the world and its units have some texture. Nothing in this spec depends on it. | Pending |
| 2 | Should the game's account and the hub's player be one identity? | The hub identifies a player by an opaque cookie on the parent domain; the game needs a real account for cross-device progress. Two identities work but mean a player is two people. Linking them means the game reads hub identity, which no app does today. | Pending — two identities in phase 1 |
| 3 | Fixed-point arithmetic, or floating point and accept the drift? | Only matters once two machines have to agree on a result, which is phase 3. Much cheaper to decide before the simulation exists. | Pending — decide before implementation |
| 4 | Who draws fourteen units, three rarities, and the arena? | Art is on the critical path and is not a programming task. A geometric silhouette-first style is what makes it tractable in-house. | Pending |
| 5 | Does the collection carry any daily rhythm? | Every other arcade entry is a daily game and the ledger is shaped around one row per player per day. | **Resolved: no.** Breaking that mould is the point — the daily shape was restricting what the arcade could be. This game is a ladder with no day boundary, and the ledger still fits: it takes a day number the app derives and stores what it is given. See "The daily mould" below. |
| 6 | Hitscan, or projectile travel time? | Three of the eight units are ranged. Retrofitting travel time is a state-shape change, a new tick phase, and a versioned break of both the replay and the fingerprint format. | **Resolved: attacks travel.** A unit may declare zero travel time and land instantly. Chosen because the reverse is not cheaply reversible, and because a projectile that can be outrun is a more interesting ranged unit. |
| 7 | How do ground units resolve overlapping? | Nothing separates two units converging on the same point, and bridge congestion is the normal case rather than an edge case. Any separation pass is order-dependent by nature, which is the exact hazard the rest of the tick order eliminates. | Pending — decide before movement is built |
