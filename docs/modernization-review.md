# Modernization Review

## Background

This document captures a first-pass modernization review of the `eloc` codebase. The goal is to identify obsolete implementations and dependency choices that can be replaced with modern platform APIs or simpler dependencies, while keeping this pass low risk and avoiding functional rewrites.

The project has already undergone a dependency upgrade pass, documented in `docs/2026-05-16-dependency-upgrade.md`. This review therefore focuses less on package version freshness and more on implementation patterns, dependency necessity, and safe cleanup opportunities.

## Current architecture

`eloc` is an npm workspace with three main packages:

- Root package `eloc`: the CLI and presentation server.
- Workspace `packages/markdown-deck`: the presentation web component.
- Workspace `packages/md-editor`: a standalone markdown editor web component.

Root CLI modules:

- `src/index.ts`: CLI entry point. Uses `mri` for argument parsing and `kleur` for terminal styling, then dispatches to serve or build mode.
- `src/serve.ts`: creates an HTTP server, serves the generated presentation page, serves static files, and handles `/api/save` for live editor saves.
- `src/build.ts`: copies the markdown file and assets into an output directory and writes `index.html`.
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
- `markdown-deck` has a Jest test script for utility tests and an esbuild IIFE bundle.
- `md-editor` has an esbuild ESM bundle.

## Candidates

### Replace small server dependencies with platform APIs

`src/serve.ts` currently uses:

- `micro-fork` for routing.
- `micri` for JSON body parsing.
- `serve-handler` for static file serving.

For this codebase, the routing surface is small: `/`, `/api/save`, and static file fallback. Modern Node APIs are sufficient for request routing, JSON body parsing, and static file reads. Replacing these dependencies would reduce install size and maintenance surface, but it touches request handling and should be validated carefully.

### Reduce `fs-extra` usage

`src/build.ts` uses `fs-extra` for `copy` and `outputFile`. Modern `fs/promises` supports recursive directory creation, file writes, and file copying with `fs.cp` in supported Node versions. Because the package currently declares `node >=16`, compatibility details must be checked before replacing `fs-extra`; the safest path is to defer or gate this behind a Node engine decision.

### Remove apparently unused direct dependencies

The source review found no application usage for these root direct dependencies outside manifests, lockfile, and dependency-management configuration:

- `@vercel/ncc`
- `micromatch`
- `@types/micromatch`

One final confirmation pass should include `.github/dependabot.yml`, because Dependabot configuration may reference `@vercel/ncc` or `micromatch` even when application source does not.

`micromatch` is still expected to remain in the resolved dependency graph transitively through `globby`/`fast-glob`. The cleanup should therefore be described as removing only direct dependencies from the root manifest, not removing every `micromatch` entry from `package-lock.json` or the install tree.

Expected impact is mainly reduced direct dependency surface and less root manifest/lockfile ownership. Bundle output should not change if these packages are truly unused by application code, and install-size impact may be modest because transitive `micromatch` remains.

### Treat deployment naming and stale links conservatively

The repo still contains legacy Vercel/Now-era naming and URLs:

- `now-build` scripts in the root package and `markdown-deck`.
- `now.sh` references in README/demo material.
- `packages/markdown-deck/vercel.json` alias still points at `markdown-deck.now.sh`.

Do not rename or remove `now-build` in this pass. Deployment may still depend on that legacy script name. If deployment ownership confirms it is safe, an optional parallel `vercel-build` alias can be added while keeping `now-build` intact.

Do not blindly rewrite `now.sh` URLs. Validate each URL against the current deployment/canonical destination first, or defer documentation link updates to a separate docs pass.

### Update TypeScript module settings deliberately

The root `tsconfig.json` uses older defaults such as:

- `target: es2017`
- `module: commonjs`
- `moduleResolution: node`

The workspace packages also use `moduleResolution: node`. Because esbuild handles bundling, moving to more modern TypeScript settings such as `moduleResolution: bundler` or `node16` should be evaluated separately and validated against package output, tests, and Node runtime support.

### Browser/editor implementation modernization

The web components already use modern APIs such as Lit 3, `AbortController`, `ResizeObserver`, constructable stylesheets, and CSS Custom Highlight API. Some older or fragile implementation details remain:

- `substr` in `markdown-deck.ts` can be replaced with `slice`.
- The live editor in `markdown-deck` is a plain `textarea`; the standalone `md-editor` is not integrated into the CLI editing experience.
- `md-editor` relies on newer browser APIs and should retain graceful fallback behavior.

The `substr` to `slice` cleanup is trivial and low-risk if package tests pass. Broader editor integration or behavior changes should not be part of the low-risk dependency cleanup pass unless a specific bug or product goal requires them.

## Recommended scope

For this pass, keep the scope small and low-risk:

1. Remove direct dependencies that appear unused:
   - `@vercel/ncc`
   - `micromatch`
   - `@types/micromatch`
2. Confirm related metadata before removal:
   - Check root manifests, `package-lock.json`, and `.github/dependabot.yml` for direct references.
   - Expect `micromatch` to remain transitively through `globby`/`fast-glob`; only direct root dependency ownership should be removed.
