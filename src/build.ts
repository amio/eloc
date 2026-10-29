import { cp, mkdir, stat, writeFile } from 'node:fs/promises'
import { join, dirname, resolve } from 'node:path'
import { globby } from 'globby'

import { createEmbedHTML, createIndexHTML, type PresentationAssets } from './assets.ts'
import { resolveDeckAssets, type DeckAssetOptions } from './deck-assets.ts'

export interface BuildOptions extends DeckAssetOptions {
  'out-dir'?: string;
  'title'?: string;
  'dark'?: boolean;
  'progress-bar'?: boolean;
}

export default async function build (markdownFile: string, options: BuildOptions, assets: PresentationAssets, cwd = process.cwd()) {
  const { 'out-dir': out = 'public', title, dark, 'progress-bar': progressBar } = options
  const dest = resolve(cwd, out)
  const deckAssets = resolveDeckAssets(markdownFile, options, cwd)
  if (!(await stat(deckAssets.markdownPath)).isFile()) {
    throw new Error(`Expected a Markdown file: ${markdownFile}`)
  }

  const matchedFiles = await globby(deckAssets.assetGlobs, { cwd: deckAssets.rootDir })
  const files = [...new Set([...deckAssets.requiredFiles, ...matchedFiles])]
  if (files.some(file => file.toLowerCase() === 'embed.html')) throw new Error('Cannot export "embed.html": this filename is reserved for the embedded player')
  await copyFiles(files, deckAssets.rootDir, dest)

  const indexHTML = createIndexHTML({
    filename: deckAssets.filename,
    source: deckAssets.source,
    title,
    css: deckAssets.css,
    dark,
    progressBar
  }, assets)
  await outputFile(join(dest, 'index.html'), indexHTML)
  await outputFile(join(dest, 'embed.html'), createEmbedHTML(assets))
}

async function copyFiles (files: string[], source: string, dest: string) {
  const results = await Promise.allSettled(files.map(async file => {
    const target = join(dest, file)

    await mkdir(dirname(target), { recursive: true })
    await cp(join(source, file), target, { recursive: true })
  }))
  // A failed export must settle every copy before callers clean up or retry.
  const failure = results.find(result => result.status === 'rejected')
  if (failure) throw failure.reason
}

async function outputFile (file: string, content: string) {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, content)
}
