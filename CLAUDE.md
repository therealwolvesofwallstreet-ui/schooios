# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

The repo root is mostly empty scaffolding. **All application code lives in `web/`** — a Next.js app. Run every command below from inside `web/`, not the repo root. The root `package.json` is empty; the real manifest is `web/package.json`.

The active branch is `feature/backend`, but no backend exists yet — the project is currently a frontend-only Next.js scaffold awaiting backend work.

## Commands (run from `web/`)

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint (flat config in `web/eslint.config.mjs`)

There is no test runner configured yet.

## Critical: this is Next.js 16, not the Next.js you may know

`web/package.json` pins **Next.js 16.2.7** and **React 19.2.4** — newer than most training data. APIs, conventions, and file structure may differ from what you expect, and deprecation notices matter.

Before writing or changing any Next.js code, read the relevant guide in `web/node_modules/next/dist/docs/` (organized as `01-app/`, `02-pages/`, `03-architecture/`). This is the version-accurate source of truth and supersedes recalled API knowledge.

## Architecture notes

- **App Router** under `web/src/app/` (`layout.tsx` is the root layout, `page.tsx` the home route). No `pages/` directory.
- **Tailwind CSS v4** via `@tailwindcss/postcss` (`web/postcss.config.mjs`). There is no `tailwind.config.*` file — v4 is configured through CSS, not JS config.
- **Path alias**: `@/*` maps to `web/src/*` (see `web/tsconfig.json`).
- TypeScript runs in `strict` mode.

## Agent rules files

`web/CLAUDE.md` imports `web/AGENTS.md`, which carries the same Next.js 16 warning above. Keep those in sync if the guidance changes.
