import { resolve, posix, dirname } from 'path'
import globby from 'globby'
import fse from 'fs-extra'

interface BuildOptions {
  'out-dir'?: string;
  'include'?: string;
  'title'?: string;
}

export default async function build (markdownFile: string, options: BuildOptions) {
  const { 'out-dir': out = 'public', include } = options
  const dest = resolve(process.cwd(), out)

  const filepath = resolve(process.cwd(), markdownFile)
  const filename = posix.basename(filepath)
  const dir = dirname(filepath)

  // ensure dest dir
  await fse.emptyDir(dest)

  // copy main markdown file
  await fse.copy(filepath, resolve(dest, filename))

  // copy included files
  include && await globCopy(include, dir, dest)

  // copy markdown-deck files
  const mddist = resolve(__dirname, '..', 'node_modules', 'markdown-deck', 'dist')
  await fse.copy(mddist, resolve(dest, 'assets'))

  // write index.html
  await fse.outputFile(resolve(dest, 'index.html'), createIndex(filename, options.title))
}

async function globCopy (globs: string, source: string, dest: string) {
  const files = await globby(globs.split(','), { cwd: source })

  return Promise.all(files.map(file => fse.copy(
    resolve(source, file),
    resolve(dest, file)
  )))
}

function createIndex (filename: string, title?: string) {
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
    </body>
  </html>`
}
