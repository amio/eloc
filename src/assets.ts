import fs from 'fs'
import { join } from 'path'

const { version } = require('../package.json')

declare global {
  interface Window {
    markdownSrc: string | null;
    markdownDeckConfig?: {
      src?: string;
      css?: string;
      hotkey?: boolean;
      hashsync?: boolean;
      progressBar?: boolean;
      invert?: boolean;
      editing?: boolean;
    };
  }
}

export const markdownDeckSource = fs.readFileSync(join(
  __dirname, '../packages/markdown-deck/dist/markdown-deck.mount.min.js',
), 'utf8')

export const markdownDeckCSS = (() => {
  const cssPath = join(__dirname, '../packages/markdown-deck/dist/markdown-deck.css')
  try {
    return fs.readFileSync(cssPath, 'utf8')
  } catch {
    return ''
  }
})()

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
  const scriptContent = [
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
        #markdown-deck { height: 100% }

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

        ${markdownDeckCSS}
      </style>
    </head>
    <body>
      <div id="markdown-deck"
        data-hotkey
        data-hashsync
        ${css ? `data-css="${css}"` : ''}
        ${progressBar ? 'data-progressbar' : ''}
        ${dark ? 'data-invert' : ''}
      ></div>
      <script>
        console.info('Built with eloc-cli (v${version})')
        window.markdownDeckConfig = {
          src: new URL(document.location).searchParams.get('src') || "${filename}",
          hotkey: true,
          hashsync: true,
          ${css ? `css: "${css}",` : ''}
          ${progressBar ? 'progressBar: true,' : ''}
          ${dark ? 'invert: true,' : ''}
        }
      </script>
      <script>${scriptContent}</script>
    </body>
  </html>`
}
