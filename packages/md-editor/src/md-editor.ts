/**
 * MDEditor Web Component
 *
 * A Markdown editor using contenteditable="plaintext-only" with
 * CSS Custom Highlight API for syntax highlighting.
 */

import { tokenize, Token, grammars } from './tokenizer'

class MDEditor extends HTMLElement {
  private editor: HTMLDivElement
  private debounceTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })

    this.editor = document.createElement('div')
    this.editor.contentEditable = 'plaintext-only'
    this.editor.setAttribute('role', 'textbox')
    this.editor.setAttribute('aria-multiline', 'true')

    const sheet = new CSSStyleSheet()
    sheet.replaceSync(`
      :host {
        display: block;
        --md-color-heading: #0550ae;
        --md-color-bold: inherit;
        --md-color-italic: inherit;
        --md-color-code: #cf222e;
        --md-color-code-bg: #f6f8fa;
        --md-color-link: #0969da;
        --md-color-blockquote: #57606a;
        --md-color-hr: #d0d7de;
        --md-color-list: #953800;
        --md-color-strikethrough: #6e7781;
      }
      [contenteditable] {
        outline: none;
        min-height: 1em;
        white-space: pre-wrap;
        word-wrap: break-word;
        font-family: monospace;
        font-size: 14px;
        line-height: 1.6;
        padding: 8px;
        box-sizing: border-box;
      }
      ::highlight(md-heading) {
        color: var(--md-color-heading);
        font-weight: bold;
      }
      ::highlight(md-bold) {
        font-weight: bold;
        color: var(--md-color-bold);
      }
      ::highlight(md-italic) {
        font-style: italic;
        color: var(--md-color-italic);
      }
      ::highlight(md-code) {
        color: var(--md-color-code);
        background-color: var(--md-color-code-bg);
      }
      ::highlight(md-link) {
        color: var(--md-color-link);
        text-decoration: underline;
      }
      ::highlight(md-blockquote) {
        color: var(--md-color-blockquote);
      }
      ::highlight(md-hr) {
        color: var(--md-color-hr);
      }
      ::highlight(md-list) {
        color: var(--md-color-list);
      }
      ::highlight(md-orderedList) {
        color: var(--md-color-list);
      }
      ::highlight(md-strikethrough) {
        color: var(--md-color-strikethrough);
        text-decoration: line-through;
      }
    `)
    this.shadowRoot!.adoptedStyleSheets = [sheet]
    this.shadowRoot!.append(this.editor)
  }

  connectedCallback() {
    // Initialize content from the element's text content
    if (this.textContent && !this.editor.textContent) {
      this.editor.textContent = this.textContent
    }

    this.editor.addEventListener('input', () => this.scheduleUpdate())
    this.updateHighlights()
  }

  disconnectedCallback() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
  }

  /** Get the current text content of the editor */
  get value(): string {
    return this.editor.innerText || ''
  }

  /** Set the text content of the editor */
  set value(text: string) {
    this.editor.textContent = text
    this.updateHighlights()
  }

  private scheduleUpdate() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }
    this.debounceTimer = setTimeout(() => this.updateHighlights(), 50)
  }

  private updateHighlights() {
    // Normalize text nodes to ensure consistent offsets
    this.editor.normalize()

    const text = this.editor.innerText || ''
    if (!text) {
      // Clear all highlights
      for (const type of Object.keys(grammars)) {
        CSS.highlights.delete(`md-${type}`)
      }
      return
    }

    const tokens = tokenize(text)

    // Build a flat list of text nodes with their offsets
    const textNodes = this.getTextNodes()

    // Group tokens by type
    const highlightMap: Record<string, StaticRange[]> = {}

    for (const token of tokens) {
      const range = this.createStaticRange(textNodes, token.start, token.end)
      if (!range) continue

      if (!highlightMap[token.type]) {
        highlightMap[token.type] = []
      }
      highlightMap[token.type].push(range)
    }

    // Apply highlights per type, clear types with no tokens
    for (const type of Object.keys(grammars)) {
      const ranges = highlightMap[type]
      if (ranges && ranges.length > 0) {
        CSS.highlights.set(`md-${type}`, new Highlight(...ranges))
      } else {
        CSS.highlights.delete(`md-${type}`)
      }
    }
  }

  private getTextNodes(): { node: Text; offset: number }[] {
    const nodes: { node: Text; offset: number }[] = []
    let offset = 0

    const walker = document.createTreeWalker(
      this.editor,
      NodeFilter.SHOW_TEXT,
    )

    let node: Text | null
    while ((node = walker.nextNode() as Text | null)) {
      nodes.push({ node, offset })
      offset += node.textContent!.length
    }

    return nodes
  }

  private createStaticRange(
    textNodes: { node: Text; offset: number }[],
    start: number,
    end: number,
  ): StaticRange | null {
    if (textNodes.length === 0) return null

    let startNode: Text | null = null
    let startOffset = 0
    let endNode: Text | null = null
    let endOffset = 0

    for (const { node, offset } of textNodes) {
      const nodeEnd = offset + node.textContent!.length

      if (startNode === null && start < nodeEnd) {
        startNode = node
        startOffset = start - offset
      }

      if (end <= nodeEnd) {
        endNode = node
        endOffset = end - offset
        break
      }
    }

    if (!startNode || !endNode) return null

    return new StaticRange({
      startContainer: startNode,
      startOffset,
      endContainer: endNode,
      endOffset,
    })
  }
}

customElements.define('md-editor', MDEditor)

export { MDEditor }
