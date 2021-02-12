## `<markdown-deck />`

*press <kbd>space</kbd> to start*

---

A __web component__ for __presenters__

```html
<markdown-deck markdown="# 🦄" />
```

---

## Keyboard Navigation

prev / next: <kbd>left</kbd> <kbd>right</kbd>

first / last: <kbd>up</kbd> <kbd>down</kbd>

---

## DARK MODE

★ <kbd>D</kbd> ★

---

## THE EDITOR

★ <kbd>ESC</kbd> ★

---

## PRINT VIEW

★ <kbd>P</kbd> ★

then `CMD+P` (save as pdf)

---

# Show me the code

---

*Web Components ABC*

```html
<script src="https://unpkg.com/markdown-deck"></script>

<markdown-deck markdown="# Title">
</markdown-deck>
```

---

*Attributes*

```html
<markdown-deck
  markdown="# Title" 
  index="0"
  hotkey
  hashsync
></markdown-deck>
```

---

*Attributes*

- `markdown="# Title"` The markdown
- `index="0"` Slide index
- `hotkey` Enable hotkeys
- `hashsync` Sync with location hash

---

*More Attributes*

- `src="deck.md"` Load external md file
- `css="deck.css"` Load custom css file

---

## Per Slide Styles

```
### Write inline style tag within markdown

<style>
  .slide { background: url(...) center; background-size: cover }
  .content { filter: invert() }
  code { opacity: 0.8 }
</style>
```

<style>
.slide {
  background: url(https://el-capitan.now.sh) center;
  background-size: cover;
}
.content { filter: invert() }
code { opacity: 0.8 }
</style>

---

## More Usage

https://github.com/amio/markdown-deck

---

One More Thing

## The Eloquence CLI

```
npm install -g eloc
```

---

## THANKS

[![badge-src]][badge-link]

[badge-src]: https://badgen.net/badge/github/amio%2Fmarkdown-deck?icon&label&scale=2
[badge-link]: https://github.com/amio/markdown-deck
