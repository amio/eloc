import markdownDeckSource from '../packages/markdown-deck/dist/markdown-deck.min.js?raw'
import editingJsSource from './editing.js?raw'

const { version } = require('../package.json')

declare global {
  interface Window {
    __elocSaveToken?: string;
  }
}

export interface IndexHTMLOptions {
  filename: string;
  title?: string;
  edit?: true;
  css?: string;
  dark?: boolean;
  progressBar?: boolean;
  saveToken?: string;
}

export function createIndexHTML ({ filename, title, edit, css, dark, progressBar, saveToken }: IndexHTMLOptions) {
  const cssAttr = css ? `css="${escapeHtmlAttr(css)}"` : ''
  const progressBarAttr = progressBar ? 'progressBar' : ''
  const invertAttr = dark ? 'invert' : ''
  const saveTokenScript = edit ? `<script>window.__elocSaveToken = ${toJsLiteral(saveToken || '')}</script>` : ''

  const scriptContent = escapeScriptContent([
    markdownDeckSource,
    edit && editingJsSource,
  ].join(';'))

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="ie=edge">
      <title>${escapeHtmlText(title || filename)}</title>
      <style>
        html, body { height: 100%; margin: 0 }

        .toast { background-color: #444; color: #fff; text-align: left; white-space: nowrap }
        .toast { font: 16px/30px sans-serif; min-width: 300px; padding: 5px 1em; border-radius: 6px }
        .toast { position: fixed; left: 10px; animation: toast 2s }
        .toast.success { background-color: #3B6 }
        .toast.error { background-color: #E54 }

        @keyframes toast {
          from { bottom: -10px; opacity: 0 }
          10% { bottom: 10px; opacity: 1 }
          90% { bottom: 10px; opacity: 1 }
          to { bottom: -10px; opacity: 0 }
        }
      </style>
    </head>
    <body>
      <markdown-deck ${cssAttr} ${progressBarAttr} ${invertAttr} hotkey hashsync></markdown-deck>
      <script>
        console.info('Built with eloc-cli (v${version})')
        const deck = document.querySelector('markdown-deck')
        deck.src = new URL(document.location).searchParams.get('src') || ${toJsLiteral(filename)}
      </script>
      ${saveTokenScript}
      <script>window.module = {}</script>
      <script>window.__dirname = ''</script>
      <script>${scriptContent}</script>
    </body>
  </html>`
}

function escapeHtmlText (value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function escapeHtmlAttr (value: string): string {
  return escapeHtmlText(value)
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeScriptContent (value: string): string {
  return value.replace(/<\/script/gi, '<\\/script')
}

function toJsLiteral (value: string): string {
  return JSON.stringify(value).replace(/<\/script/gi, '<\\/script')
}
