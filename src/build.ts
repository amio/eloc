import { resolve, basename, dirname } from 'path'
import globby from 'globby'
import fse from 'fs-extra'

import { createIndexHTML } from './assets'

interface BuildOptions {
  'out-dir'?: string;
  'include'?: string;
  'title'?: string;
}

export default async function build (markdownFile: string, options: BuildOptions) {
  const { 'out-dir': out = 'public', include } = options
  const dest = resolve(process.cwd(), out)

  const filepath = resolve(process.cwd(), markdownFile)
  const filename = basename(filepath)
  const dir = dirname(filepath)

  // ensure dest dir
  await fse.emptyDir(dest)

  // copy main markdown file
  await fse.copy(filepath, resolve(dest, filename))

  // copy included files
  include && await globCopy(include, dir, dest)

  // write index.html
  const indexHTML = createIndexHTML({ filename, title: options.title })
  await fse.outputFile(resolve(dest, 'index.html'), indexHTML)
}

async function globCopy (globs: string, source: string, dest: string) {
  const files = await globby(globs.split(','), { cwd: source })

  return Promise.all(files.map(file => fse.copy(
    resolve(source, file),
    resolve(dest, file)
  )))
}
