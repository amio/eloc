import { cp, mkdir, stat, writeFile } from 'node:fs/promises'
import { join, dirname, resolve } from 'node:path'
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
  const dest = resolve(process.cwd(), out)
  const deckAssets = resolveDeckAssets(markdownFile, options)
  if (!(await stat(deckAssets.markdownPath)).isFile()) {
    throw new Error(`Expected a Markdown file: ${markdownFile}`)
  }

  const matchedFiles = await globby(deckAssets.assetGlobs, { cwd: deckAssets.rootDir })
  await copyFiles([...new Set([...deckAssets.requiredFiles, ...matchedFiles])], deckAssets.rootDir, dest)

  // write index.html
  const indexHTML = createIndexHTML({
    filename: deckAssets.filename,
    source: deckAssets.source,
    title,
    css: deckAssets.css,
    dark,
    progressBar
  })
  await outputFile(join(dest, 'index.html'), indexHTML)
}

async function copyFiles (files: string[], source: string, dest: string) {
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
