import { createSignal } from 'solid-js'

// Loading and editing belong to the document; persistence belongs to its host.
export function createDocument(reference: string, options: { allowMissing?: boolean } = {}) {
  const source = resolveSource(reference)
  const [markdown, setMarkdown] = createSignal('')
  const [state, setState] = createSignal<'loading' | 'ready' | 'missing' | 'failed'>('loading')
  const [baseURL, setBaseURL] = createSignal(source)
  const [error, setError] = createSignal<string>()

  async function load(signal: AbortSignal) {
    try {
      if (!source) throw new Error(`Unable to load ${reference}`)
      const response = await fetch(source, { signal })
      if (signal.aborted) return
      if (response.status === 404 && options.allowMissing && response.headers.get('X-Eloc-New-Document') === 'true') {
        setState('missing')
        return
      }
      if (!response.ok) throw new Error(`Unable to load ${new URL(source).pathname} (${response.status})`)
      const text = await response.text()
      if (!signal.aborted) {
        setBaseURL(response.url || source)
        setMarkdown(text)
        setState('ready')
      }
    } catch (cause) {
      if (signal.aborted) return
      setError(cause instanceof Error ? cause.message : `Unable to load ${reference}`)
      setState('failed')
    }
  }

  return { source: source ?? reference, markdown, setMarkdown, state, baseURL, error, loaded: () => state() !== 'loading', load }
}

export type DeckDocument = ReturnType<typeof createDocument>

export function resolveSource(reference: string, base = location.href): string | undefined {
  try {
    if (!reference) return undefined
    const source = new URL(reference, base)
    source.hash = ''
    return source.href
  } catch {
    return undefined
  }
}
