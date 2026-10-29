import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { assertPathInsideRoot, resolveDeckAssets } from '../../src/deck-assets.ts'

const cwd = resolve('/workspace')
const root = resolve(cwd, 'slides')

test('resolves Markdown against an explicit cwd and encodes browser references', () => {
  const assets = resolveDeckAssets('slides/deck#100%23.md', {}, cwd)
  assert.equal(assets.rootDir, root)
  assert.equal(assets.markdownPath, resolve(root, 'deck#100%23.md'))
  assert.equal(assets.filename, 'deck#100%23.md')
  assert.equal(assets.source, './deck%23100%2523.md')
  assert.deepEqual(assets.requiredFiles, ['deck#100%23.md'])
  assert.deepEqual(assets.assetGlobs, ['*.png', '*.svg', '*.gif', '*.jpg'])
})

test('normalizes deck-relative, cwd-prefixed, absolute, and Windows-style local asset references', () => {
  for (const css of ['styles/theme.css', './slides/styles/theme.css', resolve(root, 'styles/theme.css'), 'slides\\styles\\theme.css']) {
    const assets = resolveDeckAssets('slides/deck.md', { css, include: ['slides/assets/**', '!slides/assets/private/**', '*.png'] }, cwd)
    assert.equal(assets.css, './styles/theme.css')
    assert.deepEqual(assets.requiredFiles, ['deck.md', 'styles/theme.css'])
    assert.deepEqual(assets.assetGlobs, ['*.png', '*.svg', '*.gif', '*.jpg', 'assets/**', '!assets/private/**'])
  }
})

test('treats required filenames literally and selects the last stylesheet', () => {
  const assets = resolveDeckAssets('slides/!deck*.md', { css: ['first.css', '././!theme#100%.css'] }, cwd)
  assert.equal(assets.css, './!theme%23100%25.css')
  assert.deepEqual(assets.requiredFiles, ['!deck*.md', '!theme#100%.css'])
})

test('keeps external stylesheets as URLs without copying them', () => {
  for (const css of ['https://example.com/theme.css', '//example.com/theme.css', 'data:text/css,body{}']) {
    const assets = resolveDeckAssets('slides/deck.md', { css }, cwd)
    assert.equal(assets.css, css)
    assert.deepEqual(assets.requiredFiles, ['deck.md'])
  }
})

test('rejects traversal and external URLs in local asset patterns', () => {
  for (const pattern of ['../private.css', 'styles/../../private.css', resolve(cwd, 'private.css'), 'slides', root]) {
    assert.throws(() => resolveDeckAssets('slides/deck.md', { css: pattern }, cwd), /must stay inside/)
    assert.throws(() => resolveDeckAssets('slides/deck.md', { include: pattern }, cwd), /must stay inside/)
  }
  for (const include of ['https://example.com/**', '!../private/**', '//example.com/**']) {
    assert.throws(() => resolveDeckAssets('slides/deck.md', { include }, cwd))
  }
})

test('enforces lexical containment without confusing sibling directory prefixes', () => {
  assert.doesNotThrow(() => assertPathInsideRoot(resolve(root, 'deck.md'), root))
  for (const file of [root, cwd, resolve(cwd, 'slides-private/secret.md')]) {
    assert.throws(() => assertPathInsideRoot(file, root), /outside allowed directory/)
  }
})