3. Keep legacy deployment scripts unchanged this pass:
   - Do not rename or remove `now-build`.
   - Add an optional parallel `vercel-build` alias only if deployment validation confirms it is safe and useful.
4. Defer stale `now.sh` documentation/demo URL changes unless each replacement URL is validated.
5. Replace trivial JavaScript idioms with no behavior change where already touched and tests pass:
   - `substr` to `slice` in browser code.
6. Validate install and bundle behavior:
   - Confirm install still succeeds.
   - Confirm direct dependency removal does not imply transitive `micromatch` disappears.
   - Confirm generated bundle/output files are unchanged in behavior and still produced.

## Deferred items

Defer these until after the low-risk cleanup lands:

- Replacing `micro-fork`, `micri`, and `serve-handler` with native Node request handling.
- Replacing `fs-extra` with `fs/promises`, unless the project first raises or confirms the Node engine target supports the required APIs.
- Changing TypeScript module resolution or package output formats.
- Integrating `@amio/md-editor` into the CLI live editor.
- Changing markdown parsing, slide splitting behavior, or `marked` token processing.
- Reworking presentation rendering, font loading, or syntax highlighting.
- Broad dependency replacement for `mri`, `kleur`, `globby`, `open`, `marked`, `lit`, or `prismjs` without a clear benefit.

## Risks

- Removing dependencies may break hidden scripts or publishing/deployment workflows if those tools are used outside source files.
- Renaming or removing `now-build` could break an older Vercel/Now deployment configuration if it still expects that script name.
- Blindly changing `now.sh` URLs could replace still-valid demo or alias links with incorrect destinations.
- Replacing the HTTP server stack could introduce subtle regressions in static file paths, caching headers, content types, URL decoding, or request body handling.
- Replacing `fs-extra` may be constrained by the current `node >=16` engine declaration and the exact Node 16 minor version expected by users.
- TypeScript module setting changes can affect esbuild resolution, package workspace resolution, and CommonJS/ESM interop.
- Browser editor changes could affect selection sync, live editing, keyboard shortcuts, or shadow DOM behavior.
- `md-editor` uses newer browser APIs; treating it as a drop-in replacement for the existing textarea editor would require compatibility and UX validation.

## Validation

Run validation in increasing scope after each small change:

1. Dependency and install sanity:
   - `npm install`
   - `npm ls --depth=0 --workspaces --include-workspace-root`
   - Confirm `@vercel/ncc`, direct `micromatch`, and `@types/micromatch` are no longer root-owned direct dependencies.
   - Confirm any remaining `micromatch` entries are expected transitive dependencies through `globby`/`fast-glob`.
2. Package builds:
   - `npm run build -w markdown-deck`
   - `npm run build -w @amio/md-editor`
   - `npm run build`
3. Package tests relevant to touched workspaces:
   - `npm test -w markdown-deck` if `packages/markdown-deck` code is touched, including the `substr` to `slice` cleanup.
4. CLI smoke tests:
   - `node dist/index.js --help`
   - `node dist/index.js --version`
   - `node dist/index.js build deck.md -o public-modernization-smoke`
   - Assert expected build output files exist, especially `public-modernization-smoke/index.html` and copied markdown/assets for the chosen smoke fixture.
5. E2E tests:
   - `npm run test:e2e`
   - Existing Playwright coverage already exercises serve mode; avoid adding redundant serve smoke coverage unless a server change is made in a later pass.
   - Avoid mutating checked-in E2E fixtures during validation. If a save-flow test or manual check mutates a fixture, restore it before finishing and verify the working tree is clean.
6. Manual smoke checks for any server-related follow-up pass:
   - Serve a markdown deck.
   - Navigate with keyboard and hash sync.
   - Toggle editor with Escape.
   - Save edits with Cmd/Ctrl+S.
   - Verify included image/CSS assets are served and copied correctly.

## Change list

Recommended concrete changes for the low-risk pass:

1. Remove unused direct root dependencies from `package.json` and regenerate `package-lock.json`:
   - `@vercel/ncc`
   - `micromatch`
   - `@types/micromatch`
2. Check `.github/dependabot.yml` and other dependency-management metadata for references to `@vercel/ncc` or `micromatch`; update only if those references become invalid after direct dependency removal.
3. Leave `now-build` scripts in place this pass:
   - Root `package.json`
   - `packages/markdown-deck/package.json`
4. Add a parallel `vercel-build` script only if deployment validation confirms it is safe; do not remove or rename `now-build`.
5. Defer `now.sh` README/demo URL updates unless each replacement destination is validated.
6. Replace simple deprecated string usage where behavior is unchanged and tests pass:
   - `substr` to `slice` in `packages/markdown-deck/src/markdown-deck.ts`.
7. Add or document CLI build smoke validation that asserts expected output files, while relying on existing Playwright coverage for serve mode.
8. Avoid mutating checked-in E2E fixtures during validation, or restore them before finishing.
9. Open a follow-up design/task for replacing `micro-fork`, `micri`, and `serve-handler` with a small native Node HTTP implementation.
10. Open a follow-up design/task for evaluating Node engine support and whether `fs-extra` can be replaced by `fs/promises`.
