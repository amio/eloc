import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pageAtOffset, parsePages } from '../../src/client/pages.ts'

test('splits all supported rules and preserves source ranges', () => {
  const markdown = '\n# Title\n---\npage 1\n------\npage 2\n***\npage 3\n******\npage 4\n'
  const pages = parsePages(markdown)
  assert.deepEqual(pages.map(page => page.markdown), ['\n# Title', 'page 1', 'page 2', 'page 3', 'page 4\n'])
  for (const page of pages) assert.equal(markdown.slice(page.start, page.end), page.markdown)
})

test('retains leading, trailing, consecutive, and empty slides', () => {
  assert.deepEqual(parsePages('---\nPage 2\n---').map(page => page.markdown), ['', 'Page 2', ''])
  assert.deepEqual(parsePages('---\n---\n').map(page => page.markdown), ['', '', ''])
  assert.deepEqual(parsePages('').map(page => page.markdown), [''])
})

test('ignores separators in backtick and tilde code fences, including longer fences', () => {
  const markdown = '# First\n```md\n---\n***\n```\n---\n~~~\n---\n~~~\n***\n````md\n```\n---\n````\n---\n# Last'
  const pages = parsePages(markdown)
  assert.equal(pages.length, 4)
  assert.ok(pages[0].markdown.includes('---\n***'))
  assert.equal(pages[3].markdown, '# Last')
})

test('preserves CRLF source offsets and supports indented rules', () => {
  const markdown = '# First\r\n  --- \r\n# Second\r\n***\r\n'
  const pages = parsePages(markdown)
  assert.deepEqual(pages.map(page => page.markdown), ['# First', '# Second', ''])
  for (const page of pages) assert.equal(markdown.slice(page.start, page.end), page.markdown)
})

test('caret navigation follows the same boundaries as page selection', () => {
  const markdown = '# First\n---\n# Second\n---\n# Last'
  const pages = parsePages(markdown)
  assert.equal(pageAtOffset(pages, 0), 0)
  assert.equal(pageAtOffset(pages, pages[1].start - 1), 0)
  assert.equal(pageAtOffset(pages, pages[1].start), 1)
  assert.equal(pageAtOffset(pages, markdown.length), 2)
})
