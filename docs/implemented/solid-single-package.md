# Solid single-package migration

## Context and requirements

Eloc currently bundles a Lit presentation component from a workspace package into
its Node CLI. The requested migration replaces Lit with Solid and removes both
workspace packages. The root remains the only npm package and owns the CLI,
presentation renderer, editor, build, tests, and Vercel site.

Preserve serving/opening decks, keyboard and swipe navigation, URL hashes, live
editing, authenticated local saves, dark and print views, custom CSS, highlighted
code, and asset export. Building the CLI from source must suffice to export the
root `deck.md` unchanged into `public/`, which Vercel Preview serves as the
introduction and demo. This migration must not replace the production homepage.

## Ownership and data flow

- Existing Node CLI modules own argument parsing, the HTTP server, authenticated
  writes, asset resolution, and static export.
- `src/client/` owns Solid state and UI. App coordinates the active slide, editor,
  and view modes. Slide components own isolated styles and resize
  observers; inline styles must not leak between slides or into the editor.
- A shared slide parser supplies source ranges for splitting, editor selection,
  and caret navigation. Fenced code does not create slide boundaries.
- The browser bundle is built first and embedded in the CLI. Generated HTML
  contains that bundle and escaped JSON configuration, without CDN dependencies.
- Local pages save through the existing token-protected API. Exported pages offer
  the same editable demo and download Markdown instead of calling a local API.
- `src/client/document.ts` owns document identity, Markdown, loading outcome, and
  persistence. A URL source override only retains local-save capability when it
  resolves to the configured source. Failed reads permit recovery downloads;
  creating a new local document requires an explicit missing-source response.
- `deck-assets` distinguishes required literal files, include globs, and encoded
  browser references. External stylesheets are linked inside each slide's shadow
  root so relative images and imports retain the stylesheet's base URL. Native
  stylesheet loading avoids CSS rewriting; offline availability across view
  remounts follows the host's HTTP cache policy rather than an owned resource cache.
- The authoring server binds to IPv4 loopback. Explicit Markdown/CSS inputs are
  served as literal files; other hidden paths are rejected before static serving.
  Global deck shortcuts inspect the composed event path to respect interactive
  author content inside shadow roots.
- `npm run build:site` builds the CLI, then uses that CLI to export `deck.md`.
  Vercel's output directory remains `public`.

## Compatibility and implementation

CLI command names, options, default output, asset paths, and save authorization
remain compatible. Workspace package imports and standalone web component APIs
are removed with the packages. There is no persisted app data migration; existing
Markdown and CSS remain inputs. Static exports are directories containing HTML,
Markdown, and referenced assets. Editing an export is local to the current tab
until the user downloads the Markdown.

Replace the renderer and bundling, flatten dependencies and TypeScript config,
remove workspace sources, update documentation while preserving `deck.md`, then
exercise the source-built CLI and exported site. Keep the existing Vercel project
if available; do not create a second hosting service.

## Risks and validation

- JSX needs Solid's compiler, rather than a React JSX transform. Build with the
  official `babel-preset-solid`, then bundle browser dependencies with esbuild.
- Shadow roots preserve per-slide CSS isolation in presentation and print views.
- Clamp hashes and caret-derived slide indices after loading and editing.
- Test local save authorization, empty edits and save failures, exported assets,
  offline rendering, navigation, editor focus, mobile/swipe, dark/print views,
  fenced-code splitting, custom CSS, and the actual root demo export.
- Verify npm packaging works outside the repository and validate the deployed
  Vercel URL when deployment credentials are available.

Official compiler reference:
https://github.com/solidjs/solid/blob/main/packages/babel-preset-solid/README.md

## Validation results

- `npm test`: TypeScript checking, source-built CLI/site, 5 parser tests, and 15
  Chromium CLI/browser tests passed.
- Packed and installed the npm artifact outside the repository with offline npm
  installation. Its four published files suffice to run the CLI and export the
  root deck, without workspace sources or runtime dependencies.
- Watch smoke test: a real Solid source edit and its restoration both rebuilt the
  embedded CLI. Unchanged build output correctly causes no downstream rewrite.
- Vercel Preview deployment `dpl_5SWj9xEJhCENkaUFv9gQFrdQiCM2` completed on
  2026-10-25 at https://eloc-q15ihgb6e-amio.vercel.app. It builds the CLI from
  source and exports the unchanged root deck. The preceding unintended production
  release was rolled back to `dpl_6kMi2acMdu4G1j3e2T4fUPLCsFb7`; the production
  HTML was verified identical to that prior deployment.
- Presentation controls now overlay the full-height deck, reveal from the bottom
  on hover or keyboard focus, and support tap-to-reveal on touchscreens. Edit,
  Dark, and Print show their keyboard shortcuts. Hover exit, keyboard access, and
  touch dismissal are covered by browser tests. Updated Preview:
  https://eloc-jqodn7gj8-amio.vercel.app.
