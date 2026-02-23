import { tokenize, grammars, Token } from './tokenizer'

test('Tokenize headings', () => {
  const text = '# Hello\n## World\n### Test'
  const tokens = tokenize(text)
  const headings = tokens.filter(t => t.type === 'heading')
  expect(headings.length).toBe(3)
  expect(text.substring(headings[0].start, headings[0].end)).toBe('# Hello')
  expect(text.substring(headings[1].start, headings[1].end)).toBe('## World')
  expect(text.substring(headings[2].start, headings[2].end)).toBe('### Test')
})

test('Tokenize bold text', () => {
  const text = 'Hello **bold** world'
  const tokens = tokenize(text)
  const bold = tokens.filter(t => t.type === 'bold')
  expect(bold.length).toBe(1)
  expect(text.substring(bold[0].start, bold[0].end)).toBe('**bold**')
})

test('Tokenize italic text', () => {
  const text = 'Hello *italic* world'
  const tokens = tokenize(text)
  const italic = tokens.filter(t => t.type === 'italic')
  expect(italic.length).toBe(1)
  expect(text.substring(italic[0].start, italic[0].end)).toBe('*italic*')
})

test('Tokenize inline code', () => {
  const text = 'Use `console.log()` here'
  const tokens = tokenize(text)
  const code = tokens.filter(t => t.type === 'code')
  expect(code.length).toBe(1)
  expect(text.substring(code[0].start, code[0].end)).toBe('`console.log()`')
})

test('Tokenize links', () => {
  const text = 'Visit [GitHub](https://github.com) today'
  const tokens = tokenize(text)
  const links = tokens.filter(t => t.type === 'link')
  expect(links.length).toBe(1)
  expect(text.substring(links[0].start, links[0].end)).toBe('[GitHub](https://github.com)')
})

test('Tokenize blockquotes', () => {
  const text = '> This is a quote\n> Another line'
  const tokens = tokenize(text)
  const quotes = tokens.filter(t => t.type === 'blockquote')
  expect(quotes.length).toBe(2)
  expect(text.substring(quotes[0].start, quotes[0].end)).toBe('> This is a quote')
})

test('Tokenize horizontal rules', () => {
  const text = 'Above\n---\nBelow\n***\nEnd'
  const tokens = tokenize(text)
  const hrs = tokens.filter(t => t.type === 'hr')
  expect(hrs.length).toBe(2)
})

test('Tokenize unordered lists', () => {
  const text = '- Item 1\n- Item 2\n* Item 3'
  const tokens = tokenize(text)
  const lists = tokens.filter(t => t.type === 'list')
  expect(lists.length).toBe(3)
})

test('Tokenize ordered lists', () => {
  const text = '1. First\n2. Second\n3. Third'
  const tokens = tokenize(text)
  const ordered = tokens.filter(t => t.type === 'orderedList')
  expect(ordered.length).toBe(3)
})

test('Tokenize strikethrough', () => {
  const text = 'This is ~~deleted~~ text'
  const tokens = tokenize(text)
  const strike = tokens.filter(t => t.type === 'strikethrough')
  expect(strike.length).toBe(1)
  expect(text.substring(strike[0].start, strike[0].end)).toBe('~~deleted~~')
})

test('Tokens are sorted by start position', () => {
  const text = '# Heading\n**bold** and `code`'
  const tokens = tokenize(text)
  for (let i = 1; i < tokens.length; i++) {
    expect(tokens[i].start).toBeGreaterThanOrEqual(tokens[i - 1].start)
  }
})

test('Empty text returns no tokens', () => {
  const tokens = tokenize('')
  expect(tokens).toEqual([])
})

test('Custom grammar rules', () => {
  const custom = { hashtag: /#\w+/g }
  const text = 'Hello #world and #test'
  const tokens = tokenize(text, custom)
  expect(tokens.length).toBe(2)
  expect(tokens[0].type).toBe('hashtag')
  expect(text.substring(tokens[0].start, tokens[0].end)).toBe('#world')
  expect(text.substring(tokens[1].start, tokens[1].end)).toBe('#test')
})

test('Multiple bold in one line', () => {
  const text = '**first** and **second**'
  const tokens = tokenize(text)
  const bold = tokens.filter(t => t.type === 'bold')
  expect(bold.length).toBe(2)
})

test('Heading levels 1-6', () => {
  const text = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6'
  const tokens = tokenize(text)
  const headings = tokens.filter(t => t.type === 'heading')
  expect(headings.length).toBe(6)
})
