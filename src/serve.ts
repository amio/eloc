import { randomBytes, timingSafeEqual } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { createServer as createHttpServer, IncomingMessage, ServerResponse } from 'node:http'
import { createServer as createNetServer } from 'node:net'
import { resolve } from 'node:path'
import open from 'open'
import sirv from 'sirv'
import kleur from 'kleur'

const { bold, cyan, underline, dim } = kleur

import { createIndexHTML, IndexHTMLOptions } from './assets'
import { assertPathInsideRoot, resolveDeckAssets, ResolvedDeckAssets } from './deck-assets'

type Request = IncomingMessage
type Response = ServerResponse
type RequestHandler = (req: Request, res: Response) => void | Promise<void>
type VerboseLog = (...msg: Array<any>) => void

interface ServeOptions {
  port?: number | string;
  open?: boolean;
  quiet?: boolean;
  title?: string;
  css?: string | string[];
  dark?: boolean;
  'progress-bar'?: boolean;
}

const SAVE_TOKEN_HEADER = 'x-eloc-save-token'
const MIN_PORT = 1
const MAX_PORT = 65535
const { PORT = '5000' } = process.env

export default async function elocServe (markdownFile: string, options: ServeOptions) {
  const { title, dark, 'progress-bar': progressBar } = options

  const verboseLog: VerboseLog = (...msg) => {
    if (!options.quiet) {
      console.info(' ', ...msg)
    }
  }

  try {
    const deckAssets = resolveDeckAssets(markdownFile, options)
    assertPathInsideRoot(deckAssets.markdownPath, deckAssets.rootDir)

    const saveToken = createSaveToken()
    const handler = createRequestHandler({
      deckAssets,
      markdownFile,
      indexOptions: {
        filename: deckAssets.filename,
        title,
        css: deckAssets.css,
        dark,
        progressBar,
        saveToken
      },
      saveToken,
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

    const initialPort = resolveInitialPort(options.port, PORT)
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
  deckAssets,
  markdownFile,
  indexOptions,
  saveToken,
  verboseLog
}: {
  deckAssets: ResolvedDeckAssets;
  markdownFile: string;
  indexOptions: IndexHTMLOptions;
  saveToken: string;
  verboseLog: VerboseLog;
}): RequestHandler {
  const sendIndexPage = sendIndex(indexOptions)
  const saveMarkdown = handleSave(deckAssets.markdownPath, deckAssets.rootDir, markdownFile, verboseLog, saveToken)
  const serveStatic = serveDir(deckAssets.rootDir)

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

function handleSave (filePath: string, rootDir: string, fileLabel: string, verboseLog: VerboseLog, saveToken: string): RequestHandler {
  assertPathInsideRoot(filePath, rootDir)

  return async (req, res) => {
    if (!hasValidSaveToken(req, saveToken)) {
      sendPlainText(res, 403, 'Forbidden')
      return
    }

    try {
      assertPathInsideRoot(filePath, rootDir)
      const { markdown } = await readJsonBody(req) as { markdown?: unknown }

      if (typeof markdown !== 'string') {
        throw new Error('Invalid request body: expected markdown string')
      }

      await writeFile(filePath, markdown)
      res.end(`Saved to "${filePath}" (${markdown.length} Bytes)`)

      verboseLog(
        `Saved to ${underline(fileLabel)} (${markdown.length} Bytes)`,
        dim(new Date().toLocaleTimeString())
      )
    } catch (e: any) {
      res.statusCode = 500
      res.end(e.message)
      console.error(e.message)
    }
  }
}

function createSaveToken (): string {
  return randomBytes(32).toString('base64url')
}

function hasValidSaveToken (req: Request, expectedToken: string): boolean {
  const actualToken = req.headers[SAVE_TOKEN_HEADER]

  if (typeof actualToken !== 'string') {
    return false
  }

  const actual = Buffer.from(actualToken)
  const expected = Buffer.from(expectedToken)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
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

function resolveInitialPort (optionPort: unknown, envPort: string): number {
  if (optionPort !== undefined) {
    return parsePort(optionPort, '--port')
  }

  return parsePort(envPort, 'PORT')
}

function parsePort (value: unknown, source: string): number {
  const port = typeof value === 'number' ? value : Number(String(value).trim())

  if (typeof value === 'boolean' || !Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
    throw new Error(`Invalid ${source}: expected an integer between ${MIN_PORT} and ${MAX_PORT}, got "${String(value)}"`)
  }

  return port
}

async function findAvailablePort(startPort: number, maxAttempts = 100): Promise<number> {
  const endPort = Math.min(MAX_PORT, startPort + maxAttempts - 1)

  for (let port = startPort; port <= endPort; port++) {
    if (await checkPort(port)) {
      return port
    }
  }
  throw new Error(`No available ports found from ${startPort} to ${endPort}`)
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
