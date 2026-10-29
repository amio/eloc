import type { DeckConfig } from './client/config'
import { createHash } from 'node:crypto'

export type IndexHTMLOptions = DeckConfig

export interface PresentationAssets {
  clientSource: string
  appCSS: string
}

export function createIndexHTML({ filename, source, title, css, dark, progressBar, saveToken, mode }: IndexHTMLOptions, { clientSource, appCSS }: PresentationAssets) {
  const config: DeckConfig = { filename, source, title, css, dark, progressBar, saveToken: mode === 'embed' ? undefined : saveToken, mode }
  const script = clientSource.replace(/<\/script/gi, '<\\/script')
  const policy = mode === 'embed'
    ? `<meta http-equiv="Content-Security-Policy" content="script-src 'sha256-${createHash('sha256').update(script).digest('base64')}'; object-src 'none'; form-action 'none'">`
    : ''
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${policy}
    <meta name="description" content="eloc: Markdown presentations with a live editor. Write, present, and export to HTML.">
    <title>${escapeHtmlText(title || filename)}</title>
    <style>${appCSS}</style>
  </head>
  <body>
    <div id="app"></div>
    <noscript>Enable JavaScript to view and edit this presentation.</noscript>
    <script id="eloc-config" type="application/json">${JSON.stringify(config).replace(/</g, '\\u003c')}</script>
    <script>${script}</script>
  </body>
</html>`
}

export function createEmbedHTML(assets: PresentationAssets): string {
  return createIndexHTML({ filename: 'eloc embedded presentation', source: '', mode: 'embed' }, assets)
}

function escapeHtmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
