import fs from 'fs'
import http from 'http'
import { resolve, basename, dirname } from 'path'
import micromatch from 'micromatch'
// @ts-ignore
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
  include?: string | string[];
  title?: string;
  css?: string;
}

const { PORT = '5000' } = process.env

export default function elocServe (markdownFile: string, options: ServeOptions) {
  const { title, css, include } = options
  const filepath = resolve(process.cwd(), markdownFile)
  const filename = basename(filepath)
  const dir = dirname(filepath)

  const userAssets: string[] = [markdownFile]
    .concat(include as string | string[])
    .concat(css as string)
    .filter(Boolean)

  const verboseLog = (...msg: Array<any>) => {
    options.quiet || console.info(' ', ...msg)
  }

  const handler = router()(
    get('/', sendIndex({ filename, title, css })),
    get('/*', serveUserAssets(dir, userAssets)),
    post('/api/save', handleSave(filepath, verboseLog))
  )

  const server = http.createServer(handler)
  const port = options.port || parseInt(PORT, 10)

  server.listen(port).on('listening', () => {
    const url = `http://localhost:${port}`

    console.info(`\n  Presenting at ${bold(url)}\n`)

    verboseLog(dim(' *'), `[${cyan('ESC')}] to toggle editor`)
    verboseLog(dim(' *'), `[${cyan('CMD+S')}/${cyan('CTRL+S')}] to save to ${underline(filename)}\n`)

    options.open && open(url)
  }).on('error', (error: NodeJS.ErrnoException) => {
    console.error(error.message)
  })
}

function sendIndex ({ filename, title, css }: IndexHTMLOptions) {
  return (req: Request, res: Response) => {
    const indexHTML = createIndexHTML({ filename, title, css, edit: true })
    res.setHeader('Content-Type', 'text/html')
    res.end(indexHTML)
  }
}

function serveDir (dir: string) {
  return (req: Request, res: Response) => serveHandler(req, res, {
    public: resolve(__dirname, dir),
    directoryListing: false,
    headers: [
      { source: '**/*', headers : [{ key: 'Cache-Control', value: 'no-store' }] }
    ]
  })
}

function serveUserAssets (cwd: string, globs: string[]) {
  const handler = serveDir(cwd)

  return (req: Request, res: Response) => {
    const filepath = (req.url || '').substr(1)
    const included = globs.some(glob => micromatch.isMatch(filepath, glob))
    included ? handler(req, res) : sendError(404)(req, res)
  }
}

function sendError (code: number, message?: string) {
  return (req: Request, res: Response) => {
    message && (res.statusMessage = message)
    res.statusCode = code
    res.end()
  }
}

function handleSave (filePath: string, verboseLog: typeof console.info) {
  return async (req: Request, res: Response) => {
    try {
      const { markdown } = await json(req) as any
      fs.writeFileSync(filePath, markdown)
      res.end(`Saved to "${filePath}" (${markdown.length} Bytes)`)

      verboseLog(
        `Saved to ${underline(basename(filePath))} (${markdown.length} Bytes)`,
        dim(new Date().toLocaleTimeString())
      )
    } catch (e) {
      res.statusCode = 500
      res.end(e.message)
      console.error(e.message)
    }
  }
}
