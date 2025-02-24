import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import { html, css, LitElement, CSSResultGroup } from 'lit'
import { property, customElement } from 'lit/decorators.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
import { classMap } from 'lit/directives/class-map.js'

import Prism from 'prismjs'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-csharp'

import themeCodeDefault from './theme-code-default'
import themeDefault from './theme-default'

const marked = new Marked(
  { gfm: true, breaks: true, async: false },
  markedHighlight({
    langPrefix: 'language-',
    highlight: (code: string, lang: string) => {
      try {
        return Prism.highlight(code, Prism.languages[lang || 'markup'])
      } catch (e) {
        console.warn(`[highlight error] lang:${lang} code:${code}`)
        return code
      }
    }
  }),
)

const orientPortrait = window.innerHeight > window.innerWidth
const ORIGINAL_WIDTH = orientPortrait ? 800 : 1280
const ORIGINAL_HEIGHT = orientPortrait ? 1280 : 800

@customElement('markdown-slide')
export class MarkdownSlide extends LitElement {
  @property({ type: String }) markdown: string
  @property({ type: Boolean }) invert: boolean
  @property({ type: String }) css: string

  @property({ type: Number }) _scale: number

  static get styles () {
    return slideStyle(themeDefault, themeCodeDefault)
  }

  render () {
    const markup = marked.parse(this.markdown) as string

    const classNames = {
      slide: true,
      invert: this.invert
    }

    return html`
      <div class=${classMap(classNames)}>
        <style>
          .slide { background-color: white }
          .content { transform: scale(${this._scale}) }
          ${this.css}
        </style>
        <section class="content">${unsafeHTML(markup)}</section>
      </div>
    `
  }

  firstUpdated () {
    const elem = this.shadowRoot.querySelector('.slide')
    observeResize(elem, this._setScale)
  }

  updated () {
    this._setScale()
  }

  _setScale = () => {
    const { width, height } = this.getBoundingClientRect()
    const maxScale = Math.min(width / ORIGINAL_WIDTH, height / ORIGINAL_HEIGHT)
    this._scale = maxScale * 0.9
  }
}

declare global {
  interface Window {
    ResizeObserver: any;
  }
}

function observeResize (elem: Element, cb: Function) {
  if (window.ResizeObserver) {
    new window.ResizeObserver(cb).observe(elem)
  }
}

function slideStyle (theme: CSSResultGroup, codeTheme: CSSResultGroup): CSSResultGroup {
  return css`
    .slide {
      height: 100%;
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .slide.invert {
      filter: invert(100%);
    }
    .slide.invert img {
      /*  */
      filter: invert(100%);
    }
    .content {
      width: ${ORIGINAL_WIDTH}px;
      height: ${ORIGINAL_HEIGHT}px;
      place-self: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      --content-width: ${ORIGINAL_WIDTH}px;
      --content-height: ${ORIGINAL_HEIGHT}px;
    }
    ${ theme }
    ${ codeTheme }
  `
}
