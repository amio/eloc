import { createSignal, Show } from 'solid-js'
import { Deck, type SaveRequest } from './deck'
import { createDocument, type DeckDocument } from './document'

const prefix = 'eloc:local:'

function localDocument(markdown: string): DeckDocument {
  const [content, setContent] = createSignal(markdown)
  const [state] = createSignal<'loading' | 'ready' | 'missing' | 'failed'>('ready')
  const [baseURL] = createSignal<string | undefined>(location.href)
  const [error] = createSignal<string>()
  return { source: '', markdown: content, setMarkdown: setContent, state, baseURL, error, loaded: () => true, load: async () => {} }
}

export function Site() {
  const path = location.pathname
  if (path === '/' || path === '/index.html') {
    const demo = createDocument('/deck.md')
    return <div class="home">
      <header class="home-header"><a class="home-brand" href="/">eloc</a><a class="home-new" href="/new">New presentation <span aria-hidden="true">↗</span></a></header>
      <section class="home-intro"><p class="home-eyebrow">A LITTLE MORE ELOQUENCE</p><h1>Ideas deserve<br /><em>a stage.</em></h1><p>Write in Markdown. Present with clarity.</p><a class="home-cta" href="/new">Create a presentation <span aria-hidden="true">↗</span></a><p class="home-note">Saved in this browser, just for you.</p></section>
      <section class="home-demo" aria-label="Demo presentation"><div class="demo-label"><span>THE LIVE DEMO</span><span>Take a look around ↘</span></div><div class="demo-frame"><Deck document={demo} embedded trusted progressBar /></div><p class="demo-hint">Use the controls below the slide to explore the demo.</p></section>
    </div>
  }

  const match = path.match(/^\/local\/([0-9a-f-]{36})\/?$/i)
  if (path !== '/new' && path !== '/new/' && !match) return <Missing text="This page does not exist." />
  let id = match?.[1]
  let initial = ''
  if (id) {
    try {
      const saved = localStorage.getItem(prefix + id)
      if (saved === null) return <Missing text="This presentation is not saved in this browser." />
      initial = saved
    } catch {
      return <Missing text="Unable to access presentations in this browser." />
    }
  }
  const deckDocument = localDocument(initial)
  const [message, setMessage] = createSignal('')
  let timer: ReturnType<typeof setTimeout> | undefined
  async function save(request: SaveRequest) {
    const nextId = id ?? crypto.randomUUID()
    localStorage.setItem(prefix + nextId, request.markdown)
    if (!id) {
      id = nextId
      const url = new URL(location.href)
      url.pathname = `/local/${id}/`
      history.replaceState(null, '', url)
    }
    setMessage('Saved in this browser')
    clearTimeout(timer)
    timer = setTimeout(() => setMessage(''), 4000)
  }
  return <><Deck document={deckDocument} view={id ? 'present' : 'edit'} syncLocation onSave={save} />
    <Show when={message()}><div class="toast success" role="status">{message()}</div></Show></>
}

function Missing(props: { text: string }) {
  return <main class="missing"><a class="home-brand" href="/">eloc</a><h1>Nothing here yet.</h1><p>{props.text}</p><p>Local presentations are only available in the browser where they were saved.</p><a class="home-cta" href="/new">Create a presentation ↗</a><p><a href="/">Back to home</a></p></main>
}
