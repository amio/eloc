import { writeFile } from 'node:fs/promises'
import { createServer as createHttpServer, IncomingMessage, ServerResponse } from 'node:http'
import { createServer as createNetServer } from 'node:net'
import { resolve } from 'node:path'
import open from 'open'
import sirv from 'sirv'
import kleur from 'kleur'

const { bold, cyan, underline, dim } = kleur

import { createIndexHTML, IndexHTMLOptions } from './assets'

type Request = IncomingMessage
type Response = ServerResponse
type RequestHandler = (req: Request, res: Response) => void | Promise<void>
type VerboseLog = (...msg: Array<any>) => void

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

  const verboseLog: VerboseLog = (...msg) => {
    if (!options.quiet) {
      console.info(' ', ...msg)
    }
  }

  const handler = createRequestHandler({
    markdownFile,
    indexOptions: { filename: markdownFile, title, css, dark, progressBar },
    verboseLog
  })

  const server = createHttpServer((req, res) => {
    Promise.resolve()
      .then(() => handler(req, res))
      .catch(error => {
        console.error(error.message)
        sendPlainText(res, 500, error.message)
      })
  })
  const initialPort = options.port || parseInt(PORT, 10)

  try {
    const port = await findAvailablePort(initialPort)
    const url = `http://localhost:${port}`

    server.listen(port, () => {
      console.info(`\n  Presenting at ${bold(url)}\n`)

      verboseLog(`SHORTCUTS`)
      verboseLog(dim(' *'), `[${cyan('ESC')}] to toggle editor`)
      verboseLog(dim(' *'), `[${cyan('CMD+S')}/${cyan('CTRL+S')}] to save to ${underline(markdownFile)}\n`)

      if (options.open) {
        void open(url)
      }
    })
  } catch (error: any) {
    console.error(error.message)
    process.exit(1)
  }
}

function createRequestHandler ({
  markdownFile,
  indexOptions,
  verboseLog
}: {
  markdownFile: string;
  indexOptions: IndexHTMLOptions;
  verboseLog: VerboseLog;
}): RequestHandler {
  const sendIndexPage = sendIndex(indexOptions)
  const saveMarkdown = handleSave(markdownFile, verboseLog)
  const serveStatic = serveDir(process.cwd())

  return async (req, res) => {
    const pathname = getPathname(req)

    if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/') {
      return sendIndexPage(req, res)
    }

    if (req.method === 'POST' && pathname === '/api/save') {
      return saveMarkdown(req, res)
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      return serveStatic(req, res)
    }

    sendPlainText(res, 404, 'Not Found')
  }
}

function getPathname (req: Request): string {
  return new URL(req.url || '/', 'http://localhost').pathname
}

function sendIndex (opts: IndexHTMLOptions): RequestHandler {
  return (req, res) => {
    const indexHTML = createIndexHTML({ ...opts, edit: true })
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.setHeader('Content-Length', Buffer.byteLength(indexHTML))

    if (req.method === 'HEAD') {
      res.end()
    } else {
      res.end(indexHTML)
    }
  }
}

function serveDir (dir: string): RequestHandler {
  const serveStatic = sirv(resolve(dir), {
    dev: true,
    etag: true,
    dotfiles: false,
    setHeaders: res => {
      res.setHeader('Cache-Control', 'no-cache')
    }
  })

  return (req, res) => serveStatic(req, res, () => {
    sendPlainText(res, 404, 'Not Found')
  })
}

function handleSave (file: string, verboseLog: VerboseLog): RequestHandler {
  const filePath = resolve(process.cwd(), file)

  return async (req, res) => {
    try {
      const { markdown } = await readJsonBody(req) as { markdown?: unknown }

      if (typeof markdown !== 'string') {
        throw new Error('Invalid request body: expected markdown string')
      }

      await writeFile(filePath, markdown)
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

async function readJsonBody (req: Request, maxBytes = 10 * 1024 * 1024): Promise<unknown> {
  const chunks: Buffer[] = []
  let size = 0

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buffer.byteLength

    if (size > maxBytes) {
      throw new Error('Request body too large')
    }

    chunks.push(buffer)
  }

  const body = Buffer.concat(chunks).toString('utf8')
  return JSON.parse(body)
}

function sendPlainText (res: Response, statusCode: number, message: string) {
  if (res.headersSent) {
    res.end()
    return
  }

  res.statusCode = statusCode
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.end(message)
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
  return new Promise(fulfill => {
    const tester = createNetServer()

    const unavailable = () => {
      fulfill(false)
    }
    const available = () => {
      tester.close(() => {
        fulfill(true)
      })
    }

    tester.once('error', unavailable)
    tester.once('listening', available)
    tester.listen(port)
  })
}
