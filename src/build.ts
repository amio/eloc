import { join, basename, dirname } from 'path'
import globby from 'globby'
import fse from 'fs-extra'

import { createIndexHTML } from './assets'

interface BuildOptions {
  'out-dir'?: string;
  'include'?: string;
  'title'?: string;
  'css'?: string;
}

export default async function build (markdownFile: string, options: BuildOptions) {
  const { 'out-dir': out = 'public', title, include, css } = options
  const dest = join(process.cwd(), out)

  const filepath = join(process.cwd(), markdownFile)
  const filename = basename(filepath)
  const dir = dirname(filepath)

  // ensure dest dir
  await fse.emptyDir(dest)

  // copy main markdown file
  await fse.copy(filepath, join(dest, filename))

  // copy included files
  include && await globCopy(include, dir, dest)

  // copy css file
  css && await fse.copy(css, join(dest, css))

  // write index.html
  const indexHTML = createIndexHTML({ filename, title, css })
  await fse.outputFile(join(dest, 'index.html'), indexHTML)
}

async function globCopy (globs: string, source: string, dest: string) {
  const files = await globby(globs.split(','), { cwd: source })

  return Promise.all(files.map(file => fse.copy(
    join(source, file),
    join(dest, file)
  )))
}
