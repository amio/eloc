## `eloc`

_the eloquence cli_

---

#### "True __eloquence__,<br /> does not consist in saying great things<br/> in a sublime style,

---

#### but in a simple style."

_— Oliver Goldsmith_

---

## Meet `eloc`

A markdown presentation authoring cli

---
  
for presenters who

1. __focus__ on writing
2. present in a __concise__ style

---

`npm install eloc`

```bash
# Serve "deck.md" as presentation
$ eloc deck.md

# Create & serve "new-deck.md" as presentation
$ eloc new-deck.md

# Export presentation to html with images
$ eloc build deck.md --include "*.jpg"
```

---

<kbd>D</kbd> for __DARK MODE__

---

<kbd>P</kbd> for __PRINT VIEW__

---

Press <kbd>esc</kbd> to __edit me__ :)

---

## Customization

```
### Write inline style within markdown

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

[![](https://badgen.net/badge/github/amio%2Feloc/black?scale=3&icon&label)](https://github.com/amio/eloc)

https://github.com/amio/eloc