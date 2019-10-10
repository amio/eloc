import fs from 'fs'
import http from 'http'
import { resolve, posix, dirname } from 'path'
import micromatch from 'micromatch'
// @ts-ignore
import { router, get, post } from 'micro-fork'
import { json } from 'micro'
import serveHandler from 'serve-handler'
import open from 'open'
import { bold, cyan, underline, dim } from 'kleur'

type Request = http.IncomingMessage
type Response = http.ServerResponse

interface ServeOptions {
  port?: number;
  open?: boolean;
  quiet?: boolean;
  include?: string;
  title?: string;
}

const { PORT = '5000' } = process.env

export default function elocServe (markdownFile: string, options: ServeOptions) {
  const filepath = resolve(process.cwd(), markdownFile)
  const filename = posix.basename(filepath)
  const dir = dirname(filepath)

  const verboseLog = (...msg: Array<any>) => {
    options.quiet || console.info('>', ...msg)
  }

  const handler = router()(
    get('/', sendIndex(filename, options.title)),
    get('/index.js', serveDir('../assets')),
    get('/markdown-deck.min.js', sendMarkdownDeckJs()),
    get('/*', serveUserAssets(dir, filename, options.include)),
    post('/api/save', handleSave(filepath, verboseLog))
  )

  const server = http.createServer(handler)
  const port = options.port || parseInt(PORT, 10)

  server.listen(port).on('listening', () => {
    const url = `http://localhost:${port}`

    console.info(`Presented on ${bold(url)}`)

    verboseLog(
      `[${cyan('ESC')}] to toggle editor,`,
      `[${cyan('CMD+S')}/${cyan('CTRL+S')}] to save to ${underline(filename)}`
    )

    options.open && open(url)
  }).on('error', (error: NodeJS.ErrnoException) => {
    console.error(error.message)
  })
}

function sendIndex (filename: string, title?: string) {
  return (req: Request, res: Response) => {
    const indexHTML = createIndex(filename, title)
    res.setHeader('Content-Type', 'text/html')
    res.end(indexHTML)
  }
}

function sendMarkdownDeckJs () {
  const deckJsFile = resolve(
    __dirname, '..', 'node_modules', 'markdown-deck', 'dist', 'markdown-deck.min.js'
  )
  const deckJs = fs.readFileSync(deckJsFile)
  return (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/javascript')
    res.end(deckJs)
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

function serveUserAssets (cwd: string, markdownFile: string, include?: string) {
  const handler = serveDir(cwd)
  const globs = [markdownFile].concat(include ? include.split(',') : [])

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
      res.end(`Saved to "${filePath}"`)
      // verboseLog(
      //   `Saved to ${underline(posix.basename(filePath))} (${markdown.length})`,
      //   dim(new Date().toLocaleTimeString())
      // )
    } catch (e) {
      res.statusCode = 500
      res.end(e.message)
      console.error(e.message)
    }
  }
}

function createIndex (filename: string, title?: string): string {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="ie=edge">
      <title>${title || filename}</title>
      <script type="module" src="markdown-deck.min.js"></script>
      <style>
        html, body { height: 100%; margin: 0 }
      </style>
    </head>
    <body>
      <markdown-deck src="${filename}" hotkey hashsync></markdown-deck>
      <script type="module" src="index.js"></script>
    </body>
  </html>`
}
