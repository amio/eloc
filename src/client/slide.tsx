import { createMemo, createSignal, onCleanup, onMount, Show } from 'solid-js'
import { render } from 'solid-js/web'
import { renderMarkdown } from './markdown'
import slideCSS from './slide.css?raw'
import themeCSS from './theme.css?raw'
import codeCSS from './code.css?raw'

interface SlideProps {
  markdown: string
  css?: string
  onCssError: () => void
  dark: boolean
  index: number
}

export function Slide(props: SlideProps) {
  let host!: HTMLElement
  const [size, setSize] = createSignal({ width: 1280, height: 800 })
  const portrait = () => size().height > size().width
  const width = () => portrait() ? 800 : 1280
  const height = () => portrait() ? 1280 : 800
  const scale = () => Math.min(size().width / width(), size().height / height()) * 0.9
  const markup = createMemo(() => renderMarkdown(props.markdown))

  onMount(() => {
    // Each slide owns a shadow root so author CSS remains local in print view too.
    const dispose = render(() => <>
      <style>{slideCSS + themeCSS + codeCSS}</style>
      <Show when={props.css}><link rel="stylesheet" href={props.css} onError={props.onCssError} /></Show>
      <div class="slide" classList={{ invert: props.dark }}>
        <section class="content" style={{
          width: `${width()}px`, height: `${height()}px`,
          '--content-width': `${width()}px`, '--content-height': `${height()}px`,
          transform: `scale(${scale()})`
        }} innerHTML={markup()} />
      </div>
    </>, host.attachShadow({ mode: 'open' }))
    const measure = () => {
      const { width, height } = host.getBoundingClientRect()
      if (width && height) setSize({ width, height })
    }
    const observer = new ResizeObserver(measure)
    observer.observe(host)
    measure()
    onCleanup(() => { observer.disconnect(); dispose() })
  })

  return <article ref={host} class="slide-host" aria-label={`Slide ${props.index + 1}`} />
}
