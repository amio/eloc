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
