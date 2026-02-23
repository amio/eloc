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

test('Split markdown pages', () => {
  const result = splitMarkdownToPages(md)

  expect(result instanceof Array).toBe(true)
  expect(result.length).toBe(5)
})

test('Get content by page index', () => {
  expect(md.substring(...getRangeByIndex(md, 0))).toBe('\n# Title')
  expect(md.substring(...getRangeByIndex(md, 1))).toBe('page 1')
  expect(md.substring(...getRangeByIndex(md, 2))).toBe('page 2')
  expect(md.substring(...getRangeByIndex(md, 3))).toBe('page 3')
  expect(md.substring(...getRangeByIndex(md, 4))).toBe('page 4\n')
  expect(md.substring(...getRangeByIndex(md, 5))).toBe('')
  expect(md.substring(...getRangeByIndex(md, -5))).toBe('')
})

test('Split markdown pages with HR at start/end', () => {
  const mdWithHR = '---\nPage 2\n---'
  const result = splitMarkdownToPages(mdWithHR)
  expect(result.length).toBe(3)
  expect(result[0]).toBe('')
  expect(result[1]).toBe('Page 2')
  expect(result[2]).toBe('')
})

test('Split markdown with different HR styles', () => {
  const mixedMd = 'Page 1\n---\nPage 2\n***\nPage 3\n----------\nPage 4\n**********'
  const result = splitMarkdownToPages(mixedMd)
  expect(result.length).toBe(5)
  expect(result[0]).toBe('Page 1')
  expect(result[1]).toBe('Page 2')
  expect(result[2]).toBe('Page 3')
  expect(result[3]).toBe('Page 4')
  expect(result[4]).toBe('')
})

test('getRangeByIndex edge cases', () => {
  const simpleMd = 'P1\n---\nP2'
  // Page 0
  expect(getRangeByIndex(simpleMd, 0)).toEqual([0, 2])
  // Page 1
  expect(getRangeByIndex(simpleMd, 1)).toEqual([7, 9])
  // Out of bounds
  expect(getRangeByIndex(simpleMd, 2)).toEqual([9, 9])
})
