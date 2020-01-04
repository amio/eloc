import fs from 'fs'
import http from 'http'
import { resolve } from 'path'
import { router, get, post } from 'micro-fork'
import { json } from 'micri'
import open from 'open'
import serveHandler from 'serve-handler'
import { bold, cyan, underline, dim } from 'kleur'

import { createIndexHTML, IndexHTMLOptions } from './assets'

type Request = http.IncomingMessage
type Response = http.ServerResponse

interface ServeOptions {
  port?: number;
  open?: boolean;
  quiet?: boolean;
  title?: string;
  css?: string;
  dark?: boolean;
  'progress-bar'?: boolean;
}

const { PORT = '5000' } = process.env

export default function elocServe (markdownFile: string, options: ServeOptions) {
  const { title, css, dark, 'progress-bar': progressBar } = options

  const verboseLog = (...msg: Array<any>) => {
    options.quiet || console.info(' ', ...msg)
  }

  const handler = router()(
    get('/', sendIndex({ filename: markdownFile, title, css, dark, progressBar })),
    get('/*', serveDir(process.cwd())),
    post('/api/save', handleSave(markdownFile, verboseLog))
  )

  const server = http.createServer(handler)
  const port = options.port || parseInt(PORT, 10)

  server.listen(port).on('listening', () => {
    const url = `http://localhost:${port}`

    console.info(`\n  Presenting at ${bold(url)}\n`)

    verboseLog(dim(' *'), `[${cyan('ESC')}] to toggle editor`)
    verboseLog(dim(' *'), `[${cyan('CMD+S')}/${cyan('CTRL+S')}] to save to ${underline(markdownFile)}\n`)

    options.open && open(url)
  }).on('error', (error: NodeJS.ErrnoException) => {
    console.error(error.message)
  })
}

function sendIndex (opts: IndexHTMLOptions) {
  return (req: Request, res: Response) => {
    const indexHTML = createIndexHTML({ ...opts, edit: true })
    res.setHeader('Content-Type', 'text/html')
    res.end(indexHTML)
  }
}

function serveDir (dir: string) {
  return (req: Request, res: Response) => serveHandler(req, res, {
    public: resolve(__dirname, dir),
    directoryListing: false,
    headers: [
      { source: '**/*.md', headers : [{ key: 'Cache-Control', value: 'no-store' }] },
      { source: '**/*', headers : [{ key: 'Cache-Control', value: 'public, max-age: 3600' }] }
    ]
  })
}

function handleSave (file: string, verboseLog: typeof console.info) {
  const filePath = resolve(process.cwd(), file)
  return async (req: Request, res: Response) => {
    try {
      const { markdown } = await json(req) as any
      fs.writeFileSync(filePath, markdown)
      res.end(`Saved to "${filePath}" (${markdown.length} Bytes)`)

      verboseLog(
        `Saved to ${underline(file)} (${markdown.length} Bytes)`,
        dim(new Date().toLocaleTimeString())
      )
    } catch (e) {
      res.statusCode = 500
      res.end(e.message)
      console.error(e.message)
    }
  }
}
