/**
 * Auto-mount entry point for standalone usage.
 * Renders a MarkdownDeck React app into a DOM element with id="markdown-deck".
 * Reads configuration from the element's data attributes.
 */
import React from 'react'
import { createRoot } from 'react-dom/client'
import { MarkdownDeck } from './MarkdownDeck'

declare global {
  interface Window {
    markdownDeckConfig?: {
      src?: string
      css?: string
      hotkey?: boolean
      hashsync?: boolean
      progressBar?: boolean
      invert?: boolean
      editing?: boolean
    }
  }
}

function mount() {
  const container = document.getElementById('markdown-deck')
  if (!container) return

  const config = window.markdownDeckConfig || {}

  // Also read data attributes from the container
  const src = config.src || container.dataset.src || undefined
  const css = config.css || container.dataset.css || undefined
  const hotkey = config.hotkey ?? container.dataset.hotkey !== undefined
  const hashsync = config.hashsync ?? container.dataset.hashsync !== undefined
  const progressBar = config.progressBar ?? container.dataset.progressbar !== undefined
  const invert = config.invert ?? container.dataset.invert !== undefined
  const editing = config.editing ?? container.dataset.editing !== undefined

  const root = createRoot(container)
  root.render(
    <MarkdownDeck
      src={src}
      css={css}
      hotkey={hotkey}
      hashsync={hashsync}
      progressBar={progressBar}
      invert={invert}
      editing={editing}
    />
  )
}

// Auto-mount when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount)
  } else {
    mount()
  }
}
