import React, { useRef, useEffect, useMemo, useCallback } from 'react'
import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import Prism from 'prismjs'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-csharp'

import './styles/slide.css'
import './styles/theme-default.css'
import './styles/theme-code-default.css'

const marked = new Marked(
  { gfm: true, breaks: true, async: false },
  markedHighlight({
    langPrefix: 'language-',
    highlight: (code: string, lang: string) => {
      try {
        return Prism.highlight(code, Prism.languages[lang || 'markup'])
      } catch (e) {
        console.warn(`[highlight error] lang:${lang} code:${code}`)
        return code
      }
    }
  }),
)

export interface MarkdownSlideProps {
  markdown: string
  invert?: boolean
  css?: string
  scale?: number
}

const ORIGINAL_WIDTH = 1280
const ORIGINAL_HEIGHT = 800

export const MarkdownSlide: React.FC<MarkdownSlideProps> = ({
  markdown,
  invert = false,
  css: customCSS = '',
  scale: externalScale,
}) => {
  const slideRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = React.useState(externalScale ?? 1)

  const computeScale = useCallback(() => {
    if (externalScale !== undefined) {
      setScale(externalScale)
      return
    }
    if (slideRef.current) {
      const { width, height } = slideRef.current.getBoundingClientRect()
      const orientPortrait = height > width
      const origW = orientPortrait ? ORIGINAL_HEIGHT : ORIGINAL_WIDTH
      const origH = orientPortrait ? ORIGINAL_WIDTH : ORIGINAL_HEIGHT
      const maxScale = Math.min(width / origW, height / origH)
      setScale(maxScale * 0.9)
    }
  }, [externalScale])

  useEffect(() => {
    computeScale()

    const elem = slideRef.current
    if (!elem || typeof window === 'undefined') return

    if (window.ResizeObserver) {
      const observer = new ResizeObserver(computeScale)
      observer.observe(elem)
      return () => observer.disconnect()
    }
  }, [computeScale])

  const markup = useMemo(() => {
    return marked.parse(markdown) as string
  }, [markdown])

  const orientPortrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth
  const contentWidth = orientPortrait ? ORIGINAL_HEIGHT : ORIGINAL_WIDTH
  const contentHeight = orientPortrait ? ORIGINAL_WIDTH : ORIGINAL_HEIGHT

  const classNames = ['slide', invert ? 'invert' : ''].filter(Boolean).join(' ')

  return (
    <div className={classNames} ref={slideRef}>
      <style>{`
        .slide { background-color: white }
        .content { transform: scale(${scale}); width: ${contentWidth}px; height: ${contentHeight}px; --content-width: ${contentWidth}px; --content-height: ${contentHeight}px; }
        ${customCSS}
      `}</style>
      <section
        className="content"
        dangerouslySetInnerHTML={{ __html: markup }}
      />
    </div>
  )
}
