import type { DeckConfig } from './config'
import { resolveSource, type DeckDocument } from './document'
import type { SaveRequest } from './deck'

// A configured document, its read outcome, and its token jointly authorize writes.
// Alternate sources and failed reads retain standalone recovery downloads.
export function createStandalonePersistence(config: DeckConfig, deckDocument: DeckDocument) {
  const configuredSource = resolveSource(config.source)
  const isConfiguredDocument = deckDocument.source === configuredSource
  let filename = config.filename
  if (!isConfiguredDocument && resolveSource(deckDocument.source)) {
    filename = new URL(deckDocument.source).pathname.split('/').pop() || filename
    try { filename = decodeURIComponent(filename) } catch { /* Literal percent signs are valid filename characters. */ }
  }
  const canWrite = () => Boolean(config.saveToken) && isConfiguredDocument
    && (deckDocument.state() === 'ready' || deckDocument.state() === 'missing')

  async function save(request: SaveRequest): Promise<string> {
    if (request.source !== deckDocument.source) throw new Error('Save request does not match the displayed document')
    if (!canWrite()) {
      const url = URL.createObjectURL(new Blob([request.markdown], { type: 'text/markdown;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      return `Downloaded ${filename}`
    }
    const response = await fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Eloc-Save-Token': config.saveToken! },
      body: JSON.stringify({ markdown: request.markdown })
    })
    const message = await response.text()
    if (!response.ok) throw new Error(message)
    return message
  }

  return { canWrite, save }
}
