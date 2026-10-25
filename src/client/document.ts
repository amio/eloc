import { createSignal } from 'solid-js'
import type { DeckConfig } from './config'

// A document's source, download name, and disk-write capability share one identity.
// Failed reads remain editable, but can only be recovered through a download.
export function createDocument(config: DeckConfig) {
  const configuredSource = new URL(config.source, location.href)
  const reference = new URL(location.href).searchParams.get('src') || config.source
  let source: URL | undefined
  try {
    source = new URL(reference, location.href)
    source.hash = ''
  } catch { /* Invalid source URLs are reported by load, alongside other read failures. */ }
  configuredSource.hash = ''
  const isConfiguredDocument = source?.href === configuredSource.href
  let filename = config.filename
  if (!isConfiguredDocument && source) {
    filename = source.pathname.split('/').pop() || config.filename
    try { filename = decodeURIComponent(filename) } catch { /* A literal percent is a valid filename character. */ }
  }
  const saveToken = isConfiguredDocument ? config.saveToken : undefined
  const [markdown, setMarkdown] = createSignal('')
  const [state, setState] = createSignal<'loading' | 'ready' | 'missing' | 'failed'>('loading')
  const [saving, setSaving] = createSignal(false)
  const canWrite = () => Boolean(saveToken) && (state() === 'ready' || state() === 'missing')

  async function load(signal: AbortSignal) {
    try {
      if (!source) throw new Error(`Unable to load ${reference}`)
      const response = await fetch(source, { signal })
      if (signal.aborted) return
      if (response.status === 404 && saveToken && response.headers.get('X-Eloc-New-Document') === 'true') {
        setState('missing')
        return
      }
      if (!response.ok) throw new Error(`Unable to load ${source.pathname} (${response.status})`)
      const text = await response.text()
      if (!signal.aborted) {
        setMarkdown(text)
        setState('ready')
      }
    } catch (error) {
      if (signal.aborted) return
      setState('failed')
      throw error
    }
  }

  async function save(): Promise<string | undefined> {
    if (state() === 'loading' || saving()) return
    if (!canWrite()) {
      const url = URL.createObjectURL(new Blob([markdown()], { type: 'text/markdown;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      return `Downloaded ${filename}`
    }
    setSaving(true)
    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Eloc-Save-Token': saveToken! },
        body: JSON.stringify({ markdown: markdown() })
      })
      const message = await response.text()
      if (!response.ok) throw new Error(message)
      return message
    } finally {
      setSaving(false)
    }
  }

  return { markdown, setMarkdown, loaded: () => state() !== 'loading', saving, canWrite, load, save }
}
