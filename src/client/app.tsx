import { createEffect, createSignal, onCleanup, Show } from 'solid-js'
import type { DeckConfig } from './config'
import { Deck, type SaveRequest } from './deck'
import { createDocument, resolveSource } from './document'
import { createStandalonePersistence } from './persistence'

export function App(props: { config: DeckConfig }) {
  const config = props.config
  const params = new URL(location.href).searchParams
  if (config.mode === 'embed') {
    const deckDocument = createDocument(params.get('src') || '')
    const base = document.createElement('base')
    document.head.prepend(base)
    // Only this dedicated document changes its base; assets and author CSS then
    // resolve beside the Markdown, including redirects and raw HTML resources.
    createEffect(() => {
      const url = deckDocument.baseURL()
      if (url && /^https?:/.test(url)) base.href = url
    })
    onCleanup(() => base.remove())
    return <Deck document={deckDocument} embedded syncLocation
      view={params.get('view') === 'present' ? 'present' : 'edit'} dark={params.get('theme') === 'dark'} />
  }

  const reference = params.get('src') || config.source
  const deckDocument = createDocument(reference, {
    allowMissing: Boolean(config.saveToken) && resolveSource(reference) === resolveSource(config.source)
  })
  const persistence = createStandalonePersistence(config, deckDocument)
  const [message, setMessage] = createSignal<string>()
  let timer: ReturnType<typeof setTimeout> | undefined
  onCleanup(() => clearTimeout(timer))

  async function save(request: SaveRequest) {
    const message = await persistence.save(request)
    setMessage(message)
    clearTimeout(timer)
    timer = setTimeout(() => setMessage(undefined), 4000)
  }

  return <>
    <Deck document={deckDocument} trusted syncLocation dark={config.dark} css={config.css}
      progressBar={config.progressBar} onSave={save} saveLabel={persistence.canWrite() ? 'Save' : 'Download'}
      recoveryHint="Press Esc to write and download a recovery copy." />
    <Show when={message()}>{text => <div class="toast success" role="status">{text()}</div>}</Show>
  </>
}
