const test = require('tape')
const { splitMarkdownToPages, getRangeByIndex } = require('../dist/utils.js')

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

test('Split markdown pages', t => {
  const result = splitMarkdownToPages(md)

  t.assert(result instanceof Array, 'result is array')
  t.assert(result.length === 5, 'splited to 5 pages')
  t.end()
})

test('Get range by page index', t => {
  t.equal(md.substring(...getRangeByIndex(md, 0)), '\n# Title', 'range of page 0')
  t.equal(md.substring(...getRangeByIndex(md, 1)), 'page 1', 'range of page 1')
  t.equal(md.substring(...getRangeByIndex(md, 2)), 'page 2', 'range of page 2')
  t.equal(md.substring(...getRangeByIndex(md, 3)), 'page 3', 'range of page 3')
  t.equal(md.substring(...getRangeByIndex(md, 4)), 'page 4\n', 'range of page 4')
  t.equal(md.substring(...getRangeByIndex(md, 5)), '', 'range of page overflows (5)')
  t.equal(md.substring(...getRangeByIndex(md, -5)), '', 'range of page overflows (-5)')
  t.end()
})
