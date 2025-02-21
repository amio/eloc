import fs from 'fs'
import http from 'http'
import { resolve } from 'path'
import { router, get, post } from 'micro-fork'
import { json } from 'micri'
import open from 'open'
import serveHandler from 'serve-handler'
import kleur from 'kleur'
import net from 'net'

const { bold, cyan, underline, dim } = kleur

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


export default async function elocServe (markdownFile: string, options: ServeOptions) {
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
  const initialPort = options.port || parseInt(PORT, 10)

  try {
    const port = await findAvailablePort(initialPort)
    const url = `http://localhost:${port}`

    server.listen(port, () => {
      console.info(`\n  Presenting at ${bold(url)}\n`)

      verboseLog(`SHORTCUTS`)
      verboseLog(dim(' *'), `[${cyan('ESC')}] to toggle editor`)
      verboseLog(dim(' *'), `[${cyan('CMD+S')}/${cyan('CTRL+S')}] to save to ${underline(markdownFile)}\n`)

      options.open && open(url)
    })
  } catch (error: any) {
    console.error(error.message)
    process.exit(1)
  }
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
      { source: '**/*', headers : [{ key: 'Cache-Control', value: 'no-cache' }] }
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
    } catch (e: any) {
      res.statusCode = 500
      res.end(e.message)
      console.error(e.message)
    }
  }
}

async function findAvailablePort(startPort: number, maxAttempts = 100): Promise<number> {
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    if (await checkPort(port)) {
      return port
    }
  }
  throw new Error('No available ports found')
}

function checkPort(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => tester.close(() => resolve(true)))
      .listen(port)
  })
}