
import { marked } from 'marked';

export interface Token {
  type: string;
  start: number;
  end: number;
}

const typeMap: Record<string, string> = {
  'heading': 'header',
  'strong': 'bold',
  'em': 'italic',
  'codespan': 'code',
  'link': 'link',
  'list_item': 'list',
  'list': 'list',
};

export function tokenize(text: string): Token[] {
  const tokens = marked.lexer(text);
  const result: Token[] = [];

  function walk(tokens: any[], baseOffset: number) {
    let offset = baseOffset;
    for (const token of tokens) {
      const type = typeMap[token.type];
      if (type) {
        result.push({
          type,
          start: offset,
          end: offset + token.raw.length,
        });
      }
      if (token.tokens) {
        walk(token.tokens, offset);
      }
      offset += token.raw.length;
    }
  }

  walk(tokens, 0);
  return result;
}

declare global {
  interface CSS {
    highlights: Map<string, Highlight>;
  }
  class Highlight {
    constructor(...ranges: AbstractRange[]);
    priority: number;
    type: string;
  }
}

let instanceCounter = 0;

export class MDHighlightEditor extends HTMLElement {
  editor: HTMLDivElement;
  instanceId: string;

  static get observedAttributes() { return ['theme']; }

  constructor() {
    super();
    this.instanceId = `md-editor-${instanceCounter++}`;
    this.attachShadow({ mode: 'open' });
    this.editor = document.createElement('div');
    // @ts-ignore
    this.editor.contentEditable = 'plaintext-only';
    this.editor.style.whiteSpace = 'pre-wrap';
    this.editor.style.outline = 'none';
    this.editor.style.minHeight = '1em';
    this.shadowRoot!.append(this.editor);

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`
      :host {
        display: block;
        border: 1px solid #ccc;
        padding: 1em;
        background: var(--md-editor-bg, #ffffff);
        color: var(--md-editor-fg, #24292f);

        --md-header-color: #0550ae;
        --md-list-color: #953800;
        --md-bold-weight: bold;
        --md-italic-style: italic;
        --md-code-color: #cf222e;
        --md-code-bg: #f6f8fa;
        --md-link-color: #0969da;
      }

      :host([theme="dark"]) {
        --md-editor-bg: #0d1117;
        --md-editor-fg: #c9d1d9;
        --md-header-color: #79c0ff;
        --md-list-color: #ffa657;
        --md-code-color: #ff7b72;
        --md-code-bg: #161b22;
        --md-link-color: #58a6ff;
        border-color: #30363d;
      }

      div { font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace; font-size: 14px; line-height: 1.5; }
      ::highlight(${this.instanceId}-header) { color: var(--md-header-color); font-weight: bold; }
      ::highlight(${this.instanceId}-list) { color: var(--md-list-color); }
      ::highlight(${this.instanceId}-bold) { font-weight: var(--md-bold-weight); }
      ::highlight(${this.instanceId}-italic) { font-style: var(--md-italic-style); }
      ::highlight(${this.instanceId}-code) { background: var(--md-code-bg); color: var(--md-code-color); }
      ::highlight(${this.instanceId}-link) { color: var(--md-link-color); text-decoration: underline; }
    `);
    // @ts-ignore
    this.shadowRoot!.adoptedStyleSheets = [sheet];
  }

  connectedCallback() {
    this.editor.addEventListener('input', () => {
      this.editor.normalize();
      this.updateHighlights();
    });

    // Use initial content as value
    if (this.childNodes.length > 0 && this.editor.innerText === '') {
      this.editor.innerText = this.textContent || '';
      this.updateHighlights();
    }
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
  }

  private getDOMState() {
    const walker = document.createTreeWalker(this.editor, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let text = '';
    const positions: { node: Node; offset: number; textIndex: number }[] = [];

    let node = walker.nextNode();
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const content = node.textContent || '';
        for (let i = 0; i < content.length; i++) {
          positions.push({ node, offset: i, textIndex: text.length + i });
        }
        text += content;
      } else if (node.nodeName === 'BR') {
        text += '\n';
      } else if (node.nodeName === 'DIV' || node.nodeName === 'P') {
        if (text.length > 0 && !text.endsWith('\n')) {
          text += '\n';
        }
      }
      node = walker.nextNode();
    }
    return { text, positions };
  }

  updateHighlights() {
    if (typeof CSS === 'undefined' || !CSS.highlights) return;

    const { text, positions } = this.getDOMState();
    const tokens = tokenize(text);

    const highlightMaps: Record<string, (Range | StaticRange)[]> = {};

    for (const token of tokens) {
      const range = this.createRangeFromPositions(token.start, token.end, positions);
      if (range) {
        if (!highlightMaps[token.type]) highlightMaps[token.type] = [];
        highlightMaps[token.type].push(range);
      }
    }

    const types = ['header', 'list', 'bold', 'italic', 'code', 'link'];
    for (const type of types) {
      const ranges = highlightMaps[type] || [];
      CSS.highlights.set(`${this.instanceId}-${type}`, new Highlight(...ranges));
    }
  }

  private createRangeFromPositions(start: number, end: number, positions: any[]): Range | StaticRange | null {
    let startPos = positions[start];
    if (!startPos || startPos.textIndex !== start) {
        startPos = positions.find(p => p.textIndex === start);
    }

    let endPos = positions[end - 1];
    if (!endPos || endPos.textIndex !== end - 1) {
        endPos = positions.find(p => p.textIndex === end - 1);
    }

    if (startPos && endPos) {
      // Use Range instead of StaticRange for better reliability as suggested
      const range = document.createRange();
      range.setStart(startPos.node, startPos.offset);
      range.setEnd(endPos.node, endPos.offset + 1);
      return range;
    }
    return null;
  }
}

if (!customElements.get('md-editor')) {
  customElements.define('md-editor', MDHighlightEditor);
}
