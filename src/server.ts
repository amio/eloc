import { randomBytes, timingSafeEqual } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { resolve } from 'node:path'
import sirv from 'sirv'

import { createEmbedHTML, createIndexHTML, type IndexHTMLOptions, type PresentationAssets } from './assets.ts'
import { assertPathInsideRoot, resolveDeckAssets, type DeckAssetOptions, type ResolvedDeckAssets } from './deck-assets.ts'

type Request = IncomingMessage
type Response = ServerResponse
type RequestHandler = (req: Request, res: Response) => void | Promise<void>

export interface ServerOptions extends DeckAssetOptions {
  title?: string
  dark?: boolean
  'progress-bar'?: boolean
}

interface ServerContext {
  cwd?: string
  onSave?: (bytes: number) => void
  onError?: (error: Error) => void
}

const SAVE_TOKEN_HEADER = 'x-eloc-save-token'

// Each server owns one source file and save token; callers own listening and shutdown.
export function createPresentationServer(markdownFile: string, options: ServerOptions, assets: PresentationAssets, context: ServerContext = {}) {
  const deckAssets = resolveDeckAssets(markdownFile, options, context.cwd)
  const saveToken = createSaveToken()
  const { onSave = () => {}, onError = () => {} } = context
  const handler = createRequestHandler({
    deckAssets,
    indexOptions: {
      filename: deckAssets.filename,
      source: deckAssets.source,
      title: options.title,
      css: deckAssets.css,
      dark: options.dark,
      progressBar: options['progress-bar'],
      saveToken
    },
    saveToken,
    onSave,
    onError,
    assets
  })

  return createServer((req, res) => {
    Promise.resolve()
      .then(() => handler(req, res))
      .catch(error => {
        onError(error)
        sendPlainText(res, 500, error.message)
      })
  })
}

function createRequestHandler ({
  deckAssets,
  indexOptions,
  saveToken,
  onSave,
  onError,
  assets
}: {
  deckAssets: ResolvedDeckAssets;
  indexOptions: IndexHTMLOptions;
  saveToken: string;
  onSave: (bytes: number) => void;
  onError: (error: Error) => void;
  assets: PresentationAssets;
}): RequestHandler {
  const saveMarkdown = handleSave(deckAssets.markdownPath, deckAssets.rootDir, onSave, onError, saveToken)
  const serveStatic = serveDir(deckAssets.rootDir)
  const requiredFiles = new Set(deckAssets.requiredFiles.map(file => `/${file}`))

  return async (req, res) => {
    let pathname: string
    try {
      pathname = getPathname(req)
    } catch {
      return sendPlainText(res, 400, 'Invalid request path')
    }

    if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/') {
      return sendHTML(createIndexHTML(indexOptions, assets), req, res)
    }

    if (req.method === 'POST' && pathname === '/api/save') {
      return saveMarkdown(req, res)
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      // Explicit inputs are literal files, including names with URL delimiters.
      // Only a confirmed missing source grants permission to create a new deck.
      if (requiredFiles.has(pathname)) {
        const isDocument = pathname === `/${deckAssets.filename}`
        try {
          const content = await readFile(resolve(deckAssets.rootDir, pathname.slice(1)))
          res.setHeader('Content-Type', isDocument ? 'text/plain; charset=utf-8' : 'text/css; charset=utf-8')
          res.setHeader('Cache-Control', 'no-cache')
          res.setHeader('Content-Length', content.byteLength)
          res.end(req.method === 'HEAD' ? undefined : content)
        } catch (error: any) {
          if (error.code !== 'ENOENT') throw error
          if (isDocument) res.setHeader('X-Eloc-New-Document', 'true')
          sendPlainText(res, 404, 'Not Found')
        }
        return
      }
      if (pathname === '/embed.html') return sendHTML(createEmbedHTML(assets), req, res)
      if (pathname.split(/[\\/]/).some(part => part.startsWith('.'))) {
        return sendPlainText(res, 404, 'Not Found')
      }
      return serveStatic(req, res)
    }

    sendPlainText(res, 404, 'Not Found')
  }
}

function getPathname (req: Request): string {
  return decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname)
}

function sendHTML (html: string, req: Request, res: Response) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.setHeader('Content-Length', Buffer.byteLength(html))
  res.end(req.method === 'HEAD' ? undefined : html)
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

function handleSave (filePath: string, rootDir: string, onSave: (bytes: number) => void, onError: (error: Error) => void, saveToken: string): RequestHandler {
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
      res.end(`Saved to "${filePath}" (${Buffer.byteLength(markdown)} Bytes)`)

      onSave(Buffer.byteLength(markdown))
    } catch (e: any) {
      res.statusCode = 500
      res.end(e.message)
      onError(e)
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

export async function readJsonBody (req: AsyncIterable<Buffer | string>, maxBytes = 10 * 1024 * 1024): Promise<unknown> {
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

