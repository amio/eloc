
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
  'code': 'code-block',
  'link': 'link',
  'list_item': 'list',
  'list': 'list',
};

export function tokenize(text: string): Token[] {
  const tokens = marked.lexer(text);
  const result: Token[] = [];

  function walk(tokens: any[], baseOffset: number) {
    let currOffset = baseOffset;
    for (const token of tokens) {
      const type = typeMap[token.type];
      if (type) {
        // Trim trailing newlines for the highlight range,
        // but keep original length for offset calculation.
        let raw = token.raw;
        let endOffset = raw.length;
        while (endOffset > 0 && (raw[endOffset - 1] === '\n' || raw[endOffset - 1] === '\r')) {
          endOffset--;
        }
        result.push({
          type,
          start: currOffset,
          end: currOffset + endOffset,
        });
      }
      if (token.tokens) {
        let internalOffset = 0;
        for (const child of token.tokens) {
          const index = token.raw.indexOf(child.raw, internalOffset);
          if (index !== -1) {
            walk([child], currOffset + index);
            internalOffset = index + child.raw.length;
          }
        }
      }
      currOffset += token.raw.length;
    }
  }

  walk(tokens, 0);
  return result;
}

// CSS Custom Highlight API types are partially missing in some TS versions
declare global {
  interface HighlightRegistry extends Map<string, Highlight> {}
}

let instanceCounter = 0;

export class MDHighlightEditor extends HTMLElement {
  editor: HTMLDivElement;
  instanceId: string;
  private highlightTypes = ['header', 'list', 'bold', 'italic', 'code', 'code-block', 'link'];

  static get observedAttributes() { return ['theme']; }

  constructor() {
    super();
    this.instanceId = `md-editor-${instanceCounter++}`;
    this.attachShadow({ mode: 'open' });
    this.editor = document.createElement('div');
    // @ts-ignore
    this.editor.contentEditable = 'plaintext-only';
    this.shadowRoot!.append(this.editor);

    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`
      :host {
        display: flex;
        flex-direction: column;
        border: 1px solid var(--md-border-color, #ccc);
        padding: 1em;
        box-sizing: border-box;
        overflow: hidden;

        --md-editor-bg: #ffffff;
        --md-editor-fg: #24292f;
        --md-header-color: #0550ae;
        --md-list-color: #953800;
        --md-bold-weight: bold;
        --md-italic-style: italic;
        --md-code-color: #cf222e;
        --md-code-bg: #f6f8fa;
        --md-code-block-color: #6e7781;
        --md-code-block-bg: #f8f9fa;
        --md-link-color: #0969da;
        --md-border-color: #ccc;
      }

      @media (prefers-color-scheme: dark) {
        :host(:not([theme])) {
          --md-editor-bg: #0d1117;
          --md-editor-fg: #c9d1d9;
          --md-header-color: #79c0ff;
          --md-list-color: #ffa657;
          --md-code-color: #ff7b72;
          --md-code-bg: #161b22;
          --md-code-block-color: #8b949e;
          --md-code-block-bg: #111418;
          --md-link-color: #58a6ff;
          --md-border-color: #30363d;
        }
      }

      :host([theme="dark"]) {
        --md-editor-bg: #0d1117;
        --md-editor-fg: #c9d1d9;
        --md-header-color: #79c0ff;
        --md-list-color: #ffa657;
        --md-code-color: #ff7b72;
        --md-code-bg: #161b22;
        --md-code-block-color: #8b949e;
        --md-code-block-bg: #111418;
        --md-link-color: #58a6ff;
        --md-border-color: #30363d;
      }

      :host([theme="light"]) {
        --md-editor-bg: #ffffff;
        --md-editor-fg: #24292f;
        --md-header-color: #0550ae;
        --md-list-color: #953800;
        --md-bold-weight: bold;
        --md-italic-style: italic;
        --md-code-color: #cf222e;
        --md-code-bg: #f6f8fa;
        --md-code-block-color: #6e7781;
        --md-code-block-bg: #f8f9fa;
        --md-link-color: #0969da;
        --md-border-color: #ccc;
      }

      div {
        flex: 1;
        background: var(--md-editor-bg);
        color: var(--md-editor-fg);
        overflow-y: auto;
        font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace;
        font-size: 14px;
        line-height: 1.5;
        outline: none;
        white-space: pre-wrap;
        min-height: 1em;
      }

      ::highlight(${this.instanceId}-header) { color: var(--md-header-color); font-weight: bold; }
      ::highlight(${this.instanceId}-list) { color: var(--md-list-color); }
      ::highlight(${this.instanceId}-bold) { font-weight: bold; }
      ::highlight(${this.instanceId}-italic) { font-style: italic; }
      ::highlight(${this.instanceId}-code) { background: var(--md-code-bg); color: var(--md-code-color); }
      ::highlight(${this.instanceId}-code-block) { background: var(--md-code-block-bg); color: var(--md-code-block-color); }
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
    if (this.editor.innerText === '') {
      // For custom elements, textContent might be collapsed if not display: block/pre
      // We try to get the rawest possible text.
      const rawText = this.getAttribute('value') || this.textContent || '';
      this.editor.innerText = rawText.trim();
      this.updateHighlights();
    }
  }

  disconnectedCallback() {
    if (typeof CSS !== 'undefined' && CSS.highlights) {
      for (const type of this.highlightTypes) {
        CSS.highlights.delete(`${this.instanceId}-${type}`);
      }
    }
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
  }

  private getDOMState() {
    const walker = document.createTreeWalker(this.editor, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let text = '';
    const positions = new Map<number, { node: Node; offset: number }>();

    let node = walker.nextNode();
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const content = node.textContent || '';
        for (let i = 0; i < content.length; i++) {
          positions.set(text.length + i, { node, offset: i });
        }
        text += content;
      } else if (node.nodeName === 'BR') {
        positions.set(text.length, { node, offset: 0 });
        text += '\n';
      } else if (node.nodeName === 'DIV' || node.nodeName === 'P') {
        if (text.length > 0 && !text.endsWith('\n')) {
          positions.set(text.length, { node, offset: 0 });
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

    for (const type of this.highlightTypes) {
      const ranges = highlightMaps[type] || [];
      CSS.highlights.set(`${this.instanceId}-${type}`, new Highlight(...ranges));
    }
  }

  private createRangeFromPositions(start: number, end: number, positions: Map<number, { node: Node; offset: number }>): Range | null {
    const startPos = positions.get(start);
    const endPos = positions.get(end - 1);

    if (startPos && endPos) {
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
