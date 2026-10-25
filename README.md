# eloc

[![npm version][npm-src]][npm-href]
[![Install size][packagephobia-src]][packagephobia-href]
[![License][license-src]][license-href]

Eloquence cli. For presenters who (1) focus on writing, (2) present in a concise style.

- Serve markdown as presentation
- Live editor
- Export to html
- Print view / Mobile view / Dark mode
- Keyboard, touch, and on-screen presentation controls
- Editable static demos with Markdown download
- Customizable with web standard

A single npm package, with a Solid presentation renderer bundled into the CLI. [Try the live introduction and demo](https://eloc.vercel.app).

### Presentation in Markdown ABC

Break markdown into slides with `---` (horizontal rule) like this in `slides.md`:

```
# Hello World
---
Brown fox jumps over the lazy dog.
---
## Thanks
```

then `eloc slides.md` gives you the presentation with live editor:

Press **Esc** to edit, use the arrow keys to navigate, and press **D** or **P**
for dark mode and print view.

## Install

Requires Node.js 22 or newer.

```bash
npm install -g eloc
```

## Usage

```
  eloc - The eloquent cli

  Usage

    $ eloc <markdown-file>        Serve markdown file as presentation
    $ eloc open <markdown-file>   Open markdown file as presentation in browser
    $ eloc build <markdown-file>  Export presentation to directory

  Options

    -p, --port <number>     Port (default: 5000)
    -c, --css <file>        External css for customization
    -i, --include <globs>   Files for referencing in markdown
    -o, --out-dir <dir>     Output directory for build (default: public)
    -t, --title <string>    HTML title (default: <markdown-filename>)
    -b, --progress-bar      Enable progress bar
    -d, --dark              Enable dark theme

    -q, --quiet             Mute verbose logs
    -v, --version           Display version number
    -h, --help              Display usage information

  Examples

    # Serve "deck.md" as presentation
    $ eloc deck.md

    # Create & open "new-deck.md" as presentation in browser
    $ eloc open new-deck.md

    # Export presentation with images
    $ eloc build deck.md --include "*.jpg"
```

### Customization & Tips

- Use `--css` arg with an external stylesheet, which will be applied on every slide.

- Use inline `<style />` for [per-slide customization](https://eloc.vercel.app/#9):

  ```
  _write style tag within markdown_

  <style>
    .slide { background: url(...) }
    .content { filter: invert() }
    code { opacity: 0.8 }
  </style>
  ```

- https://math.vercel.app/ is your friend for embedding math equations.

## Develop and build

The repository is one package. `src/` contains the Node CLI and `src/client/`
contains the Solid presentation UI. No workspace bootstrap is needed.

```bash
npm ci
npm run build
node dist/index.js deck.md

# Build the CLI from source, then export the root introduction deck.
npm run build:site
# Output: public/index.html, public/deck.md, and any included local assets.
```

The browser bundle is embedded in the CLI and exported HTML. Serving an exported
directory requires no npm installation, JavaScript CDN, or server-side API. Markdown
and any local assets must be hosted alongside `index.html`. Author Markdown and
inline HTML are trusted presentation content.

During local authoring, Esc opens the editor and Cmd/Ctrl+S saves through the
CLI's token-protected save endpoint. The local server listens only on
`127.0.0.1`; unselected hidden files and directories are not served.

On exported sites, the editor previews changes in the current tab and
**Download** (or Cmd/Ctrl+S) downloads the Markdown. Loading another document with
`?src=...` also uses downloads, with that document's filename, instead of writing
to the CLI's source file. If reading the source fails, the editor offers a
recovery download; reload after the read problem is resolved to resume local
saves. A source file that the local server confirms does not exist can still be
created from the editor.

External stylesheets load inside each slide, preserving relative images and CSS
imports. Their availability after disconnecting, including when switching to print
view, depends on the host's HTTP cache policy; external assets are not bundled into
an offline resource cache.

`npm run dev` watches both CLI and Solid sources. Restart the CLI after a rebuild
and refresh the browser to load the new bundle.

```bash
npx playwright install chromium
npm test                 # TypeScript, source build, core tests, browser/CLI tests
npm run test:unit         # Core tests; no bundle or browser required
npm run test:coverage     # Core source coverage using Node V8
npm run test:e2e          # Requires an existing build and public/ export
```

The CLI entry point only parses arguments, dispatches commands, and reports errors.
Core functions accept an explicit working directory or browser resources where
needed, so tests can import source modules without building the CLI or changing
process-wide state.

| Core behavior | Direct tests |
| --- | --- |
| Command parsing | Serve/open/build, help/version, aliases, repeated flags, `--` separator |
| Deck assets | Root resolution, local/external CSS, glob exclusions, literal filenames, traversal rejection |
| HTML generation | Embedded resources, configuration, title and script escaping |
| Export | Real temporary-directory copies, defaults, nested assets, absolute paths, filesystem failures |
| HTTP server | GET/HEAD, static assets, hidden paths, missing-source detection, token isolation, save validation and persistence |
| Port selection | Defaults/environment precedence, invalid values, occupied-port retry and exhaustion |
| Streamed save bodies | Chunked UTF-8, byte limits, malformed JSON and interrupted streams |

Filesystem and HTTP tests use temporary directories and loopback servers; they
run under the Node test runner alongside pure unit tests. Playwright separately
verifies the packaged CLI and the complete browser editing/export journeys.
The coverage report measures imported core source; it does not measure browser
UI coverage or prove behavior on every operating system. The system
browser opener is injected in adapter tests; tests do not launch a real browser
application through the operating system.

Vercel uses the root `vercel.json`: `npm run build:site` builds the CLI and exports
`deck.md`, then serves `public/` in Vercel deployments. To create a Preview deployment with
the Vercel CLI:

```bash
vercel link --project eloc
vercel deploy
```

Preview deployments do not replace the production homepage. Promote a preview
only when a production release is explicitly intended.

## Prior Art

- [mdx-deck](https://github.com/jxnblk/mdx-deck) - If you want to enhance slides with React, this is the one.
- [slides.com](https://slides.com) - Beautiful and powerful, the final choice for full featured presentation.
- [big](https://github.com/tmcw/big) - The boldest style, for fan of [Takahashi method](https://en.wikipedia.org/wiki/Takahashi_method).

[npm-src]: https://badgen.net/npm/v/eloc
[npm-href]: https://www.npmjs.com/package/eloc
[coverage-src]: https://badgen.net/codecov/c/github/amio/eloc
[coverage-href]: https://codecov.io/gh/amio/eloc
[packagephobia-src]: https://badgen.net/packagephobia/install/eloc
[packagephobia-href]: https://pkg-size.dev/eloc
[license-src]: https://badgen.net/badge/license/MIT
[license-href]: LICENSE.md
