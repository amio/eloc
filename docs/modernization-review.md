# Modernization Review

## Background

This document records the modernization review and follow-up cleanup for `eloc`. The goal is to replace obsolete implementation patterns with modern Node/browser platform APIs or smaller dependencies while preserving current CLI behavior.

The first pass removed unused direct dependencies and small deprecated browser idioms. The second pass intentionally raises the Node runtime floor to Node 22 so the CLI can use modern `node:` imports, `fs/promises`, async request body iteration, and WHATWG URL parsing without compatibility shims.

## Current architecture

`eloc` is an npm workspace with three main packages:

- Root package `eloc`: CLI, static build, and local presentation server.
- Workspace `packages/markdown-deck`: Lit-based presentation web component.
- Workspace `packages/md-editor`: standalone markdown editor web component.

Root CLI modules:

- `src/index.ts`: CLI entry point. Uses `mri` for argument parsing and `kleur` for terminal styling, then dispatches to serve or build mode.
- `src/serve.ts`: Node HTTP server. It now uses native routing and JSON parsing plus `sirv` for static file serving.
- `src/build.ts`: static export. It now uses `node:fs/promises` instead of `fs-extra`.
- `src/assets.ts`: embeds the bundled `markdown-deck` component and optional editor helper script into generated HTML.
- `src/editing.js`: browser-side save shortcut and toast UI embedded into served/built HTML.

Workspace modules:

- `packages/markdown-deck/src/markdown-deck.ts`: Lit-based deck component with slide navigation, hash sync, printing mode, editor mode, CSS loading, and font injection.
- `packages/markdown-deck/src/markdown-slide.ts`: Lit-based slide renderer using `marked`, `marked-highlight`, and `prismjs`.
- `packages/markdown-deck/src/utils.ts`: markdown slide splitting and editor range utilities.
- `packages/md-editor/src/index.ts`: standalone markdown editor using `marked.lexer`, `contenteditable`, and the CSS Custom Highlight API.

Build and validation setup:

- Root `build` bundles `src/index.ts` with esbuild for Node.
- Root `prebuild` builds `markdown-deck`, clears `dist`, creates `dist`, and copies `src/editing.js`.
- Root `test:e2e` runs Playwright against the built CLI server.
- `markdown-deck` has Jest utility tests and an esbuild IIFE bundle.
- `md-editor` has an esbuild ESM bundle.

## Completed modernization

### Dependency surface cleanup

Removed unused direct root dev dependencies:

- `@vercel/ncc`
- `micromatch`
- `@types/micromatch`

`micromatch` remains transitively through `globby`/`fast-glob`, which is expected.

### Server stack consolidation

Replaced the previous three-package local server stack with one focused library plus Node 22 platform APIs:

- Removed routing/body/static stack:
  - `micro-fork`
  - `micri`
  - `serve-handler`
  - `@types/serve-handler`
- Added:
  - `sirv` for static file serving
  - `sirv-cli` for the `markdown-deck` preview command, replacing the heavier `serve` dev tool
- Implemented with native Node 22 APIs:
  - request routing via `node:http` and `URL`
  - JSON body reading via async iteration over `IncomingMessage`
  - save writes via `node:fs/promises`

The served routes remain intentionally small:

- `GET /` and `HEAD /`: generated presentation HTML with editor enabled.
- `POST /api/save`: save live editor markdown back to the source file.
- `GET`/`HEAD` fallback: static files from the current working directory.

### Server library research

Compared candidates for replacing the old server trio:

| Candidate | Role | Direct dependency profile | Fit |
| --- | --- | --- | --- |
| `sirv` | Static file middleware | ~22 KB unpacked, 3 small deps | Best fit: lets this project keep routing/body parsing native and delegate only safe static-file edge cases. |
| `polka` | Micro router/server | ~25 KB unpacked, 2 deps | Would replace routing, but static serving still needs another library or custom implementation. |
| `hono` + Node adapter | Full web framework | adapter plus framework | Excellent API, but more framework than this CLI needs. |
| `h3` | Full HTTP framework | larger framework package | Too broad for three routes. |
| `@tinyhttp/app` | Express-like app | several framework deps | More API and dependency surface than needed. |

Chosen approach: `sirv` only. It preserves robust static file behavior and keeps routing/body handling in a short local function using modern Node APIs.

### Node 22 floor and `fs-extra` removal

