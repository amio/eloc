## `eloc`

_the eloquence cli_

---

#### "True __eloquence__,<br /> does not consist in saying great things<br/> in a sublime style,

---

#### but in a simple style."

_-- Oliver Goldsmith_

---

`npm install eloc`

```bash
# Serve "deck.md" as presentation
$ eloc deck.md

# Create & serve "new-deck.md" as presentation
$ eloc new-deck.md

# Export presentation with images
$ eloc build deck.md --include "*.jpg"
```

---

<kbd>D</kbd> for __DARK MODE__

---

<kbd>P</kbd> for __PRINT VIEW__

---

## Per Slide Styles

```
_write style tag within markdown_

<style>
  .slide { background: url(...) }
  .content { filter: invert() }
  code { opacity: 0.8 }
</style>
```

<style>
.slide {
  background: url(https://el-capitan.now.sh);
  background-size: cover;
}
.content { filter: invert() }
code { opacity: 0.8 }
</style>

---

Press <kbd>esc</kbd> to __edit me__ :)

---

https://github.com/amio/eloc
