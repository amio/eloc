import { cp, mkdir, writeFile } from 'node:fs/promises'
import { join, basename, dirname } from 'node:path'
import { globby } from 'globby'

import { createIndexHTML } from './assets'

interface BuildOptions {
  'out-dir'?: string;
  'include'?: string;
  'title'?: string;
  'css'?: string;
  'dark'?: boolean;
  'progress-bar'?: boolean;
}

export default async function build (markdownFile: string, options: BuildOptions) {
  const { 'out-dir': out = 'public', title, include, css, dark, 'progress-bar': progressBar } = options
  const dest = join(process.cwd(), out)

  const filepath = join(process.cwd(), markdownFile)
  const filename = basename(filepath)
  const dir = dirname(filepath)

  // copy files
  const userAssets = [filename]
    .concat(['*.png', '*.svg', '*.gif', '*.jpg']) // auto include images
    .concat(include as string)
    .concat(css as string)
    .filter(Boolean)

  await globCopy(userAssets, dir, dest)

  // write index.html
  const indexHTML = createIndexHTML({ filename, title, css, dark, progressBar })
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
