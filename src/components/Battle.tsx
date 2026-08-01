"use client";

/**
 * The battle, on screen.
 *
 * ## How this stays out of the simulation's way
 *
 * The battle state lives in a ref, not in React state, and the render loop is a
 * plain `requestAnimationFrame` that never asks React to re-render. Pushing
 * forty entities through React twenty times a second would cost more than the
 * simulation does, and — worse — would make the frame rate something the game
 * could feel.
 *
 * React is used for the four cards and the scoreboard, both refreshed on a slow
 * timer, because neither needs to be right to the tick.
 *
 * ## Three layers, cheapest first
 *
 * The field is painted once into its own bitmap and blitted whole; every beast
 * is rasterised once per size and blitted; only the health bars and the
 * projectiles are drawn from scratch each frame. Which is what buys the field
 * its texture and the beasts their detail at sixty frames a second on a phone.
 *
 * ## The accumulator
 *
 * Frames arrive whenever the browser feels like it; the simulation must not
 * care. Each frame adds elapsed wall time to an accumulator and steps the
 * simulation a whole tick at a time until the debt is paid. What is left over
 * becomes the interpolation factor, so movement looks smooth between ticks
 * without any of that smoothness leaking into the state.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { decide, OPPONENTS, type Opponent } from "@/lib/ai/opponent";
import { canDeployAt } from "@/lib/arena";
import { MAX_ELIXIR, MS_PER_TICK, TICKS_PER_ELIXIR, TICKS_PER_SECOND } from "@/lib/sim/constants";
import { draw, fitViewport, paintField, toTiles, type Trail, type Viewport } from "@/lib/render/draw";
import { Feedback } from "@/lib/render/feedback";
import { clearSpriteCache, paintDesign } from "@/lib/render/sprites";
import {
  createBattle,
  DEFAULT_RULES,
  ticksRemaining,
  type BattleState,
  type Play,
} from "@/lib/sim/state";
import { step } from "@/lib/sim/tick";
import { cardById, DEMO_DECK } from "@/lib/units/roster";

/** What the scoreboard and the hand need, sampled from the state a few times a second. */
type Readout = {
  elixir: number;
  elixirProgress: number;
  slots: number[];
  next: number;
  crowns: [number, number];
  secondsLeft: number;
  phase: BattleState["phase"];
  outcome: BattleState["outcome"];
};

function readoutOf(state: BattleState): Readout {
  return {
    elixir: state.sides[0].elixir.amount,
    elixirProgress: state.sides[0].elixir.progress / TICKS_PER_ELIXIR,
    slots: [...state.sides[0].hand.slots],
    next: state.sides[0].hand.queue[0],
    crowns: [state.sides[0].crowns, state.sides[1].crowns],
    secondsLeft: Math.ceil(ticksRemaining(state) / TICKS_PER_SECOND),
    phase: state.phase,
    outcome: state.outcome,
  };
}

