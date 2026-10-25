import { test } from 'node:test'
import assert from 'node:assert/strict'
import { access, mkdir, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import build from '../../src/build.ts'
import { assets, readConfig, workspace } from './helpers.ts'

test('exports Markdown, default images, nested includes, and the last CSS with configured HTML', async t => {
  const { root, write } = await workspace(t)
  await write('slides/deck.md', '# Export')
  for (const extension of ['png', 'svg', 'gif', 'jpg']) await write(`slides/image.${extension}`, 'image')
  await write('slides/styles/theme.css', '.content { color: green }')
  await write('slides/assets/notes.txt', 'notes')
  await write('slides/assets/private.txt', 'private')
  await build('slides/deck.md', {
    'out-dir': 'output', include: ['slides/assets/**', '!assets/private.txt', '*.png'],
    css: ['unused.css', 'slides/styles/theme.css'], title: 'My Deck', dark: true, 'progress-bar': true
  }, assets, root)
  for (const file of ['deck.md', 'image.png', 'image.svg', 'image.gif', 'image.jpg', 'styles/theme.css', 'assets/notes.txt']) {
    assert.equal(await readFile(join(root, 'output', file), 'utf8'), await readFile(join(root, 'slides', file), 'utf8'))
  }
  for (const file of ['assets/private.txt', 'unused.css']) await assert.rejects(access(join(root, 'output', file)))
  const config = readConfig(await readFile(join(root, 'output/index.html'), 'utf8'))
  assert.deepEqual(config, { filename: 'deck.md', source: './deck.md', title: 'My Deck', css: './styles/theme.css', dark: true, progressBar: true })
  assert.equal(await readFile(join(root, 'slides/deck.md'), 'utf8'), '# Export')
})

test('uses public by default and copies literal inputs even when include patterns exclude them', async t => {
  const { root, write } = await workspace(t)
  await write('slides/!deck*.md', '# Literal')
  await write('slides/!theme#100%.css', 'body {}')
  await build('slides/!deck*.md', { css: '!theme#100%.css', include: '!**' }, assets, root)
  assert.equal(await readFile(join(root, 'public/!deck*.md'), 'utf8'), '# Literal')
  assert.equal(await readFile(join(root, 'public/!theme#100%.css'), 'utf8'), 'body {}')
  assert.equal(readConfig(await readFile(join(root, 'public/index.html'), 'utf8')).css, './!theme%23100%25.css')
})

test('supports absolute input/output paths and external CSS without downloading it', async t => {
  const { root, write } = await workspace(t)
  const file = await write('slides/deck.md', '# Absolute')
  await build(file, { 'out-dir': join(root, 'output'), css: 'https://example.com/theme.css' }, assets, root)
  assert.equal(await readFile(join(root, 'output/deck.md'), 'utf8'), '# Absolute')
  assert.equal(readConfig(await readFile(join(root, 'output/index.html'), 'utf8')).css, 'https://example.com/theme.css')
})

test('rejects a missing source, directories, and asset traversal', async t => {
  const { root, write } = await workspace(t)
  await write('slides/deck.md', '# Deck')
  await mkdir(join(root, 'directory'))
  await assert.rejects(build('missing.md', {}, assets, root), /ENOENT/)
  await assert.rejects(build('directory', {}, assets, root), /Expected a Markdown file/)
  await assert.rejects(build('slides/deck.md', { include: '../secret/**' }, assets, root), /must stay inside/)
})

test('propagates output filesystem errors to the caller', async t => {
  const { root, write } = await workspace(t)
  await write('deck.md', '# Deck')
  await write('output', 'a file blocking the output directory')
  await assert.rejects(build('deck.md', { 'out-dir': 'output' }, assets, root), /EEXIST|ENOTDIR/)
})

test('finishes all pending copies before rejecting an export with missing CSS', async t => {
  const { root, write } = await workspace(t)
  await write('slides/deck.md', '# Deck')
  for (let index = 0; index < 20; index++) await write(`slides/assets/${index}/notes.txt`, 'included')
  await assert.rejects(build('slides/deck.md', { css: 'missing.css', include: 'assets/**' }, assets, root), /ENOENT/)
  // Completed copies prove the rejection did not abandon in-flight filesystem work.
  for (let index = 0; index < 20; index++) {
    assert.equal(await readFile(join(root, `public/assets/${index}/notes.txt`), 'utf8'), 'included')
  }
  await rm(join(root, 'public'), { recursive: true })
})
