# eloc

[![npm version][npm-src]][npm-href]
[![Install size][packagephobia-src]][packagephobia-href]
[![License][license-src]][license-href]

Eloquence cli.

> "True eloquence, does not consist in saying great things in a sublime style, but in a simple style."
> _-- Oliver Goldsmith_

https://eloc.now.sh

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

## Usage

```
  eloc - Elequence cli

  Usage

    $ eloc <markdown-file>        Serve markdown file as presentation
    $ eloc open <markdown-file>   Open markdown file as presention in browser
    $ eloc build <markdown-file>  Export presentation to directory

  Options

    -p, --port      Port (default: 3000)
    -d, --out-dir   Output directory (default: public)
    -i, --include   Include files for referenceing in markdown

    -h, --help      Display usage information
    -v, --version   Display version number

  Examples

    # Serve "deck.md" as presentation
    $ eloc deck.md

    # Create & open "new-deck.md" as presentation in browser
    $ eloc new-deck.md

    # Export presentation with images
    $ eloc build deck.md --include "*.jpg"
```

## See Also

- [markdown-deck](https://github.com/amio/markdown-deck): a web component for presenters

[npm-src]: https://badgen.net/npm/v/eloc
[npm-href]: https://www.npmjs.com/package/eloc
[coverage-src]: https://badgen.net/codecov/c/github/amio/eloc
[coverage-href]: https://codecov.io/gh/amio/eloc
[packagephobia-src]: https://badgen.net/packagephobia/install/eloc
[packagephobia-href]: https://packagephobia.now.sh/result?p=eloc
[license-src]: https://badgen.net/badge/license/MIT
[license-href]: LICENSE.md
