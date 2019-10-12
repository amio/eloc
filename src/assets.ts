import fs from 'fs'
import { resolve } from 'path'

// read file content from root
function readFile (...relSegments: string[]): string {
  return fs.readFileSync(resolve(__dirname, '..', ...relSegments), 'utf8')
}

export const markdownDeckSource = readFile(
  'node_modules', 'markdown-deck', 'dist', 'markdown-deck.min.js'
)

export const editingJsSource = readFile('assets', 'editing.js')

interface IndexHTMLOptions {
  filename: string;
  title?: string;
  edit?: true;
}

export function createIndexHTML ({filename, title, edit}: IndexHTMLOptions) {
  const scripts = [
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
      <script type="module" src="assets/markdown-deck.min.js"></script>
      <style>
        html, body { height: 100%; margin: 0 }
      </style>
    </head>
    <body>
      <markdown-deck src="${filename}" hotkey hashsync></markdown-deck>
      <script>${scripts}</script>
    </body>
  </html>`
}
