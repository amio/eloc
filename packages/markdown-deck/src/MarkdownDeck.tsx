import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { splitMarkdownToPages, getRangeByIndex } from './utils'
import { MarkdownSlide } from './MarkdownSlide'
import interItalicFontCSS from './fonts/inter.italic.css'
import './styles/deck.css'

export interface MarkdownDeckProps {
  markdown?: string
  src?: string
  css?: string
  index?: number
  hotkey?: boolean
  hashsync?: boolean
  progressBar?: boolean
  printing?: boolean
  editing?: boolean
  invert?: boolean
  onNavigate?: (index: number) => void
  onEditorToggle?: (open: boolean) => void
}

function injectFontCSS(url: string) {
  if (typeof window === 'undefined') return
  if ((window as any).mddSkipLoadingFont) return
  const existing = document.querySelector(`link[href="${url}"]`)
  if (existing) return
  const link = document.createElement('link')
  link.href = url
  link.rel = 'stylesheet'
  link.type = 'text/css'
  link.crossOrigin = 'anonymous'
  document.head.appendChild(link)
}

function injectWebFont(css: string) {
  if (typeof window === 'undefined') return
  const style = document.createElement('style')
  style.appendChild(document.createTextNode(css))
  style.type = 'text/css'
  document.head.appendChild(style)
}

function setLocationHash(hash: number) {
  const hashString = '#' + String(hash)
  if (history.replaceState) {
    history.replaceState(null, '', hashString)
  } else {
    location.hash = hashString
  }
}

function scrollTextareaTo(textarea: HTMLTextAreaElement, start: number) {
  if (start === 0) return
  const content = textarea.value
  textarea.value = content.substring(0, start)
  const originalScrollHeight = textarea.scrollHeight
  textarea.style.paddingBottom = textarea.scrollHeight + 'px'
  const expandScrollHeight = textarea.scrollHeight
  textarea.style.paddingBottom = '15px'
  textarea.value = content
  textarea.scrollTop = expandScrollHeight - originalScrollHeight - 46
}

let fontInjected = false