Raised the root `engines.node` requirement from `>=16` to `>=22` and documented the new runtime floor in the README.

Removed direct root dependencies:

- `fs-extra`
- `@types/fs-extra`

`src/build.ts` now uses:

- `fs.promises.cp` for copying matched deck/assets files.
- `fs.promises.mkdir` with `recursive: true` before writes/copies.
- `fs.promises.writeFile` for generated `index.html`.

### Deployment script cleanup

Removed legacy `now-build` scripts from:

- root `package.json`
- `packages/markdown-deck/package.json`

The remaining build paths are explicit:

- root `npm run build`
- `npm run build -w markdown-deck`
- `npm run build-deck -w markdown-deck`

### Legacy hosted URL cleanup

Validated and updated legacy hosted links:

- `https://eloc-screenshot.vercel.app` returned 200 and replaced the old screenshot URL.
- `https://eloc.vercel.app/#6` returned 200 and replaced the old demo URL.
- `https://el-capitan.vercel.app` returned 200 and replaced old background-image demo URLs.
- `https://markdown-deck.vercel.app` returned 200 and replaced the old Vercel alias target.
- PackagePhobia's old URL redirected to a Vercel-hosted endpoint but returned 429 from the Vercel security checkpoint in automated validation. The README install-size link was moved to `https://pkg-size.dev/eloc`, which returned 200.

## Deferred items

Defer these until a clear product or maintenance need appears:

- Changing TypeScript module resolution or package output formats.
- Integrating `@amio/md-editor` into the CLI live editor.
- Changing markdown parsing, slide splitting behavior, or `marked` token processing.
- Reworking presentation rendering, font loading, or syntax highlighting.
- Broad dependency replacement for `mri`, `kleur`, `globby`, `open`, `marked`, `lit`, or `prismjs` without a clear benefit.

## Risks and mitigations

- Static serving behavior can regress around path decoding, directory traversal, content types, conditional requests, or cache headers. Mitigation: use `sirv` rather than handwritten static serving and keep `Cache-Control: no-cache`.
- Save behavior can regress if body parsing changes. Mitigation: keep the same `/api/save` JSON shape and cover it with Playwright.
- Raising Node to 22 is a breaking runtime requirement for old environments. Mitigation: the package manifest now states the new engine floor explicitly.
- Removing deployment scripts can break external deployment settings if they still call those exact script names. Mitigation: current repo build scripts are explicit; external deployment configuration should call `npm run build` or the workspace `build-deck` path directly.
- Hosted URL checks can be affected by bot protection. Mitigation: only URLs that returned 200 were used directly, except the PackagePhobia page, which was replaced with a different validated package-size page.

## Validation plan

Run validation in increasing scope after server/build dependency changes:

1. Dependency and install sanity:
   - `npm install`
   - `npm ls --depth=0 --workspaces --include-workspace-root`
   - Confirm removed packages are no longer root-owned direct dependencies.
2. Package builds:
   - `npm run build -w markdown-deck`
   - `npm run build -w @amio/md-editor`
   - `npm run build`
3. Package tests:
   - `npm test -w markdown-deck`
4. CLI smoke tests:
   - `node dist/index.js --help`
   - `node dist/index.js --version`
   - `node dist/index.js build deck.md -o public-modernization-smoke`
   - Assert `public-modernization-smoke/index.html` and copied markdown/assets exist.
5. Server/E2E tests:
   - `npm run test:e2e`
   - Verify first slide rendering, keyboard navigation, editor toggle, hash sync, and `/api/save`.
   - Ensure the save-flow test restores the checked-in E2E fixture.
6. URL validation:
   - Validate each replacement hosted URL with redirects followed and confirm status 200 before updating docs/demo references.

## Current change list

Completed changes in this modernization pass:

1. Consolidated `micro-fork`, `micri`, and `serve-handler` into `sirv` plus native Node HTTP/URL/body parsing.
2. Raised root Node engine to `>=22`.
3. Removed `fs-extra` and migrated build copy/write logic to `node:fs/promises`.
4. Removed legacy `now-build` scripts.
5. Updated legacy hosted demo/screenshot/background/alias links to validated modern destinations.
6. Replaced the `markdown-deck` preview dev server from `serve` to `sirv-cli`, removing the old static-server stack from the lockfile entirely.
7. Updated dependency-management metadata for removed dependencies.
8. Kept existing tests and added fixture restoration around the save-flow E2E test.
