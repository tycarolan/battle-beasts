# app-template

> The standard starting point for a TaioTech app.

Generate a new repo from this one, work the checklist below, and the app
inherits the workshop's conventions rather than reconstructing them from
whichever repo was copied last.

This template encodes what the existing apps **actually converged on**, not a
design from scratch. Where they disagreed, it takes the side that was ahead and
says so. The evidence is in `docs/TEMPLATE_AUDIT.md` in `TaioTech/taiotech`,
which is also the standing list of what each existing repo still owes.

## What you get

| | |
|---|---|
| **Quality gates** | `typecheck`, `lint`, `test`, `build` — the four every app runs |
| **CI** | GitHub Actions on push to `master` and on every PR, Node 24, cancel-in-progress |
| **Pinned stack** | Next 16.2.12, React 19.2.4, Tailwind v4, TypeScript strict — the versions all five repos share |
| **Config** | `tsconfig.json` byte-identical to every other repo; eslint, `.editorconfig`, `.gitignore`, `.nvmrc` |
| **Palette** | The five shared TaioTech tokens and the `@theme inline` mapping |
| **Orientation** | `AGENTS.md` canonical, `CLAUDE.md` importing it — one copy, not two that drift |
| **Spec workflow** | Three slash commands, the guide, and both templates |
| **The link home** | A footer linking back to taiotech.com, wired up rather than described |
| **Ledger day number** | `src/lib/day.ts` — the local-midnight boundary the hub's ledger requires |

## Setup checklist

Work top to bottom. Nothing here is optional except where it says so.

### 1. Name the app

- [ ] `package.json` → `name`
- [ ] `.claude/launch.json` → `name`
- [ ] `src/app/layout.tsx` → every string in `metadata`, and the subdomain in
      `metadataBase` and `openGraph.url`
- [ ] `README.md` → replace this file entirely with the app's own
- [ ] `CHANGELOG.md` → keep the format, replace the entry

### 2. Decide what kind of app it is

- [ ] **Tool** — delete `src/lib/day.ts` and `src/lib/day.test.ts`. A tool mints
      nothing and never talks to the ledger.
- [ ] **Arcade** — keep them, set your own epoch in `day.ts`, and read
      `docs/PROFILE_INTEGRATION.md` in `TaioTech/taiotech` before writing a
      submission. Link to it from `AGENTS.md`; do not restate it.

### 3. Write the orientation

- [ ] `AGENTS.md` — replace every `TEMPLATE:` block. An `AGENTS.md` still
      describing the template is worse than none, because a session will believe
      it.
- [ ] `src/app/globals.css` — replace the dark-only rationale paragraph with the
      reason that is true for *this* app. Every repo in the workshop writes its
      own; they are not the same reason.
- [ ] `src/app/layout.tsx` — decide on the `viewport` zoom lock. It is right for
      an app with controls at the screen edge and an accessibility regression for
      anything text-first.
- [ ] `src/app/globals.css` — uncomment the mobile-gesture block if this is a
      phone-first app that owns the whole screen.

### 4. Make the surface yours

- [ ] Replace `src/app/page.tsx`, but **keep the footer link to taiotech.com**.
      `docs/WORKSHOP.md` states that an app links home from its footer as one
      half of the boundary between the repos — and half the existing apps
      quietly do not, which is how a documented rule became a false one.

### 5. Ship it

- [ ] `npm install`
- [ ] `npm run typecheck && npm run lint && npm run test && npm run build`
- [ ] Push to GitHub with **`master` as the default branch**. The CI workflow
      triggers on `master`, and the two have to agree — a workflow naming a
      branch the repo does not have runs on pull requests and never on a push,
      which looks healthy from a PR and reports nothing.
- [ ] Create the Vercel project, point `<app>.taiotech.com` at it
- [ ] **Arcade only**: get the production origin into the hub's
      `ALLOWED_ORIGINS`, or every submission returns 403
- [ ] Add the project to `projects` in `src/lib/projects.ts` in the hub — one
      appended object; there is no route or markup to write. For an arcade
      entry this is also what makes it a known game to the ledger.
- [ ] Add the repo to the table in the hub's `docs/WORKSHOP.md`

## Quick start

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:3000.

Before pushing:

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

## Deviating from the template

The template is a starting point, not a cage. Adding an app-specific palette
token, a dependency that earns its place, or a test setup this app actually
needs is normal work.

What is worth not doing casually, because each has already cost something:

- **Letting the CI trigger and the default branch disagree.** The workflow's
  `on: push: branches:` must name the branch this repo actually uses. When it
  doesn't, pull requests still run the gates and every direct push to the default
  branch runs nothing — so the repo looks healthy from a PR and silently reports
  nothing the rest of the time. Cornerman sat like that from its first commit:
  workflow on `main`, default branch `master`. If you ever rename the default
  branch, this file and the workflow move with it.
- **Renaming or removing one of the five palette tokens.** Extend below them —
  Scuttle's `--sand` and `--shell` are the pattern working as intended.
- **Dropping the `.claude/**` ignore from the eslint config.** One stray worktree
  checkout put 13,095 problems in front of the handful from `src/`, which is the
  same as having no lint gate at all.
- **Moving orientation into `CLAUDE.md`.** One canonical file and one pointer;
  two canonical files drift, and Vision is the worked example.
- **Putting rules inside components.** The test config only covers `src/lib/`
  because that is where the rules are meant to live. Breaking that split makes
  a green suite mean less than it looks like it does.
- **Pointing a comment at a file outside the repo.** Vision's `globals.css`
  names an absolute local path as its canonical palette source; that file has
  never been committed anywhere, so no clone and no CI run can open it.

## Pointers

- `AGENTS.md` — agent orientation for this repo
- `docs/SPEC_DRIVEN_DEVELOPMENT.md` — when a spec is required
- `TaioTech/taiotech` → `docs/WORKSHOP.md` — every repo and the boundary between
  them
- `TaioTech/taiotech` → `docs/TEMPLATE_AUDIT.md` — what this template encodes and
  why
- `TaioTech/taiotech` → `docs/PROFILE_INTEGRATION.md` — the ledger contract
