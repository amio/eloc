# eloc

[![npm version][npm-src]][npm-href]
[![Install size][packagephobia-src]][packagephobia-href]
[![License][license-src]][license-href]

Eloquence cli. For presenters who (1) focus on writing, (2) present in a concise style.

- Serve markdown as presentation
- Live editor
- Static export
- Print view / Mobile view / Dark mode
- Customizable with web standard

All of this in a [1MB][packagephobia-href] cli. Check out https://eloc.now.sh

### Presentation in Markdown ABC

Break markdown into slides with `---` (horizontal rule), and that's all. e.g. `slides.md`:

```
# Hello World
---
Brown fox jumps over the lazy dog.
---
## Thanks
```

then `eloc slides.md` gives you:

<p align="center"><img src="https://eloc-screenshot.now.sh" height="420px" /></p>

## Install

```bash
npm install -g eloc
```

## Usage

```
  eloc - Eloquence cli

  Usage

    $ eloc <markdown-file>        Serve markdown file as presentation
    $ eloc open <markdown-file>   Open markdown file as presention in browser
    $ eloc build <markdown-file>  Export presentation to directory

  Options

    -p, --port <number>     Port (default: 3000)
    -c, --css <file>        External css for customization
    -i, --include <globs>   Files for referencing in markdown
    -o, --out-dir <dir>     Output directory for build (default: public)
    -t, --title <string>    HTML title (default: <markdown-filename>)
    -b, --progress-bar      Enable progress bar

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

- Use inline `<style />` for [per-slide customization](https://eloc.now.sh/#6):

  ```
  _write style tag within markdown_

  <style>
    .slide { background: url(...) }
    .content { filter: invert() }
    code { opacity: 0.8 }
  </style>
  ```

- https://math.now.sh/ is your friend for embedding math equations.

### Deploy to now

in 1 minute.

Assume you alread had an `index.md` wrote with `eloc open index.md`, then:

```bash
echo '{"scripts":"build":"eloc build index.md"}}' > package.json
echo 'node_modules' > .gitignore
npm i -D eloc
now -c --prod
```

## See Also

- [markdown-deck](https://github.com/amio/markdown-deck): a web component for presenters

## Prior Art

- [mdx-deck](https://github.com/jxnblk/mdx-deck) - If you want to enhance slides with React, this is the one.
- [slides.com](https://slides.com) - Beautiful and powerful, the final choice for full featured presentation.

[npm-src]: https://badgen.net/npm/v/eloc
[npm-href]: https://www.npmjs.com/package/eloc
[coverage-src]: https://badgen.net/codecov/c/github/amio/eloc
[coverage-href]: https://codecov.io/gh/amio/eloc
[packagephobia-src]: https://badgen.net/packagephobia/install/eloc
[packagephobia-href]: https://packagephobia.now.sh/result?p=eloc
[license-src]: https://badgen.net/badge/license/MIT
[license-href]: LICENSE.md
