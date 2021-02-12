/**
 * Utils for handling presenting markdown
 */

/**
 * Split markdown to pages by "horizontal rules" (`---` or `***`)
 * @param markdown the markdown string
 */
export function splitMarkdownToPages (markdown: string): string[] {
  return markdown.split(/\n[-*]{3,}\n/)
}

/**
 * Get text range from markdown by page index
 * @param markdown markdown
 * @param index page index
 */
export function getRangeByIndex (markdown: string, index: number): [number, number] {
  const textBeforeEnd = markdownBeforeIndex(markdown, index + 1)
  const textBeforeEndWithoutHR = textBeforeEnd.replace(/\n[-*]{3,}\n$/, '')
  const textBeforeStart = index === 0 ? '' : markdownBeforeIndex(markdown, index)
  return [textBeforeStart.length, textBeforeEndWithoutHR.length]
}

function markdownBeforeIndex (markdown: string, index: number): string {
  const reg = new RegExp(`^(.+?\n[-*]{3,}\n){${index}}`, 's')
  return markdown.match(reg)?.[0] ?? markdown
}
