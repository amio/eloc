# Dependency Upgrade Design

## 1. Context & Goals

The project is an npm workspace with three package manifests:

- Root CLI package: `package.json`
- Markdown editor package: `packages/md-editor/package.json`
- Presentation web component package: `packages/markdown-deck/package.json`

The goal is to update direct npm dependencies across all manifests to the current `latest` registry dist-tag, regenerate `package-lock.json`, and validate the CLI, package builds, and test suites after the upgrade.

Explicit non-goals:

- Do not change runtime behavior except where required for compatibility with upgraded dependencies.
- Do not introduce new third-party dependencies.
- Do not commit changes.
- Do not rewrite project architecture, packaging, or build scripts unless validation exposes a required compatibility fix.

## 2. Solution

Use npm as the single source of truth because the repository already uses `package-lock.json` lockfile version 3 and npm workspaces.

Upgrade strategy:

1. Query `npm outdated` for the workspace root and workspace packages to identify direct dependencies whose `latest` dist-tag differs from the installed version.
2. Update direct dependency ranges in each owning `package.json` to `^<latest>`.
3. Run `npm install` to regenerate `package-lock.json` and install matching dependency trees.
4. Validate in increasing scope:
   - `npm run build -w markdown-deck`
   - `npm run build -w @amio/md-editor`
   - `npm run build`
   - `npm test -w markdown-deck`
   - `npm run test:e2e`
5. If validation fails, make only the minimum compatibility changes needed for the upgraded APIs or toolchain.

Known direct latest targets from the registry audit:

- `@playwright/test`: `1.60.0`
- `@types/node`: `25.7.0`
- `esbuild`: `0.28.0`
- `fs-extra`: `11.3.5`
- `globby`: `16.2.0`
- `jest`: `30.4.2`
- `lit`: `3.3.3`
- `marked`: `18.0.3`
- `marked-highlight`: `2.2.4`
- `serve`: `14.2.6`
- `serve-handler`: `6.1.7`
- `ts-jest`: `29.4.9`
- `typescript`: `6.0.3`

## 3. Alternatives

Alternative: run `npm update`.

This was rejected because `npm update` only updates within existing semver ranges. It would not move major-version dependencies such as `marked` 17 to 18, `typescript` 5 to 6, or `@types/node` 24 to 25, so it would not satisfy the request to update dependencies to latest.

Alternative: use `npm-check-updates`.

This was rejected because it would add another tool to the process for a small workspace. Native npm commands plus explicit package ownership are sufficient and avoid temporary tooling dependency risk.

## 4. Trade-offs & Risks

- `typescript` 6 is a major upgrade. It can surface stricter type diagnostics or incompatible `ts-jest` behavior.
- `marked` 18 is a major upgrade. Markdown parsing and lexer token shapes may have breaking changes that affect `markdown-deck` rendering and `@amio/md-editor` token ranges.
- `esbuild` 0.28 is a pre-1.0 minor-style breaking surface. Bundle output and defaults must be validated.
- `@types/node` 25 may include Node API typings newer than the current published package engine (`>=16`). If the upgraded dependency tree requires newer runtime support, the engine declaration may need a follow-up decision; this task keeps engine changes out unless validation proves they are required.
- The e2e suite starts the built CLI, so it is the primary guard for integration between the bundled root package and workspace component output.
