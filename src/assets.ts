import fs from 'fs'
import { join } from 'path'

const { version } = require('../package.json')

declare global {
  interface Window {
    markdownSrc: string | null;
  }
}

export const markdownDeckSource = fs.readFileSync(join(
  __dirname, '../packages/markdown-deck/dist/markdown-deck.min.js',
), 'utf8')

export const mdEditorSource = fs.readFileSync(join(
  __dirname, '../packages/md-editor/dist/index.js',
), 'utf8')

export const editingJsSource = fs.readFileSync(join(__dirname, 'editing.js'))

export interface IndexHTMLOptions {
  filename: string;
  title?: string;
  edit?: true;
  css?: string;
  dark?: boolean;
  progressBar?: boolean;
}

export function createIndexHTML ({ filename, title, edit, css, dark, progressBar }: IndexHTMLOptions) {
  const cssAttr = css ? `css="${css}"` : ''
  const progressBarAttr = progressBar ? 'progressBar' : ''
  const invertAttr = dark ? 'invert' : ''

  const scriptContent = [
    mdEditorSource,
    markdownDeckSource,
    edit && editingJsSource,
  ].join(';')

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="ie=edge">
      <title>${title || filename}</title>
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
        deck.src = new URL(document.location).searchParams.get('src') || "${filename}"
      </script>
      <script>window.module = {}</script>
      <script>window.__dirname = ''</script>
      <script>${scriptContent}</script>
    </body>
  </html>`
}
