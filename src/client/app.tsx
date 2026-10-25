import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js'
import type { DeckConfig } from './config'
import { pageAtOffset, parsePages } from './pages'
import { Slide } from './slide'

export function App(props: { config: DeckConfig }) {
  const config = props.config
  const [markdown, setMarkdown] = createSignal('')
  const [stylesheet, setStylesheet] = createSignal('')
  const [loaded, setLoaded] = createSignal(false)
  const [requestedIndex, setRequestedIndex] = createSignal(readHash())
  const [view, setView] = createSignal<'present' | 'edit' | 'print'>('present')
  const [nativePrint, setNativePrint] = createSignal(false)
  const [dark, setDark] = createSignal(Boolean(config.dark))
  const [saving, setSaving] = createSignal(false)
  const [notice, setNotice] = createSignal<{ text: string; type: string }>()
  const pages = createMemo(() => parsePages(markdown()))
  const index = createMemo(() => Math.max(0, Math.min(requestedIndex(), pages().length - 1)))
  const printing = () => view() === 'print' || nativePrint()
  let toastTimer: ReturnType<typeof setTimeout> | undefined

  function toast(text: string, type = 'info') {
    clearTimeout(toastTimer)
    setNotice({ text, type })
    toastTimer = setTimeout(() => setNotice(undefined), 4000)
  }

  function navigate(to: number) {
    setRequestedIndex(Math.max(0, Math.min(to, pages().length - 1)))
  }

  function toggleEditor() {
    setView(view() === 'edit' ? 'present' : 'edit')
  }

  function updateFromEditor(editor: HTMLTextAreaElement) {
    setMarkdown(editor.value)
    navigate(pageAtOffset(pages(), editor.selectionStart))
  }

  function focusEditor(editor: HTMLTextAreaElement) {
    queueMicrotask(() => {
      const page = pages()[index()]
      editor.focus()
      editor.setSelectionRange(page.start, page.end)
      const line = markdown().slice(0, page.start).split('\n').length - 1
      editor.scrollTop = line * 23 - editor.clientHeight / 3
    })
  }

  async function save() {
    if (!loaded() || saving()) return
    if (!config.saveToken) {
      const url = URL.createObjectURL(new Blob([markdown()], { type: 'text/markdown;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = config.filename
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast(`Downloaded ${config.filename}`, 'success')
      return
    }
    setSaving(true)
    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Eloc-Save-Token': config.saveToken },
        body: JSON.stringify({ markdown: markdown() })
      })
      const message = await response.text()
      if (!response.ok) throw new Error(message)
      toast(message, 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Unable to save Markdown', 'error')
    } finally {
      setSaving(false)
    }
  }

  function keydown(event: KeyboardEvent) {
    if (event.defaultPrevented) return
    if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') {
      event.preventDefault()
      void save()
      return
    }
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return
    if (event.code === 'Escape') {
      event.preventDefault()
      toggleEditor()
      return
    }
    if ((event.target as HTMLElement)?.closest('textarea, input, select, button, a, [contenteditable]')) return
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
    if (loaded()) history.replaceState(null, '', `#${index()}`)
  }
  createEffect(syncHash)

  onMount(() => {
    const controller = new AbortController()
    const source = new URL(location.href).searchParams.get('src') || config.filename
    const fetchText = async (url: string) => {
      const response = await fetch(url, { signal: controller.signal })
      if (!response.ok) throw new Error(`Unable to load ${url} (${response.status})`)
      return response.text()
    }
    void fetchText(source).then(setMarkdown).catch(error => {
      if (error.name !== 'AbortError') toast(`${error.message}. Press Esc to start writing.`, 'error')
    }).finally(() => { if (!controller.signal.aborted) setLoaded(true) })
    if (config.css) void fetchText(config.css).then(setStylesheet).catch(error => {
      if (error.name !== 'AbortError') toast(error.message, 'error')
    })
    const hashChange = () => {
      setRequestedIndex(readHash())
      // An invalid or out-of-range hash can resolve to the already active slide.
      syncHash()
    }
    const media = matchMedia('print')
    const printChange = () => setNativePrint(media.matches)
    printChange()
    window.addEventListener('keydown', keydown)
    window.addEventListener('hashchange', hashChange)
    media.addEventListener('change', printChange)
    onCleanup(() => {
      controller.abort()
      clearTimeout(toastTimer)
      window.removeEventListener('keydown', keydown)
      window.removeEventListener('hashchange', hashChange)
      media.removeEventListener('change', printChange)
    })
  })

  return <main id="deck" classList={{ dark: dark(), editing: view() === 'edit', printing: printing() }}>
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
            <Slide markdown={markdown() === '' ? 'Press <kbd>Esc</kbd> to start writing' : pages()[index()].markdown}
              css={stylesheet()} dark={dark()} index={index()} />
          }>
            <div class="print-wrap"><For each={pages()}>{(page, position) =>
              <Slide markdown={page.markdown} css={stylesheet()} dark={dark()} index={position()} />
            }</For></div>
          </Show>
          <Show when={config.progressBar && !printing()}>
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
          <Show when={view() === 'edit'}>
            <button disabled={saving()} title="Save Markdown (⌘S / Ctrl+S)" onClick={() => { void save() }}>
              {config.saveToken ? saving() ? 'Saving…' : 'Save' : 'Download'}
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
