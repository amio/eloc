## `eloc`

#### The eloquent cli

_press [space] to start_

<style>
h4 { font-weight: 300 !important; margin-top: -0.5em !important }
em { opacity: 0.2; font-size: 0.5em; text-transform: uppercase }
</style>

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
# Serve "deck.md" as a presentation (create if not exists)
$ eloc deck.md

# Export presentation to html with assets
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