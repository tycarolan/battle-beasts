/**
 * The numbers the simulation is built on, and the ones that cannot move.
 *
 * Every value here is part of the battle format. Changing one changes the
 * outcome of every battle already recorded, so a change is a `SIM_VERSION` bump
 * rather than a tweak — see {@link SIM_VERSION}.
 */

/**
 * The battle format's version.
 *
 * Bump this whenever anything that affects a battle's outcome changes: a
 * constant here, the phase order in a tick, a stat, or the arithmetic anywhere
 * in the simulation. A recorded battle is only replayable against the version
 * that produced it, and a stored replay carries this number so a mismatch is
 * detectable rather than silently wrong.
 */
export const SIM_VERSION = 1;

/**
 * Simulation ticks per second.
 *
 * Twenty is fast enough that the quickest unit does not visibly step between
 * ticks once rendering interpolates, and slow enough to stay cheap on a
 * mid-range phone and cheap to send over a wire later.
 *
 * Nothing in the simulation ever sees seconds. Every duration below is a whole
 * number of ticks, and elapsed time is derived from the tick count rather than
 * accumulated — accumulating a timestep is how a fixed timestep quietly stops
 * being fixed.
 */
export const TICKS_PER_SECOND = 20;

/** Milliseconds of wall time one tick represents. Rendering's concern, not the simulation's. */
export const MS_PER_TICK = 1000 / TICKS_PER_SECOND;

/** Regular time: three minutes. */
export const REGULAR_TICKS = 180 * TICKS_PER_SECOND;

/**
 * The tick double elixir begins on — two minutes in, so the last minute of
 * regular time runs at double rate.
 */
export const DOUBLE_ELIXIR_FROM_TICK = 120 * TICKS_PER_SECOND;

/** Sudden death: one further minute, at double elixir throughout. */
export const SUDDEN_DEATH_TICKS = 60 * TICKS_PER_SECOND;

/** Elixir both sides start a battle holding. */
export const STARTING_ELIXIR = 5;

/** The most elixir either side can hold. Regeneration keeps running; the overflow is discarded. */
export const MAX_ELIXIR = 10;

/**
 * Ticks to regenerate one elixir at the single rate — 2.8 seconds.
 *
 * Chosen to divide exactly into {@link TICKS_PER_SECOND} so that regeneration is
 * whole-number arithmetic with no remainder to carry, and so that the double
 * rate is exactly half rather than a rounded approximation of it.
 */
export const TICKS_PER_ELIXIR = 56;

/** Arena width in tiles. */
export const ARENA_WIDTH = 18;

/** Arena length in tiles. */
export const ARENA_HEIGHT = 32;
