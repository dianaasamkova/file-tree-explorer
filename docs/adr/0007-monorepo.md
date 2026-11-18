# 0007. A monorepo with a design system, a feature and an app

- **Status:** Accepted
- **Date:** 2026-11

## Context

In a product team, several features share one design system and are hosted by an app shell. A single-package repo can't show or enforce those boundaries.

## Options

1. **One package with folders.** Simple, but nothing stops a component from importing anything.
2. **npm workspaces and Turborepo:** `apps/web`, `packages/ui`, `packages/file-tree`, `packages/config`.

## Decision

Option 2. Packages ship TypeScript source (no build step per package); the app's Vite build compiles them. Lint enforces the dependency direction (the design system can't import a feature, a feature can't import an app) and bans deep imports into another package's files. Each package has its own tests and coverage thresholds; Turborepo caches typecheck, test and build.

## Consequences

- Boundaries are visible and enforced; the feature could be hosted by another app (planned: as a federated module).
- More configuration; Tailwind has to be told to scan the packages, which an end-to-end test caught during the split.