export const MarkdownDeck: React.FC<MarkdownDeckProps> = ({
  markdown: markdownProp,
  src,
  css: cssUrl,
  index: indexProp = 0,
  hotkey = false,
  hashsync = false,
  progressBar = false,
  printing: printingProp = false,
  editing: editingProp = false,
  invert: invertProp = false,
  onNavigate,
  onEditorToggle,
}) => {
  const [markdown, setMarkdown] = useState(markdownProp ?? '')
  const [index, setIndex] = useState(indexProp)
  const [printing, setPrinting] = useState(printingProp)
  const [editing, setEditing] = useState(editingProp)
  const [invert, setInvert] = useState(invertProp)
  const [stylesheet, setStylesheet] = useState('')
  const [, forceUpdate] = useState(0)
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const touchStartRef = useRef<{ clientX: number; clientY: number } | null>(null)

  const pages = useMemo(() => splitMarkdownToPages(markdown), [markdown])

  // Sync controlled props
  useEffect(() => {
    if (markdownProp !== undefined) setMarkdown(markdownProp)
  }, [markdownProp])

  useEffect(() => { setIndex(indexProp) }, [indexProp])
  useEffect(() => { setPrinting(printingProp) }, [printingProp])
  useEffect(() => { setEditing(editingProp) }, [editingProp])
  useEffect(() => { setInvert(invertProp) }, [invertProp])

  // Inject fonts once
  useEffect(() => {
    if (fontInjected) return
    fontInjected = true
    injectWebFont(interItalicFontCSS)
    injectFontCSS('https://fonts.googleapis.com/css2?family=Inter:wght@200..800&display=swap')
    injectFontCSS('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,700;1,300&display=swap')
    injectFontCSS('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600&display=swap')
  }, [])

  // Load markdown from src
  useEffect(() => {
    if (!src) return
    fetch(src, { mode: 'cors' })
      .then(resp => {
        if (resp.status === 200) return resp.text()
        console.error(`(fetching ${src}) ${resp.status}`)
        return ''
      })
      .then(text => {
        if (text) setMarkdown(text)
      })
      .catch(console.error)
  }, [src])

  // Load custom CSS
  useEffect(() => {
    if (!cssUrl) return
    fetch(cssUrl, { mode: 'cors' })
      .then(resp => {
        if (resp.status === 200) return resp.text()
        throw new Error(`(fetching ${cssUrl}) ${resp.status}`)
      })
      .then(text => setStylesheet(text))
      .catch(console.error)
  }, [cssUrl])

  // Hash sync on mount
  useEffect(() => {
    if (hashsync && typeof window !== 'undefined') {
      const hashIndex = parseInt(location.hash.replace('#', ''), 10) || 0
      setIndex(hashIndex)
    }
  }, [hashsync])

  // Sync hash when index changes
  useEffect(() => {
    if (hashsync) {
      setLocationHash(index)
    }
  }, [index, hashsync])

  // Editor toggle callback
  useEffect(() => {
    onEditorToggle?.(editing)
  }, [editing, onEditorToggle])

  // Sync editor selection when editing starts
  useEffect(() => {
    if (editing && editorRef.current && markdown) {
      const textarea = editorRef.current
      const [start, end] = getRangeByIndex(markdown, index)
      scrollTextareaTo(textarea, start)
      textarea.setSelectionRange(start, end)
      textarea.focus()
    }
  }, [editing, index, markdown])

  const switchSlide = useCallback((to: 'next' | 'prev' | 'first' | 'last' | number) => {
    setIndex(prevIndex => {
      let targetIndex: number = prevIndex

      switch (to) {
        case 'next':
          targetIndex = prevIndex + 1
          break
        case 'prev':
          targetIndex = prevIndex - 1
          break
        case 'first':
          targetIndex = 0
          break
        case 'last':
          targetIndex = pages.length - 1
          break
        default:
          if (typeof to === 'number') {
            targetIndex = to
          }
      }

      // prevent index overflow
      if (targetIndex >= pages.length) {
        targetIndex = pages.length - 1
      }
      if (targetIndex < 0) {
        targetIndex = 0
      }

      onNavigate?.(targetIndex)
      return targetIndex
    })
  }, [pages.length, onNavigate])

  // Hotkey handler
  useEffect(() => {
    if (!hotkey) return

    const handleKeydown = (ev: KeyboardEvent) => {
      const target = ev.target as EventTarget | null
      const isGlobal = !target || target === window || target === document || target === document.body || target === document.documentElement
      if (!isGlobal && !(target as HTMLElement)?.closest?.('.markdown-deck-root')) return
      if (ev.metaKey || ev.ctrlKey) return

      switch (ev.code) {
        case 'Space':
        case 'ArrowRight':
        case 'KeyL':
          ev.shiftKey ? switchSlide('prev') : switchSlide('next')
          return
        case 'ArrowLeft':
        case 'KeyJ':
          ev.shiftKey ? switchSlide('next') : switchSlide('prev')
          return
        case 'ArrowUp':
          switchSlide('first')
          return
        case 'ArrowDown':
          switchSlide('last')
          return
        case 'KeyI':
        case 'KeyD':
          setInvert(v => !v)
          return
        case 'Escape':
          setPrinting(false)
          setEditing(v => !v)
          return
        case 'KeyP':
          setEditing(false)
          setPrinting(v => !v)
          forceUpdate(n => n + 1)
          return
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [hotkey, switchSlide])

  // Window resize trigger
  useEffect(() => {
    const onResize = () => forceUpdate(n => n + 1)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handleEditing = useCallback((ev: React.KeyboardEvent | React.FormEvent) => {
    if (ev.nativeEvent instanceof KeyboardEvent) {
      const kev = ev.nativeEvent
      if (kev.code === 'Escape' || kev.metaKey || kev.ctrlKey) return
      ev.stopPropagation()
    }

    const editor = editorRef.current
    if (!editor) return
    const textBeforeCaret = editor.value.substring(0, editor.selectionStart + 2)
    const pageIndex = splitMarkdownToPages(textBeforeCaret).length - 1
    setMarkdown(editor.value)
    setIndex(pageIndex)
  }, [])

  const handleTouchStart = useCallback((ev: React.TouchEvent) => {
    const { clientX, clientY } = ev.changedTouches[0]
    touchStartRef.current = { clientX, clientY }
  }, [])

  const handleTouchEnd = useCallback((ev: React.TouchEvent) => {
    if (!touchStartRef.current) return
    const { clientX, clientY } = ev.changedTouches[0]
    const deltaX = clientX - touchStartRef.current.clientX
    const deltaY = clientY - touchStartRef.current.clientY
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      deltaX > 0 ? switchSlide('prev') : switchSlide('next')
    }
  }, [switchSlide])

  if (pages.length === 0) {
    return null
  }

  const isWideScreen = typeof window !== 'undefined' && window.innerWidth > 960
  const deckClassNames = [
    'deck',
    invert ? 'invert' : '',
    printing ? 'printing' : '',
    editing && isWideScreen ? 'editing' : '',
    editing && !isWideScreen ? 'editor' : '',
  ].filter(Boolean).join(' ')

  const renderSlide = (md: string, key?: number) => (
    <MarkdownSlide
      key={key}
      markdown={md}
      invert={invert}
      css={stylesheet}
    />
  )

  const renderSlides = (mds: string[]) => (
    <div className="print-wrap">
      {mds.map((md, i) => renderSlide(md, i))}
    </div>
  )

  const renderProgressBar = (width: number) => (
    <div className="progress-bar">
      <div
        className={`progress ${invert ? 'invert' : ''}`}
        style={{ width: `${width}%` }}
      />
    </div>
  )

  const renderBlankHint = () => renderSlide('press <kbd>esc</kbd> to start writing')

  const renderEditor = () => (
    <textarea
      className="editor"
      ref={editorRef}
      defaultValue={markdown}
      onKeyDown={handleEditing}
      onKeyUp={handleEditing}
      onInput={handleEditing}
      onClick={handleEditing}
    />
  )

  return (
    <div className="markdown-deck-root">
      <div
        className={deckClassNames}
        tabIndex={1000}
        role="main"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="editor-column">
          {editing ? renderEditor() : null}
        </div>
        <div className="slide-column">
          {markdown === undefined && hotkey
            ? renderBlankHint()
            : printing
              ? renderSlides(pages)
              : renderSlide(pages[index])
          }
          {progressBar && !printing
            ? renderProgressBar(index / (pages.length - 1) * 100)
            : null
          }
        </div>
      </div>
      <div className="preload">
        {renderSlides(pages)}
      </div>
    </div>
  )
}
