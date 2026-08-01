/**
 * The twelve. A deck holds eight of them, so there are 495 legal decks.
 *
 * ## How these numbers are built
 *
 * Every duration is a whole number of ticks at 20 per second, and every hit
 * speed divides 400 exactly — the legal set is 10, 16, 20, 25 and 40 ticks. That
 * is not a stylistic choice. A simulation stepping twenty times a second does
 * not deal damage smoothly; it lands a hit every N ticks, and reasoning about
 * these units in damage-per-second produces breakpoints that are simply wrong.
 * Two rounds of balance review died on exactly that mistake. Time-to-kill here
 * is always `ceil(hitpoints / damage) * hitSpeed`, computed in ticks.
 *
 * ## What the roster has to cover
 *
 * Three win conditions — a slow ground tank, a fast cheap runner, and a flyer —
 * so no single one has to survive every counter alone. Two anti-air troops, so
 * air is not answered by one card the deterministic cycle can be counted out of.
 * Swarms, splash, a building, and one spell.
 *
 * ## These numbers are a starting point
 *
 * They are internally consistent, not proven fun. Twelve units interact 144 ways
 * and no amount of arithmetic substitutes for playing it — so the shape here is
 * built to be retuned quickly rather than to be right first time.
 */

/** What a card can shoot at. */
export type Targeting = "ground" | "air" | "both" | "buildings";

/** How a card is acquired, and nothing else. Rarity is scarcity, never power. */
export type Rarity = "common" | "rare" | "epic";

/** A card that puts one or more fighters on the field. */
export type TroopDefinition = {
  kind: "troop";
  id: number;
  code: string;
  name: string;
  rarity: Rarity;
  /** Elixir to play. */
  cost: number;
  /** How many bodies arrive. */
  count: number;
  /** Hitpoints each, at level 1. */
  hitpoints: number;
  /** Damage per hit, at level 1. */
  damage: number;
  /** Ticks between hits. One of 10, 16, 20, 25, 40. */
  hitSpeed: number;
  /** Ticks from acquiring a target to the first hit landing. */
  windup: number;
  /** Ticks a shot spends in the air. Zero for melee. */
  travel: number;
  /** Tiles per second. */
  speed: number;
  /** Tiles it can reach. */
  range: number;
  /** Tiles at which it notices an enemy. */
  sight: number;
  targets: Targeting;
  flies: boolean;
  /** Radius of splash damage on hit. Zero for single-target. */
  splash: number;
  /** Ticks between the card being played and the fighters becoming active. */
  deployTime: number;
  /** How much space it takes, for separation. */
  radius: number;
};

/** A card that places a fixture. It never moves and it expires. */
export type BuildingDefinition = Omit<TroopDefinition, "kind" | "speed"> & {
  kind: "building";
  speed: 0;
  /** Ticks before it falls down on its own. */
  lifetime: number;
};

/** A card that applies its effect once, at a point, and is gone. */
export type SpellDefinition = {
  kind: "spell";
  id: number;
  code: string;
  name: string;
  rarity: Rarity;
  cost: number;
  damage: number;
  /** Tiles affected. */
  radius: number;
  /** Ticks from the tap to the impact. */
  travel: number;
  targets: Targeting;
  /** Fraction of `damage` a tower takes. Spells chip towers; they do not win with them. */
  towerDamageFactor: number;
};

/** Any card. */
export type CardDefinition = TroopDefinition | BuildingDefinition | SpellDefinition;

/**
 * The roster.
 *
 * Ids are positional and permanent — a card's id is stored in decks and in
 * replays, so reordering this array would silently rewrite both.
 */
