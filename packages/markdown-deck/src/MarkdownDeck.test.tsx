import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import React from 'react'
import { MarkdownDeck } from './MarkdownDeck'

function dispatchKeyDown(code: string, opts: Partial<KeyboardEventInit> = {}) {
  document.body.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true, ...opts }))
}

const sampleMarkdown = `# Title
---
## Page 1
---
## Page 2`

describe('MarkdownDeck', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(''))
    // Reset hash
    window.location.hash = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('renders nothing when markdown is empty', () => {
    const { container } = render(
      <MarkdownDeck markdown="" />
    )
    // Empty string splits to one empty page, so it still renders
    expect(container.querySelector('.markdown-deck-root')).toBeTruthy()
  })

  test('renders current slide', () => {
    const { container } = render(
      <MarkdownDeck markdown={sampleMarkdown} index={0} />
    )
    const root = container.querySelector('.markdown-deck-root')
    expect(root).toBeTruthy()
    const h1 = container.querySelector('.slide-column h1')
    expect(h1?.textContent).toBe('Title')
  })

  test('renders slide at given index', () => {
    const { container } = render(
      <MarkdownDeck markdown={sampleMarkdown} index={1} />
    )
    const h2 = container.querySelector('.slide-column h2')
    expect(h2?.textContent).toBe('Page 1')
  })

  test('navigates to next slide with arrow key', () => {
    const onNavigate = vi.fn()
    render(
      <MarkdownDeck
        markdown={sampleMarkdown}
        index={0}
        hotkey={true}
        onNavigate={onNavigate}
      />
    )

    act(() => {
      dispatchKeyDown('ArrowRight')
    })

    expect(onNavigate).toHaveBeenCalledWith(1)
  })

  test('navigates to previous slide with arrow left', () => {
    const onNavigate = vi.fn()
    render(
      <MarkdownDeck
        markdown={sampleMarkdown}
        index={1}
        hotkey={true}
        onNavigate={onNavigate}
      />
    )

    act(() => {
      dispatchKeyDown('ArrowLeft')
    })

    expect(onNavigate).toHaveBeenCalledWith(0)
  })

  test('navigates to first slide with arrow up', () => {
    const onNavigate = vi.fn()
    render(
      <MarkdownDeck
        markdown={sampleMarkdown}
        index={2}
        hotkey={true}
        onNavigate={onNavigate}
      />
    )

    act(() => {
      dispatchKeyDown('ArrowUp')
    })

    expect(onNavigate).toHaveBeenCalledWith(0)
  })

  test('navigates to last slide with arrow down', () => {
    const onNavigate = vi.fn()
    render(
      <MarkdownDeck
        markdown={sampleMarkdown}
        index={0}
        hotkey={true}
        onNavigate={onNavigate}
      />
    )

    act(() => {
      dispatchKeyDown('ArrowDown')
    })

    expect(onNavigate).toHaveBeenCalledWith(2)
  })

  test('navigates with Space key', () => {
    const onNavigate = vi.fn()
    render(
      <MarkdownDeck
        markdown={sampleMarkdown}
        index={0}
        hotkey={true}
        onNavigate={onNavigate}
      />
    )

    act(() => {
      dispatchKeyDown('Space')
    })

    expect(onNavigate).toHaveBeenCalledWith(1)
  })

  test('does not navigate beyond last slide', () => {
    const onNavigate = vi.fn()
    render(
      <MarkdownDeck
        markdown={sampleMarkdown}
        index={2}
        hotkey={true}
        onNavigate={onNavigate}
      />
    )

    act(() => {
      dispatchKeyDown('ArrowRight')
    })

    expect(onNavigate).toHaveBeenCalledWith(2)
  })

  test('does not navigate before first slide', () => {
    const onNavigate = vi.fn()
    render(
      <MarkdownDeck
        markdown={sampleMarkdown}
        index={0}
        hotkey={true}
        onNavigate={onNavigate}
      />
    )

    act(() => {
      dispatchKeyDown('ArrowLeft')
    })

    expect(onNavigate).toHaveBeenCalledWith(0)
  })

  test('toggles invert mode with KeyI', () => {
    const { container } = render(
      <MarkdownDeck
        markdown={sampleMarkdown}
        hotkey={true}
      />
    )

    act(() => {
      dispatchKeyDown('KeyI')
    })

    const slide = container.querySelector('.slide-column .slide')
    expect(slide?.classList.contains('invert')).toBe(true)
  })

  test('toggles editing mode with Escape', () => {
    const onEditorToggle = vi.fn()
    const { container } = render(
      <MarkdownDeck
        markdown={sampleMarkdown}
        hotkey={true}
        onEditorToggle={onEditorToggle}
      />
    )

    act(() => {
      dispatchKeyDown('Escape')
    })

    expect(onEditorToggle).toHaveBeenCalledWith(true)
  })

  test('renders progress bar when enabled', () => {
    const { container } = render(
      <MarkdownDeck
        markdown={sampleMarkdown}
        progressBar={true}
      />
    )
    const progressBar = container.querySelector('.progress-bar')
    expect(progressBar).toBeTruthy()
  })

  test('does not render progress bar when disabled', () => {
    const { container } = render(
      <MarkdownDeck
        markdown={sampleMarkdown}
        progressBar={false}
      />
    )
    const progressBar = container.querySelector('.progress-bar')
    expect(progressBar).toBeFalsy()
  })

  test('renders all slides in printing mode', () => {
    const { container } = render(
      <MarkdownDeck
        markdown={sampleMarkdown}
        printing={true}
      />
    )
    const slides = container.querySelectorAll('.slide-column .slide')
    expect(slides.length).toBe(3)
  })

  test('renders editor when editing is true', () => {
    // Mock wide screen
    Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true })

    const { container } = render(
      <MarkdownDeck
        markdown={sampleMarkdown}
        editing={true}
      />
    )
    const editor = container.querySelector('.editor')
    expect(editor).toBeTruthy()
  })

  test('loads markdown from src URL', async () => {
    const remoteMarkdown = '# Remote\n---\n## Slide 2'
    fetchSpy.mockResolvedValueOnce({
      status: 200,
      text: () => Promise.resolve(remoteMarkdown),
    } as unknown as Response)

    await act(async () => {
      render(<MarkdownDeck src="/test.md" />)
    })

    expect(fetchSpy).toHaveBeenCalledWith('/test.md', { mode: 'cors' })
  })

  test('loads custom CSS from url', async () => {
    const customCSS = '.slide { background: blue; }'
    fetchSpy.mockResolvedValueOnce({
      status: 200,
      text: () => Promise.resolve(customCSS),
    } as unknown as Response)

    await act(async () => {
      render(<MarkdownDeck markdown="# Test" css="/custom.css" />)
    })

    expect(fetchSpy).toHaveBeenCalledWith('/custom.css', { mode: 'cors' })
  })

  test('hotkey does not respond when disabled', () => {
    const onNavigate = vi.fn()
    render(
      <MarkdownDeck
        markdown={sampleMarkdown}
        index={0}
        hotkey={false}
        onNavigate={onNavigate}
      />
    )

    act(() => {
      dispatchKeyDown('ArrowRight')
    })

    expect(onNavigate).not.toHaveBeenCalled()
  })

  test('ignores keydown with meta key', () => {
    const onNavigate = vi.fn()
    render(
      <MarkdownDeck
        markdown={sampleMarkdown}
        index={0}
        hotkey={true}
        onNavigate={onNavigate}
      />
    )

    act(() => {
      dispatchKeyDown('ArrowRight', { metaKey: true })
    })

    expect(onNavigate).not.toHaveBeenCalled()
  })

  test('ignores keydown with ctrl key', () => {
    const onNavigate = vi.fn()
    render(
      <MarkdownDeck
        markdown={sampleMarkdown}
        index={0}
        hotkey={true}
        onNavigate={onNavigate}
      />
    )

    act(() => {
      dispatchKeyDown('ArrowRight', { ctrlKey: true })
    })

    expect(onNavigate).not.toHaveBeenCalled()
  })

  test('preload div exists and contains all slides', () => {
    const { container } = render(
      <MarkdownDeck markdown={sampleMarkdown} />
    )
    const preload = container.querySelector('.preload')
    expect(preload).toBeTruthy()
    const slides = preload?.querySelectorAll('.slide')
    expect(slides?.length).toBe(3)
  })

  test('handles touch navigation', () => {
    const onNavigate = vi.fn()
    const { container } = render(
      <MarkdownDeck
        markdown={sampleMarkdown}
        index={0}
        onNavigate={onNavigate}
      />
    )

    const deck = container.querySelector('.deck')!

    act(() => {
      fireEvent.touchStart(deck, {
        changedTouches: [{ clientX: 200, clientY: 200 }],
      })
      fireEvent.touchEnd(deck, {
        changedTouches: [{ clientX: 50, clientY: 200 }],
      })
    })

    // Swiped left -> next
    expect(onNavigate).toHaveBeenCalledWith(1)
  })

  test('handles touch navigation swipe right for prev', () => {
    const onNavigate = vi.fn()
    const { container } = render(
      <MarkdownDeck
        markdown={sampleMarkdown}
        index={1}
        onNavigate={onNavigate}
      />
    )

    const deck = container.querySelector('.deck')!

    act(() => {
      fireEvent.touchStart(deck, {
        changedTouches: [{ clientX: 50, clientY: 200 }],
      })
      fireEvent.touchEnd(deck, {
        changedTouches: [{ clientX: 200, clientY: 200 }],
      })
    })

    // Swiped right -> prev
    expect(onNavigate).toHaveBeenCalledWith(0)
  })
})
