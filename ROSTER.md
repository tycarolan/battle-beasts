# A rejected balance proposal — NOT the shipped roster

> **This document does not describe the game.** It designs **eight archetypes**
> that were never implemented. The game ships **twelve named beasts**, and
> `src/lib/units/roster.ts` is the only source of truth for them. No number
> below appears anywhere in the code.
>
> It is kept because the *method* is worth reusing — integer-only budgeting
> against a discrete tick, and two adversarial passes that caught real errors —
> not because its conclusions stand. A future balance pass should start from the
> method and the three blocking problems, applied to the twelve units that
> actually exist.

**Do not implement this.** Two independent adversarial passes have now run over
it and both returned NEEDS_WORK, with three blocking problems still open. It is
recorded here because the *method* is right and the arithmetic is reproducible —
a third pass should correct this rather than start again.

## What is now solid

The second attempt fixed the thing that invalidated the first. The original
design reasoned in continuous damage-per-second, which a twenty-tick-per-second
simulation does not produce: a unit does not deal damage smoothly, it lands a
hit every N ticks. Every breakpoint computed that way was wrong, and some
interactions inverted once recomputed discretely.

The current design has no damage-per-second in it anywhere, not even as a display
column. The budget's damage term is damage-per-hit × (400 ÷ hit-speed-in-ticks),
and the legal hit speeds — 10, 16, 20, 25, 40 ticks — are chosen so that 400
divides by each exactly. The budget is therefore integer arithmetic end to end,
and continuous damage cannot re-enter the design by accident.

Both verifiers independently rebuilt the core tower race and reproduced it
exactly, which is the first time any number here has survived an independent
recomputation.

Two further methodological corrections worth keeping:

- **Fixtures are not priced by the card budget.** Towers have no elixir cost,
  cannot be deployed and are never drafted against a card, so pricing them in
  card currency was decorative — and could be made to say either thing depending
  on which modifiers were quietly applied. Tower stats are set by two empirical
  constraints instead.
- **The empirical-grounding claim was withdrawn.** The first attempt cited six
  external reference points as evidence for its modifier set, and two of them
  numerically refuted it. The constant is now stated honestly as what it is: one
  number back-solved from one internal calibration.

## The roster

Role labels and codes only. Names are deliberately absent — see the naming note
at the bottom.

| Code | Role | Rarity | Elixir | Count | HP each | Damage/hit | Hit speed (ticks) | Windup | Travel | Move (tiles/s) | Range | Sight | Targets | Flies |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| WC | Win condition / tank | Epic | 5 | 1 | 3650 | 230 | 25 | 15 | 0 | 0.8 | 1.0 | seeks buildings | buildings only | no |
| SPL | Ranged splash support | Rare | 4 | 1 | 840 | 245 | 25 | 12 | 6 | 0.8 | 4.5 | 6.0 | ground + air | no |
| ASN | Anti-tank bruiser | Epic | 4 | 1 | 1362 | 470 | 40 | 20 | 0 | 1.25 | 1.5 | 5.5 | ground | no |
| FLY | Air swarm | Rare | 4 | 3 | 248 | 113 | 16 | 8 | 3 | 1.25 | 3.0 | 5.0 | ground + air | yes |
| AAM | Ranged anti-air pair | Common | 4 | 2 | 467 | 105 | 16 | 10 | 5 | 1.0 | 5.5 | 6.5 | ground + air | no |
| BLD | Defensive building | Rare | 3 | 1 | 790 | 140 | 16 | 10 | 5 | static | 5.5 | 5.5 | ground | no |
| SWM | Ground swarm | Common | 2 | 5 | 120 | 57 | 20 | 10 | 0 | 1.25 | 1.0 | 5.0 | ground | no |
| SPELL | Area spell | Common | 2 | — | — | 150 | — | — | 20 | — | radius 3.0 | — | ground + air | — |

Twenty-eight elixir across eight cards, averaging 3.5.

## The three blocking problems

1. **The win condition is answered at minus one elixir by four separate
   four-cost cards, with no attrition.** It cannot target troops, and its death
   blast only kills the ground swarm. So the card the whole calibration is built
   around is unplayable, and this is the *same* blocking problem the first
   attempt had. Two attempts failing the same way is a signal that the win
   condition's kit is wrong, not its numbers.

2. **The proof that a level-3 win condition cannot threaten a second tower is
   wrong**, on both pathing and geometry. That check is the only thing rescuing
   "towers never level" from the fact that units do level and towers do not, and
   the design nominates it as a standing regression test — so it would have been
   enshrined incorrect.

3. **The air-cover cycle window uses the wrong cycle depth.** It is seven elixir
   and 19.6 seconds, not four and 11.2. The air hole is roughly seventy-five
   percent wider than published, and this number was offered as the fix for the
   first attempt's blocking air hole.

## The finding that reaches back into the spec

> Rarity as scarcity has no expression in a game with exactly one legal deck,
> and the forced mirror gives both players perfect information about the
> opponent's hand.

This is a real cost of the eight-unit slice that the spec does not currently
acknowledge, and it is worth a decision rather than a footnote.

With exactly eight units, both sides run the identical deck every match. Some of
that is defensible — chess is a mirror, and a symmetric start is a legitimate way
to test whether a battle system is any good. What is *not* defensible is rarity:
with one legal deck every unit must be owned and every unit is played, so rarity
reduces to a grind-rate knob with no decision attached to it. Three rarities in
the slice currently buy nothing.

Two ways out, and they are genuinely different games:

- **Drop rarity from the slice.** Keep eight units, accept the mirror, and let
  rarity arrive with the ninth unit and deck building. Smallest change, and it
  makes the slice honest about what it is: a test harness for the battle.
- **Grow the roster to ten or twelve.** Restores deck choice, gives rarity
  something to mean, and costs a deck-building surface the slice was drawn
  specifically to avoid.

## Naming

No unit carries a name here, deliberately. The first attempt proposed **Bastion**,
which is a live registered United States trademark of Supergiant Games for video
game software — caught only because a verifier searched for it.

Both naming reviews also found that the collision checking being used was unsafe:
it was run against the wrong set of Nice classes, omitting class 9 (downloadable
game software) — which is the class this game would actually file in. Any name,
for a unit or for the game, needs checking against classes 9, 28 and 41 before it
is written into anything.
