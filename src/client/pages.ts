export interface Page {
  markdown: string
  start: number
  end: number
}

// Source offsets are shared by slide splitting, editor selection, and caret navigation.
// A rule inside fenced code is content, never a slide boundary.
export function parsePages(markdown: string): Page[] {
  const pages: Page[] = []
  let start = 0
  let offset = 0
  let fence: { marker: string; length: number } | undefined
  for (const line of markdown.match(/[^\n]*(?:\n|$)/g) ?? []) {
    if (!line) continue
    const text = line.replace(/\r?\n$/, '')
    const opening = text.match(/^ {0,3}(`{3,}|~{3,})(.*)$/)
    if (fence) {
      if (new RegExp(`^ {0,3}${fence.marker}{${fence.length},}\\s*$`).test(text)) fence = undefined
    } else if (opening && (opening[1][0] !== '`' || !opening[2].includes('`'))) {
      fence = { marker: opening[1][0], length: opening[1].length }
    } else if (/^ {0,3}(?:-{3,}|\*{3,})\s*$/.test(text)) {
      const end = offset > start ? offset - (markdown[offset - 2] === '\r' ? 2 : 1) : offset
      pages.push({ markdown: markdown.slice(start, end), start, end })
      start = offset + line.length
    }
    offset += line.length
  }
  pages.push({ markdown: markdown.slice(start), start, end: markdown.length })
  return pages
}

export function pageAtOffset(pages: Page[], offset: number): number {
  const next = pages.findIndex(page => page.start > offset)
  return next === -1 ? pages.length - 1 : Math.max(0, next - 1)
}
