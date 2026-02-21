import { describe, test, expect } from 'vitest'
import { splitMarkdownToPages, getRangeByIndex } from './utils'

const md = `
# Title
---
page 1
------
page 2
***
page 3
******
page 4
`

describe('splitMarkdownToPages', () => {
  test('splits markdown by horizontal rules', () => {
    const result = splitMarkdownToPages(md)

    expect(result instanceof Array).toBe(true)
    expect(result.length).toBe(5)
  })

  test('returns single page for markdown without dividers', () => {
    const result = splitMarkdownToPages('# Hello World')
    expect(result.length).toBe(1)
    expect(result[0]).toBe('# Hello World')
  })

  test('handles empty string', () => {
    const result = splitMarkdownToPages('')
    expect(result.length).toBe(1)
    expect(result[0]).toBe('')
  })

  test('splits by --- dividers', () => {
    const result = splitMarkdownToPages('page1\n---\npage2')
    expect(result.length).toBe(2)
    expect(result[0]).toBe('page1')
    expect(result[1]).toBe('page2')
  })

  test('splits by *** dividers', () => {
    const result = splitMarkdownToPages('page1\n***\npage2')
    expect(result.length).toBe(2)
    expect(result[0]).toBe('page1')
    expect(result[1]).toBe('page2')
  })

  test('handles multiple divider characters', () => {
    const result = splitMarkdownToPages('a\n------\nb\n******\nc')
    expect(result.length).toBe(3)
  })
})

describe('getRangeByIndex', () => {
  test('gets correct range for each page', () => {
    expect(md.substring(...getRangeByIndex(md, 0))).toBe('\n# Title')
    expect(md.substring(...getRangeByIndex(md, 1))).toBe('page 1')
    expect(md.substring(...getRangeByIndex(md, 2))).toBe('page 2')
    expect(md.substring(...getRangeByIndex(md, 3))).toBe('page 3')
    expect(md.substring(...getRangeByIndex(md, 4))).toBe('page 4\n')
  })

  test('returns empty range for out-of-bounds index', () => {
    expect(md.substring(...getRangeByIndex(md, 5))).toBe('')
    expect(md.substring(...getRangeByIndex(md, -5))).toBe('')
  })

  test('works with single page markdown', () => {
    const singlePage = '# Hello World'
    const [start, end] = getRangeByIndex(singlePage, 0)
    expect(singlePage.substring(start, end)).toBe('# Hello World')
  })
})
