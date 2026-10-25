import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createIndexHTML } from '../../src/assets.ts'

import { assets, readConfig } from './helpers.ts'

test('renders a self-contained shell with filename defaults and injected resources', () => {
  const html = createIndexHTML({ filename: 'A&B.md', source: './A%26B.md' }, assets)
  assert.ok(html.includes('<title>A&amp;B.md</title>'))
  assert.ok(html.includes(`<style>${assets.appCSS}</style>`))
  assert.ok(html.includes(`<script>${assets.clientSource}</script>`))
  assert.deepEqual(readConfig(html), { filename: 'A&B.md', source: './A%26B.md' })
})

test('serializes configuration and escapes HTML/script delimiters without changing values', () => {
  const config = { filename: 'deck.md', source: './deck.md', title: '</title><script>alert("&")</script>', css: '</script>theme.css', dark: true, progressBar: true, saveToken: 'token' }
  const html = createIndexHTML(config, { ...assets, clientSource: 'console.log("</ScRiPt>")' })
  assert.ok(html.includes('<title>&lt;/title&gt;&lt;script&gt;alert("&amp;")&lt;/script&gt;</title>'))
  assert.deepEqual(readConfig(html), config)
  assert.ok(html.includes('console.log("<\\/script>")'))
  assert.equal((html.match(/<\/script>/g) || []).length, 2)
})
