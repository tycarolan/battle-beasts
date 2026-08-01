/**
 * The starting surface.
 *
 * Replace the body freely. The footer is the part to keep: `docs/WORKSHOP.md`
 * in the hub states that an app "links back via the hub link in its footer" as
 * one half of the boundary between the repos, and half the existing apps quietly
 * do not — which is how a documented rule becomes a false one.
 */
export default function Page() {
  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col justify-center gap-3 px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight">App Template</h1>
        <p className="max-w-prose text-sm text-muted">
          Generated from{" "}
          <span className="font-mono text-foreground">TaioTech/app-template</span>
          . Work through the checklist in the README, then delete this page.
        </p>
      </div>

      <footer className="flex items-baseline justify-between border-t border-line px-4 py-3 text-xs text-muted">
        <a
          href="https://taiotech.com"
          className="transition-colors hover:text-foreground"
        >
          taiotech.com
        </a>
      </footer>
    </main>
  );
}
