import { cp, mkdir, writeFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { globby } from 'globby'

import { createIndexHTML } from './assets'
import { resolveDeckAssets } from './deck-assets'

interface BuildOptions {
  'out-dir'?: string;
  'include'?: string | string[];
  'title'?: string;
  'css'?: string | string[];
  'dark'?: boolean;
  'progress-bar'?: boolean;
}

export default async function build (markdownFile: string, options: BuildOptions) {
  const { 'out-dir': out = 'public', title, dark, 'progress-bar': progressBar } = options
  const dest = join(process.cwd(), out)
  const deckAssets = resolveDeckAssets(markdownFile, options)

  await globCopy(deckAssets.assetGlobs, deckAssets.rootDir, dest)

  // write index.html
  const indexHTML = createIndexHTML({
    filename: deckAssets.filename,
    title,
    css: deckAssets.css,
    dark,
    progressBar
  })
  await outputFile(join(dest, 'index.html'), indexHTML)
}

async function globCopy (globs: string[], source: string, dest: string) {
  const files = await globby(globs, { cwd: source })

  return Promise.all(files.map(async file => {
    const target = join(dest, file)

    await mkdir(dirname(target), { recursive: true })
    await cp(join(source, file), target, { recursive: true })
  }))
}

async function outputFile (file: string, content: string) {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, content)
}