export const ROSTER: readonly CardDefinition[] = [
  {
    kind: "troop",
    id: 0,
    code: "GRUB",
    name: "Grubs",
    rarity: "common",
    cost: 2,
    count: 4,
    hitpoints: 130,
    damage: 60,
    hitSpeed: 20,
    windup: 10,
    travel: 0,
    speed: 1.25,
    range: 1,
    sight: 5,
    targets: "ground",
    flies: false,
    splash: 0,
    deployTime: 20,
    radius: 0.4,
  },
  {
    kind: "troop",
    id: 1,
    code: "SPEAR",
    name: "Spears",
    rarity: "common",
    cost: 3,
    count: 2,
    hitpoints: 260,
    damage: 90,
    hitSpeed: 16,
    windup: 10,
    travel: 5,
    speed: 1,
    range: 5.5,
    sight: 6.5,
    targets: "both",
    flies: false,
    splash: 0,
    deployTime: 20,
    radius: 0.4,
  },
  {
    kind: "troop",
    id: 2,
    code: "BRUTE",
    name: "Brute",
    rarity: "common",
    cost: 3,
    count: 1,
    hitpoints: 1400,
    damage: 160,
    hitSpeed: 25,
    windup: 15,
    travel: 0,
    speed: 1,
    range: 1.2,
    sight: 5.5,
    targets: "ground",
    flies: false,
    splash: 0,
    deployTime: 20,
    radius: 0.6,
  },
  {
    kind: "troop",
    id: 3,
    code: "BATS",
    name: "Bats",
    rarity: "common",
    cost: 3,
    count: 3,
    hitpoints: 200,
    damage: 95,
    hitSpeed: 16,
    windup: 8,
    travel: 0,
    speed: 1.5,
    range: 1.2,
    sight: 5,
    targets: "both",
    flies: true,
    splash: 0,
    deployTime: 20,
    radius: 0.4,
  },
  {
    kind: "troop",
    id: 4,
    code: "SPLASH",
    name: "Hammer",
    rarity: "rare",
    cost: 4,
    count: 1,
    hitpoints: 1600,
    damage: 240,
    hitSpeed: 25,
    windup: 15,
    travel: 0,
    speed: 1,
    range: 1.2,
    sight: 5.5,
    targets: "ground",
    flies: false,
    splash: 1.5,
    deployTime: 20,
    radius: 0.6,
  },
  {
    kind: "troop",
    id: 5,
    code: "TANK",
    name: "Behemoth",
    rarity: "rare",
    cost: 5,
    count: 1,
    hitpoints: 3600,
    damage: 220,
    hitSpeed: 25,
    windup: 15,
    travel: 0,
    speed: 0.8,
    range: 1.2,
    sight: 5,
    targets: "buildings",
    flies: false,
    splash: 0,
    deployTime: 20,
    radius: 0.8,
  },
  {
    kind: "troop",
    id: 6,
    code: "RUNNER",
    name: "Runner",
    rarity: "rare",
    cost: 4,
    count: 1,
    hitpoints: 1500,
    damage: 320,
    hitSpeed: 25,
    windup: 15,
    travel: 0,
    speed: 1.75,
    range: 1.2,
    sight: 5,
    targets: "buildings",
    flies: false,
    splash: 0,
    deployTime: 20,
    radius: 0.6,
  },
  {
    kind: "troop",
    id: 7,
    code: "MAGE",
    name: "Ashcaster",
    rarity: "epic",
    cost: 5,
    count: 1,
    hitpoints: 700,
    damage: 280,
    hitSpeed: 25,
    windup: 15,
    travel: 6,
    speed: 0.8,
    range: 5,
    sight: 6,
    targets: "both",
    flies: false,
    splash: 1.5,
    deployTime: 20,
    radius: 0.5,
  },
  {
    kind: "troop",
    id: 8,
    code: "SKY",
    name: "Skyhulk",
    rarity: "epic",
    cost: 5,
    count: 1,
    hitpoints: 2200,
    damage: 250,
    hitSpeed: 25,
    windup: 15,
    travel: 0,
    speed: 0.8,
    range: 1.5,
    sight: 5,
    targets: "buildings",
    flies: true,
    splash: 0,
    deployTime: 20,
    radius: 0.7,
  },
  {
    kind: "troop",
    id: 9,
    code: "OGRE",
    name: "Ogre",
    rarity: "epic",
    cost: 7,
    count: 1,
    hitpoints: 3400,
    damage: 600,
    hitSpeed: 40,
    windup: 20,
    travel: 0,
    speed: 0.6,
    range: 1.5,
    sight: 5.5,
    targets: "ground",
    flies: false,
    splash: 1.5,
    deployTime: 20,
    radius: 0.9,
  },
  {
    kind: "building",
    id: 10,
    code: "NEST",
    name: "Nest",
    rarity: "rare",
    cost: 3,
    count: 1,
    hitpoints: 800,
    damage: 140,
    hitSpeed: 16,
    windup: 10,
    travel: 5,
    speed: 0,
    range: 5.5,
    sight: 5.5,
    targets: "ground",
    flies: false,
    splash: 0,
    deployTime: 20,
    radius: 0.8,
    lifetime: 600,
  },
  {
    kind: "spell",
    id: 11,
    code: "BLAST",
    name: "Blast",
    rarity: "common",
    cost: 2,
    damage: 170,
    radius: 2.5,
    travel: 20,
    targets: "both",
    towerDamageFactor: 0.3,
  },
];

/** A card by id. */
export function cardById(id: number): CardDefinition {
  const card = ROSTER[id];
  if (!card) throw new Error(`No card with id ${id}`);
  return card;
}

/** What a card costs to play. */
export function cardCost(id: number): number {
  return cardById(id).cost;
}

/**
 * Hitpoints and damage at a level.
 *
 * Five percent per level, compounding. Deliberately gentler than the ten percent
 * the genre usually uses: towers here never level, so a unit that outgrew them
 * would break the one calibration everything else is measured against.
 */
export function atLevel(base: number, level: number): number {
  return Math.round(base * Math.pow(1.05, level - 1));
}

/** The deck the demo plays with — one of each role that makes a complete game. */
export const DEMO_DECK: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 11];
