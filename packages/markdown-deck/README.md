# &lt;markdown-deck />

[![npm version][npm-src]][npm-href]
[![Bundle size][bundlephobia-src]][bundlephobia-href]
[![License][license-src]][license-href]

A web component for presenters.

- Auto screen fitting & keyboard navigation
- Mobile view & touch navigation
- Dark mode
- Print view
- Live editor

## Usage

1. Import script from https://unpkg.com/markdown-deck

    ```html
    <script type="module" src="https://unpkg.com/markdown-deck"></script>
    ```

2. Put markdown content inside `<script type="text/markdown" />` inside `<markdown-deck />`:

    ```html
    <markdown-deck hotkey hashsync>
      <script type="text/markdown">
        # Title
        ---
        ## Hello World!
        ---
        ## The END
      </script>
    </markdown-deck>
    ```

    or set `markdown` attribute on `<markdown-deck />`:

    ```html
    <markdown-deck markdown="# Awesome Presentation" />
    ```

    or load markdown file with `src` attribute:

    ```html
    <markdown-deck src="deck.md" />
    ```

### Attributes

- `markdown="{string}"` the markdown to parse (override contents in `<script type="text/markdown"`)
- `src="{string}"` load markdown file from url
- `css="{string}"` load custom css file from url
- `index="{number}"` current slide index (starting from 0)
- `hashsync` enable syncing index with location hash
- `hotkey` enable hotkey navigation
- `invert` invert color
- `editing` toggle editor
- `printing` toggle print view
- `progressBar` toggle progress bar

### Hotkeys

- __next__: <kbd>Space</kbd>
- __prev / next__: <kbd>⇦</kbd> / <kbd>⇨</kbd> or <kbd>J</kbd> / <kbd>L</kbd>
- __first / last__: <kbd>⇧</kbd> / <kbd>⇩</kbd>
- __invert color (dark theme)__: <kbd>I</kbd> or <kbd>D</kbd>
- __toggle print view__: <kbd>P</kbd>
- __toggle editor__: <kbd>ESC</kbd>

### Customization

- __Custom global styles__

    Use `<style />` inside `<markdown-deck />` to apply custom styles:

    ```html
    <markdown-deck>
      <style>
        img[src*="badgen.net"] { height: 40px }
      </style>
    </markdown-deck>
    ```

    or load external css file with `css` attribute:

    ```html
    <markdown-deck css="index.css"></markdown-deck>
    ```

- __Custom per-slide style__

    Write `<style />` within markdown content:

    ```
    # Title

    <style>
      .slide { background: url(...) }
      .content { filter: invert() }
      code { opacity: 0.8 }
    </style>
    ```

## See Also

- [eloc][eloc-href]: Eloquence cli.

[npm-src]: https://badgen.net/npm/v/markdown-deck
[npm-href]: https://www.npmjs.com/package/markdown-deck
[bundlephobia-src]: https://badgen.net/bundlephobia/min/markdown-deck
[bundlephobia-href]: https://bundlephobia.com/result?p=markdown-deck
[license-src]: https://badgen.net/badge/license/MIT
[license-href]: LICENSE.md
[eloc-href]: https://github.com/amio/eloc