export function Battle({ opponentIndex = 0 }: { opponentIndex?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<BattleState | null>(null);
  const pendingRef = useRef<Play[]>([]);
  const previousRef = useRef<Trail>(new Map());
  const viewRef = useRef<Viewport>({ scale: 1, offsetX: 0, offsetY: 0 });
  const selectedRef = useRef<number | null>(null);
  const feedbackRef = useRef<Feedback>(new Feedback());

  const [selected, setSelected] = useState<number | null>(null);
  const [readout, setReadout] = useState<Readout | null>(null);
  const [seed, setSeed] = useState(1);

  const opponent: Opponent = OPPONENTS[Math.min(opponentIndex, OPPONENTS.length - 1)];

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // One battle per seed. Changing the seed is how "play again" works.
  useEffect(() => {
    const state = createBattle(seed, DEMO_DECK, DEMO_DECK);
    // The opponent's cards are levelled by its tier rather than by the player's.
    for (const card of DEMO_DECK) state.sides[1].levels[card] = opponent.level;
    stateRef.current = state;
    pendingRef.current = [];
    previousRef.current = new Map();
    feedbackRef.current.reset();
    // The render loop publishes the readout on its own timer. Setting it here
    // too would be a synchronous setState inside an effect, which cascades.
  }, [seed, opponent.level]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let frame = 0;
    let last = performance.now();
    let accumulator = 0;
    let sinceReadout = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      viewRef.current = fitViewport(rect.width, rect.height);

      // Sprites are rasterised for a particular pixel size, so a scale change
      // invalidates all of them.
      clearSpriteCache();

      // Repaint the static field into its own bitmap, at device resolution.
      const field = fieldRef.current ?? document.createElement("canvas");
      field.width = canvas.width;
      field.height = canvas.height;
      const fieldCtx = field.getContext("2d");
      if (fieldCtx) {
        fieldCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        paintField(fieldCtx, viewRef.current, rect.width, rect.height);
      }
      fieldRef.current = field;
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const state = stateRef.current;
      if (!state) return;

      // A tab that was backgrounded should not fast-forward the battle.
      const elapsed = Math.min(now - last, 250);
      last = now;
      accumulator += elapsed;
      sinceReadout += elapsed;

      while (accumulator >= MS_PER_TICK) {
        accumulator -= MS_PER_TICK;
        if (state.phase === "ended") break;

        previousRef.current = new Map(
          state.entities.map((e) => [e.id, { x: e.x, y: e.y }]),
        );

        const decision = decide(state, 1, opponent);
        if (decision) {
          pendingRef.current.push({
            ...decision,
            tick: state.tick + opponent.reactionDelay,
          });
        }

        const forThisTick = pendingRef.current.filter((p) => p.tick <= state.tick + 1);
        pendingRef.current = pendingRef.current.filter((p) => p.tick > state.tick + 1);

        step(state, DEFAULT_RULES, forThisTick);
        feedbackRef.current.observe(state);
      }

      feedbackRef.current.age(elapsed / 1000);

      const rect = canvas.getBoundingClientRect();
      const field = fieldRef.current;
      if (field) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(field, 0, 0);
        ctx.restore();
      }

      draw(
        ctx,
        state,
        viewRef.current,
        previousRef.current,
        Math.min(1, accumulator / MS_PER_TICK),
        selectedRef.current !== null,
        feedbackRef.current,
      );

      if (sinceReadout > 100) {
        sinceReadout = 0;
        setReadout(readoutOf(state));
      }
      void rect;
    };

    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, [opponent]);

  const onCanvasPointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    const state = stateRef.current;
    const slot = selectedRef.current;
    if (!state || slot === null || state.phase === "ended") return;

    const rect = event.currentTarget.getBoundingClientRect();
    const point = toTiles(
      viewRef.current,
      event.clientX - rect.left,
      event.clientY - rect.top,
    );

    if (!canDeployAt(0, point.x, point.y, state.sides[0].openedLanes)) return;

    pendingRef.current.push({
      tick: state.tick + 1,
      side: 0,
      slot,
      x: point.x,
      y: point.y,
    });
    setSelected(null);
  }, []);

  return (
    <div className="flex h-dvh w-full flex-col bg-[#0a0c11] text-[#e9e3d5]">
      <Scoreboard readout={readout} opponent={opponent} />

      <canvas
        ref={canvasRef}
        onPointerDown={onCanvasPointerDown}
        className="min-h-0 w-full flex-1 touch-none"
      />

      <Hand
        readout={readout}
        selected={selected}
        onSelect={setSelected}
        onRestart={() => {
          setSelected(null);
          setSeed((s) => s + 1);
        }}
      />
    </div>
  );
}

/** A beast, drawn small, for a card face. */
function CardFace({ cardId, size = 44 }: { cardId: number; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    paintDesign(ctx, cardId, 0, 0, 0, size);
  }, [cardId, size]);

  return <canvas ref={ref} style={{ width: size, height: size }} aria-hidden="true" />;
}

