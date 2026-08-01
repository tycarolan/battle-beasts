import { Battle } from "@/components/Battle";

/**
 * The demo.
 *
 * One battle against one opponent, and no menu in front of it. Everything else
 * — the collection, the ladder, deck building — exists in the spec and not yet
 * in the code, and a menu leading to the one thing that works is dressing.
 *
 * The footer link home is kept deliberately: `docs/WORKSHOP.md` in the hub
 * states that an app links back from its footer as one half of the boundary
 * between the repos, and half the existing apps quietly do not — which is how a
 * documented rule becomes a false one.
 */
export default function Page() {
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <Battle opponentIndex={0} />
      <footer className="flex items-baseline justify-between border-t border-line px-4 py-2 text-xs text-muted">
        <a
          href="https://taiotech.com"
          className="transition-colors hover:text-foreground"
        >
          taiotech.com
        </a>
        <span>Battle Beasts — prototype</span>
      </footer>
    </main>
  );
}
