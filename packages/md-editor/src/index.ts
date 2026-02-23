
export interface Token {
  type: string;
  start: number;
  end: number;
}

const grammar: Record<string, RegExp> = {
  header: /^#{1,6}\s.*/gm,
  code: /`[^`]+`/g,
  bold: /\*\*[\s\S]+?\*\*/g,
  italic: /_[\s\S]+?_/g,
  link: /\[.*?\]\(.*?\)/g,
};

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];

  for (const [type, regex] of Object.entries(grammar)) {
    // Reset regex index for global matches
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(text)) !== null) {
      tokens.push({
        type,
        start: match.index,
        end: match.index + match[0].length,
      });
    }
  }

  return tokens;
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

export class MDHighlightEditor extends HTMLElement {
  editor: HTMLDivElement;

  constructor() {
    super();
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
      :host { display: block; border: 1px solid #ccc; padding: 1em; }
      div { font-family: ui-monospace, SFMono-Regular, SF Mono, Menlo, Consolas, Liberation Mono, monospace; font-size: 14px; line-height: 1.5; }
      ::highlight(md-header) { color: #0550ae; font-weight: bold; }
      ::highlight(md-bold) { font-weight: bold; }
      ::highlight(md-italic) { font-style: italic; }
      ::highlight(md-code) { background: #f6f8fa; color: #cf222e; }
      ::highlight(md-link) { color: #0969da; text-decoration: underline; }
    `);
    // @ts-ignore
    this.shadowRoot!.adoptedStyleSheets = [sheet];
  }

  connectedCallback() {
    this.editor.addEventListener('input', () => this.updateHighlights());

    // Use initial content as value
    if (this.childNodes.length > 0 && this.editor.innerText === '') {
      this.editor.innerText = this.textContent || '';
      this.updateHighlights();
    }
  }

  updateHighlights() {
    if (typeof CSS === 'undefined' || !CSS.highlights) return;

    // Use innerText to get the text content with newlines as the user sees them
    const text = this.editor.innerText;
    const tokens = tokenize(text);

    const highlightMaps: Record<string, (Range | StaticRange)[]> = {};

    for (const token of tokens) {
      const range = this.createRangeAt(token.start, token.end);
      if (range) {
        if (!highlightMaps[token.type]) highlightMaps[token.type] = [];
        highlightMaps[token.type].push(range);
      }
    }

    // Apply highlights with 'md-' prefix
    const types = ['header', 'bold', 'italic', 'code', 'link'];
    for (const type of types) {
      const ranges = highlightMaps[type] || [];
      CSS.highlights.set(`md-${type}`, new Highlight(...ranges));
    }
  }

  private createRangeAt(start: number, end: number): Range | StaticRange | null {
    const walker = document.createTreeWalker(this.editor, NodeFilter.SHOW_TEXT);
    let currentPos = 0;
    let startNode: Node | null = null;
    let startOffset = 0;
    let endNode: Node | null = null;
    let endOffset = 0;

    let node = walker.nextNode();
    while (node) {
      const length = node.textContent?.length || 0;
      if (!startNode && currentPos + length >= start) {
        startNode = node;
        startOffset = start - currentPos;
      }
      if (!endNode && currentPos + length >= end) {
        endNode = node;
        endOffset = end - currentPos;
        break;
      }
      currentPos += length;
      node = walker.nextNode();
    }

    if (startNode && endNode) {
      // @ts-ignore
      if (typeof StaticRange !== 'undefined') {
        return new StaticRange({
          startContainer: startNode,
          startOffset: startOffset,
          endContainer: endNode,
          endOffset: endOffset
        });
      } else {
        const range = document.createRange();
        range.setStart(startNode, startOffset);
        range.setEnd(endNode, endOffset);
        return range;
      }
    }
    return null;
  }
}

if (!customElements.get('md-editor')) {
  customElements.define('md-editor', MDHighlightEditor);
}
