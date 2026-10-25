import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import type { TestContext } from 'node:test'

export const assets = { clientSource: 'window.booted=true', appCSS: 'body { margin: 0 }' }

export function readConfig(html: string) {
  return JSON.parse(html.match(/<script id="eloc-config" type="application\/json">(.*?)<\/script>/s)![1])
}

export async function workspace(t: TestContext) {
  const root = await mkdtemp(join(tmpdir(), 'eloc-core-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  return {
    root,
    async write(file: string, content: string) {
      const path = join(root, file)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, content)
      return path
    }
  }
}
