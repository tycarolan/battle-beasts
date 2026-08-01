/**
 * The day number, and the boundary it turns over on.
 *
 * ARCADE ONLY. Delete this file and its test for a tool — a tool mints nothing
 * and never talks to the ledger.
 *
 * The hub's ledger stores one row per player, per app, per day, and it records
 * **the day number this app asserts** rather than one the server derives. That
 * is deliberate: a server-derived day would disagree with what the player was
 * shown across most of the planet's time zones. So this number has to be right,
 * and it has to be stable forever.
 *
 * ## What is actually shared, and what is not
 *
 * Shared, and load-bearing: **the boundary is the player's local midnight**, and
 * the algorithm below is how you get there without the result depending on their
 * UTC offset. Both existing games arrived at this independently, and Chroma
 * moved off a UTC boundary specifically to agree with Scuttle — at UTC-5 a UTC
 * rollover handed players tomorrow's puzzle before dinner, which breaks the one
 * thing a daily has to get right.
 *
 * Not shared, despite what `docs/PROFILE_INTEGRATION.md` currently implies:
 * **the epoch**. There is no workshop-wide origin date. Chroma counts from
 * 2026-07-29 with day 1 at the epoch; Scuttle counts from 2026-01-01 with day 0.
 * Their day numbers are six months apart and nothing is wrong with that — the
 * ledger is keyed per app and never compares one app's day 2 to another's. Pick
 * your own epoch below.
 *
 * ## The boundary must not move again
 *
 * Shifting it rewrites which days a player did and did not play, which breaks
 * streaks retroactively and cannot be undone once anything is stored. Both games
 * wrote this warning down. Changing the epoch after launch does the same thing.
 */

/** Milliseconds in a day. */
const DAY_MS = 86_400_000;

/**
 * Day 1. Pick the date this app was built, so the number a player shares is
 * small and legible rather than a five-digit Unix day count. Fixed forever
 * once anything has been stored against it.
 */
const EPOCH_UTC_MS = Date.UTC(2026, 0, 1);

const EPOCH_DAY = Math.floor(EPOCH_UTC_MS / DAY_MS);

/**
 * The day number for an instant. Day 1 is the epoch.
 *
 * Reads the *local* calendar date and re-keys it through `Date.UTC`, which turns
 * a year-month-day into a plain integer day count. That indirection is the whole
 * point: it makes the result depend on which calendar date the player is on and
 * not at all on their offset from UTC, so it is stable across daylight saving
 * and does not drift for players east or west of the meridian.
 *
 * Takes the instant rather than reading the clock, so every caller is explicit
 * about when "now" is and this stays pure and testable.
 */
export function dayNumber(now: Date): number {
  const localDate = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor(localDate / DAY_MS) - EPOCH_DAY + 1;
}

/**
 * Milliseconds from now until the player's day turns over.
 *
 * Next local midnight, found by constructing a date one day later and letting
 * the `Date` constructor normalise it — which is what carries it correctly
 * across the end of a month, the end of a year, and a daylight saving change.
 */
export function msUntilRollover(now: Date): number {
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  return nextMidnight.getTime() - now.getTime();
}