function Scoreboard({ readout, opponent }: { readout: Readout | null; opponent: Opponent }) {
  if (!readout) return <div className="h-11" />;

  const minutes = Math.floor(readout.secondsLeft / 60);
  const seconds = readout.secondsLeft % 60;

  return (
    <div className="flex items-center justify-between px-4 py-2 text-sm">
      <div className="flex items-center gap-2">
        <Crowns count={readout.crowns[1]} colour="#d1594a" />
        <span className="text-[#8d887b]">{opponent.name}</span>
      </div>
      <div className="font-mono tabular-nums">
        {readout.phase === "suddenDeath" && (
          <span className="mr-2 text-[#ffd479]">SUDDEN DEATH</span>
        )}
        {minutes}:{String(seconds).padStart(2, "0")}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[#8d887b]">You</span>
        <Crowns count={readout.crowns[0]} colour="#4aa6d6" />
      </div>
    </div>
  );
}

/** Three pips, filled as towers fall. Always three, so the stake is always visible. */
function Crowns({ count, colour }: { count: number; colour: string }) {
  return (
    <span className="flex gap-[3px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 rotate-45"
          style={{
            background: i < count ? colour : "transparent",
            border: `1px solid ${i < count ? colour : "#3a3f4a"}`,
          }}
        />
      ))}
    </span>
  );
}

function Hand({
  readout,
  selected,
  onSelect,
  onRestart,
}: {
  readout: Readout | null;
  selected: number | null;
  onSelect: (slot: number | null) => void;
  onRestart: () => void;
}) {
  if (!readout) return <div className="h-36" />;

  if (readout.phase === "ended") {
    const outcome = readout.outcome;
    const label =
      outcome?.winner === 0 ? "You win" : outcome?.winner === 1 ? "You lose" : "Draw";
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-7">
        <div className="font-serif text-3xl">{label}</div>
        <div className="text-sm text-[#8d887b]">
          {readout.crowns[0]}–{readout.crowns[1]} · {outcome?.reason}
        </div>
        <button
          onClick={onRestart}
          className="rounded-md bg-[#4aa6d6] px-7 py-2 font-medium text-[#0a0c11] transition-colors hover:bg-[#8fd6f5]"
        >
          Play again
        </button>
      </div>
    );
  }

  return (
    <div className="px-3 pb-4 pt-1">
      <div className="mb-2 flex items-center gap-2">
        <div className="relative h-3 flex-1 overflow-hidden rounded-sm bg-[#1a1420]">
          <div
            className="h-full bg-gradient-to-r from-[#8c3fb0] to-[#c060e0]"
            style={{
              width: `${((readout.elixir + readout.elixirProgress) / MAX_ELIXIR) * 100}%`,
            }}
          />
          {/* Ten notches, so the bar is countable rather than only proportional. */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: MAX_ELIXIR }, (_, i) => (
              <div key={i} className="flex-1 border-r border-[#0a0c11]/70 last:border-r-0" />
            ))}
          </div>
        </div>
        <span className="w-5 text-right font-mono text-sm tabular-nums text-[#c060e0]">
          {readout.elixir}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {readout.slots.map((cardId, slot) => {
          const card = cardById(cardId);
          const affordable = card.cost <= readout.elixir;
          const isSelected = selected === slot;
          return (
            <button
              key={slot}
              disabled={!affordable}
              onClick={() => onSelect(isSelected ? null : slot)}
              className={[
                "relative flex flex-col items-center gap-0.5 rounded-md border pb-1.5 pt-2 transition-colors",
                isSelected
                  ? "border-[#8fd6f5] bg-[#16283a]"
                  : "border-[#242a36] bg-[#12161e]",
                affordable ? "opacity-100" : "opacity-30 grayscale",
              ].join(" ")}
            >
              <span
                className="absolute right-1 top-1 font-mono text-[10px] font-semibold text-[#c060e0]"
                aria-hidden="true"
              >
                {card.cost}
              </span>
              <CardFace cardId={cardId} />
              <span className="text-[10px] leading-tight text-[#c8c2b4]">{card.name}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[11px] text-[#8d887b]">
        <span>Next</span>
        <span className="scale-[0.55] origin-center">
          <CardFace cardId={readout.next} size={30} />
        </span>
        <span className="text-[#c8c2b4]">{cardById(readout.next).name}</span>
        {selected !== null && <span className="ml-1">· tap your half</span>}
      </div>
    </div>
  );
}
