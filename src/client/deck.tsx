import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js'
import type { DeckDocument } from './document'
import { pageAtOffset, parsePages } from './pages'
import { Slide } from './slide'

export interface SaveRequest {
  markdown: string
  source: string
}

interface DeckProps {
  document: DeckDocument
  view?: 'present' | 'edit'
  dark?: boolean
  css?: string
  progressBar?: boolean
  embedded?: boolean
  trusted?: boolean
  syncLocation?: boolean
  saveLabel?: string
  recoveryHint?: string
  onSave?: (request: SaveRequest) => Promise<void>
}

// Deck owns interaction and rendering. A host may handle save requests, but the
// component never chooses a persistence destination or supplies a fallback.
export function Deck(props: DeckProps) {
  const deckDocument = props.document
  const { markdown, setMarkdown, loaded } = deckDocument
  const [saving, setSaving] = createSignal(false)
  const [requestedIndex, setRequestedIndex] = createSignal(props.syncLocation ? readHash() : 0)
  const [view, setView] = createSignal<'present' | 'edit' | 'print'>(props.view ?? 'present')
  const [nativePrint, setNativePrint] = createSignal(false)
  const [dark, setDark] = createSignal(Boolean(props.dark))
  const [notice, setNotice] = createSignal<{ text: string; type: string }>()
  const pages = createMemo(() => parsePages(markdown()))
  const index = createMemo(() => Math.max(0, Math.min(requestedIndex(), pages().length - 1)))
  const printing = () => view() === 'print' || nativePrint()
  let toastTimer: ReturnType<typeof setTimeout> | undefined
  let root!: HTMLElement
  let focusRequested = false

  function toast(text: string, type = 'info') {
    clearTimeout(toastTimer)
    setNotice({ text, type })
    toastTimer = setTimeout(() => setNotice(undefined), 4000)
  }

  function navigate(to: number) {
    setRequestedIndex(Math.max(0, Math.min(to, pages().length - 1)))
  }

  function toggleEditor() {
    focusRequested = true
    setView(view() === 'edit' ? 'present' : 'edit')
  }

  function updateFromEditor(editor: HTMLTextAreaElement) {
    setMarkdown(editor.value)
    navigate(pageAtOffset(pages(), editor.selectionStart))
  }

  function focusEditor(editor: HTMLTextAreaElement) {
    queueMicrotask(() => {
      if (!focusRequested || !editor.isConnected) return
      const page = pages()[index()]
      editor.focus()
      editor.setSelectionRange(page.start, page.end)
      const line = markdown().slice(0, page.start).split('\n').length - 1
      editor.scrollTop = line * 23 - editor.clientHeight / 3
    })
  }

  async function save() {
    if (!props.onSave || !loaded() || saving()) return
    const request: SaveRequest = { markdown: markdown(), source: deckDocument.source }
    setNotice(undefined)
    setSaving(true)
    try {
      await props.onSave(request)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Unable to save Markdown', 'error')
    } finally {
      setSaving(false)
    }
  }

  function keydown(event: KeyboardEvent) {
    if (event.defaultPrevented) return
    if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') {
      if (props.onSave || event.composedPath().includes(root)) event.preventDefault()
      void save()
      return
    }
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return
    if (event.code === 'Escape') {
      event.preventDefault()
      toggleEditor()
      return
    }
    if (event.composedPath().some(target => target instanceof Element && target.matches('textarea, input, select, button, a, [contenteditable]'))) return
    switch (event.code) {
      case 'Space': case 'ArrowRight': case 'KeyL': navigate(index() + (event.shiftKey ? -1 : 1)); break
      case 'ArrowLeft': case 'KeyJ': navigate(index() + (event.shiftKey ? 1 : -1)); break
      case 'ArrowUp': case 'Home': navigate(0); break
      case 'ArrowDown': case 'End': navigate(pages().length - 1); break
      case 'KeyD': case 'KeyI': setDark(!dark()); break
      case 'KeyP': setView(view() === 'print' ? 'present' : 'print'); break
      default: return
    }
    event.preventDefault()
  }

  let touch: { x: number; y: number } | undefined
  function touchStart(event: TouchEvent) {
    const point = event.changedTouches[0]
    touch = event.touches.length === 1 ? { x: point.clientX, y: point.clientY } : undefined
  }
  function touchEnd(event: TouchEvent) {
    if (!touch || printing()) return
    const point = event.changedTouches[0]
    const dx = point.clientX - touch.x
    const dy = point.clientY - touch.y
    touch = undefined
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) navigate(index() + (dx > 0 ? -1 : 1))
  }

  function syncHash() {
    if (!props.syncLocation || !loaded()) return
    // Navigation belongs to the player URL, never the remote Markdown <base>.
    const url = new URL(location.href)
    url.hash = String(index())
    history.replaceState(null, '', url)
  }
  createEffect(syncHash)
  createEffect(() => {
    const error = deckDocument.error()
    if (error) toast(`${error}. ${props.recoveryHint ?? 'Edit the Markdown to preview a temporary draft.'}`, 'error')
  })

  onMount(() => {
    const controller = new AbortController()
    void deckDocument.load(controller.signal)
    const hashChange = () => {
      setRequestedIndex(readHash())
      // An invalid or out-of-range hash can resolve to the already active slide.
      syncHash()
    }
    const media = matchMedia('print')
    const printChange = () => setNativePrint(media.matches)
    printChange()
    const keyboardTarget = props.syncLocation ? window : root
    keyboardTarget.addEventListener('keydown', keydown as EventListener)
    if (props.syncLocation) window.addEventListener('hashchange', hashChange)
    media.addEventListener('change', printChange)
    onCleanup(() => {
      controller.abort()
      clearTimeout(toastTimer)
      keyboardTarget.removeEventListener('keydown', keydown as EventListener)
      if (props.syncLocation) window.removeEventListener('hashchange', hashChange)
      media.removeEventListener('change', printChange)
    })
  })

  function click(event: MouseEvent) {
    if (!props.embedded || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
    const anchor = event.composedPath().find(target => target instanceof HTMLAnchorElement) as HTMLAnchorElement | undefined
    const href = anchor?.getAttribute('href')
    if (!anchor || !href?.startsWith('#')) return
    // A source-relative <base> must not turn local fragments into Markdown fetches.
    event.preventDefault()
    const fragment = href.slice(1)
    if (/^\d+$/.test(fragment)) navigate(Number(fragment))
    else {
      let id = fragment
      try { id = decodeURIComponent(fragment) } catch { /* Preserve literal percent signs in author IDs. */ }
      const shadow = anchor.getRootNode()
      if (shadow instanceof ShadowRoot) shadow.getElementById(id)?.scrollIntoView({ block: 'nearest' })
    }
  }

  return <main id="deck" ref={root} onClick={click} classList={{ dark: dark(), embedded: props.embedded, editing: view() === 'edit', printing: printing() }}>
    <Show when={loaded()} fallback={<p class="loading" role="status">Loading presentation…</p>}>
      <div class="workspace">
        <Show when={view() === 'edit' && !nativePrint()}>
          <aside class="editor-column" aria-label="Markdown editor">
            <textarea class="editor" aria-label="Markdown" spellcheck={false}
              value={markdown()} ref={focusEditor} onInput={event => updateFromEditor(event.currentTarget)}
              onClick={event => updateFromEditor(event.currentTarget)}
              onKeyUp={event => { if (event.code !== 'Escape') updateFromEditor(event.currentTarget) }} />
          </aside>
        </Show>
        <div class="slide-column" onTouchStart={touchStart} onTouchEnd={touchEnd} onTouchCancel={() => { touch = undefined }}>
          <Show when={printing()} fallback={
            <Slide markdown={markdown() === '' ? view() === 'edit' ? 'Start writing Markdown to preview slides' : 'Press <kbd>Esc</kbd> to start writing' : pages()[index()].markdown}
              css={props.css} trusted={props.trusted} onCssError={() => toast(`Unable to load ${props.css}`, 'error')} dark={dark()} index={index()} />
          }>
            <div class="print-wrap"><For each={pages()}>{(page, position) =>
              <Slide markdown={page.markdown} css={props.css} trusted={props.trusted} onCssError={() => toast(`Unable to load ${props.css}`, 'error')} dark={dark()} index={position()} />
            }</For></div>
          </Show>
          <Show when={props.progressBar && !printing()}>
            <div class="progress-bar" role="progressbar" aria-label="Presentation progress"
              aria-valuemin={1} aria-valuemax={pages().length} aria-valuenow={index() + 1}>
              <div class="progress" style={{ width: `${pages().length > 1 ? index() / (pages().length - 1) * 100 : 100}%` }} />
            </div>
          </Show>
        </div>
      </div>
      <div class="toolbar-reveal" tabIndex={0} aria-label="Show presentation controls"
        onPointerDown={event => {
          if (event.pointerType === 'touch' && event.target === event.currentTarget) event.currentTarget.focus()
        }}>
        <nav class="toolbar" aria-label="Presentation controls">
          <button aria-label="Previous slide" title="Previous slide (←)" disabled={index() === 0} onClick={() => navigate(index() - 1)}>←</button>
          <span class="counter" role="status" aria-label="Slide count">{index() + 1} / {pages().length}</span>
          <button aria-label="Next slide" title="Next slide (→ / Space)" disabled={index() === pages().length - 1} onClick={() => navigate(index() + 1)}>→</button>
          <button aria-pressed={view() === 'edit'} aria-keyshortcuts="Escape" title="Toggle editor (Esc)" onClick={toggleEditor}>Edit<kbd aria-hidden="true">Esc</kbd></button>
          <button aria-pressed={dark()} aria-keyshortcuts="D" title="Toggle dark mode (D)" onClick={() => setDark(!dark())}>Dark<kbd aria-hidden="true">D</kbd></button>
          <button aria-pressed={view() === 'print'} aria-keyshortcuts="P" title="Toggle print view (P)" onClick={() => setView(view() === 'print' ? 'present' : 'print')}>Print<kbd aria-hidden="true">P</kbd></button>
          <Show when={view() === 'edit' && props.onSave}>
            <button disabled={saving()} title="Save Markdown (⌘S / Ctrl+S)" onClick={() => { void save() }}>
              {saving() ? 'Saving…' : props.saveLabel ?? 'Save'}
            </button>
          </Show>
        </nav>
      </div>
    </Show>
    <Show when={notice()}>{message => <div class={`toast ${message().type}`} role={message().type === 'error' ? 'alert' : 'status'}>{message().text}</div>}</Show>
  </main>
}

function readHash(): number {
  const value = Number(location.hash.slice(1))
  return Number.isInteger(value) && value >= 0 ? value : 0
}
