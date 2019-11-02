import { join, basename } from 'path'
import fse from 'fs-extra'

import { createIndexHTML } from './assets'

interface InitOptions {
  'title'?: string;
  'css'?: string;
}

export default async function init (markdownFile: string, options: InitOptions) {
  const { title, css } = options
  const dest = process.cwd()

  const filepath = join(process.cwd(), markdownFile)
  const filename = basename(filepath)

  // write index.html
  const indexHTML = createIndexHTML({ filename, title, css })
  await fse.outputFile(join(dest, 'index.html'), indexHTML)
}
