import type { Server } from 'node:http'
import open from 'open'
import kleur from 'kleur'
import type { PresentationAssets } from './assets.ts'
import { createPresentationServer, type ServerOptions } from './server.ts'

const { bold, cyan, underline, dim } = kleur
export const HOST = '127.0.0.1'
const MIN_PORT = 1
const MAX_PORT = 65535

export interface ServeOptions extends ServerOptions {
  port?: number | string
  open?: boolean
  quiet?: boolean
}

export default async function serve(markdownFile: string, options: ServeOptions, assets: PresentationAssets, openBrowser: (url: string) => Promise<unknown> = open) {
  const initialPort = resolveInitialPort(options.port, process.env.PORT)
  const verboseLog = (...msg: unknown[]) => {
    if (!options.quiet) console.info(' ', ...msg)
  }
  const server = createPresentationServer(markdownFile, options, assets, {
    onSave: bytes => verboseLog(`Saved to ${underline(markdownFile)} (${bytes} Bytes)`, dim(new Date().toLocaleTimeString())),
    onError: error => console.error(error.message)
  })
  const port = await listenOnAvailablePort(server, initialPort)
  const url = `http://${HOST}:${port}`
  console.info(`\n  Presenting at ${bold(url)}\n`)
  verboseLog('SHORTCUTS')
  verboseLog(dim(' *'), `[${cyan('ESC')}] to toggle editor`)
  verboseLog(dim(' *'), `[${cyan('CMD+S')}/${cyan('CTRL+S')}] to save to ${underline(markdownFile)}\n`)
  if (options.open) {
    try {
      await openBrowser(url)
    } catch (error) {
      await new Promise<void>(fulfill => server.close(() => fulfill()))
      throw error
    }
  }
  return server
}

export function resolveInitialPort(optionPort: unknown, envPort = '5000'): number {
  const value = optionPort === undefined ? envPort : optionPort
  const source = optionPort === undefined ? 'PORT' : '--port'
  const port = typeof value === 'number' ? value : Number(String(value).trim())
  if (typeof value === 'boolean' || !Number.isInteger(port) || port < MIN_PORT || port > MAX_PORT) {
    throw new Error(`Invalid ${source}: expected an integer between ${MIN_PORT} and ${MAX_PORT}, got "${String(value)}"`)
  }
  return port
}

// Bind the real server while searching so another process cannot claim a probed port.
export async function listenOnAvailablePort(server: Server, startPort: number, maxAttempts = 100): Promise<number> {
  const endPort = Math.min(MAX_PORT, startPort + maxAttempts - 1)
  for (let port = startPort; port <= endPort; port++) {
    try {
      await new Promise<void>((fulfill, reject) => {
        const onError = (error: Error) => {
          server.off('listening', onListening)
          reject(error)
        }
        const onListening = () => {
          server.off('error', onError)
          fulfill()
        }
        server.once('error', onError)
        server.once('listening', onListening)
        server.listen(port, HOST)
      })
      return port
    } catch (error: any) {
      if (error.code !== 'EADDRINUSE') throw error
    }
  }
  throw new Error(`No available ports found from ${startPort} to ${endPort}`)
}
