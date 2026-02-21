import { describe, test, expect } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'
import { MarkdownSlide } from './MarkdownSlide'

describe('MarkdownSlide', () => {
  test('renders markdown content as HTML', () => {
    const { container } = render(
      <MarkdownSlide markdown="# Hello World" />
    )
    const h1 = container.querySelector('h1')
    expect(h1).toBeTruthy()
    expect(h1?.textContent).toBe('Hello World')
  })

  test('renders paragraphs', () => {
    const { container } = render(
      <MarkdownSlide markdown="This is a paragraph" />
    )
    const p = container.querySelector('p')
    expect(p).toBeTruthy()
    expect(p?.textContent).toBe('This is a paragraph')
  })

  test('renders code blocks with syntax highlighting', () => {
    const { container } = render(
      <MarkdownSlide markdown={'```javascript\nconst x = 1;\n```'} />
    )
    const code = container.querySelector('code')
    expect(code).toBeTruthy()
    expect(code?.classList.contains('language-javascript')).toBe(true)
  })

  test('applies invert class when invert prop is true', () => {
    const { container } = render(
      <MarkdownSlide markdown="# Test" invert={true} />
    )
    const slide = container.querySelector('.slide')
    expect(slide?.classList.contains('invert')).toBe(true)
  })

  test('does not apply invert class when invert prop is false', () => {
    const { container } = render(
      <MarkdownSlide markdown="# Test" invert={false} />
    )
    const slide = container.querySelector('.slide')
    expect(slide?.classList.contains('invert')).toBe(false)
  })

  test('renders custom CSS', () => {
    const customCSS = '.slide { background: red; }'
    const { container } = render(
      <MarkdownSlide markdown="# Test" css={customCSS} />
    )
    const style = container.querySelector('style')
    expect(style?.textContent).toContain(customCSS)
  })

  test('renders inline code', () => {
    const { container } = render(
      <MarkdownSlide markdown="Use `const` keyword" />
    )
    const code = container.querySelector('code')
    expect(code).toBeTruthy()
    expect(code?.textContent).toBe('const')
  })

  test('renders links', () => {
    const { container } = render(
      <MarkdownSlide markdown="[Link](https://example.com)" />
    )
    const link = container.querySelector('a')
    expect(link).toBeTruthy()
    expect(link?.getAttribute('href')).toBe('https://example.com')
    expect(link?.textContent).toBe('Link')
  })

  test('renders lists', () => {
    const { container } = render(
      <MarkdownSlide markdown={'- Item 1\n- Item 2\n- Item 3'} />
    )
    const list = container.querySelector('ul')
    expect(list).toBeTruthy()
  })

  test('renders blockquotes', () => {
    const { container } = render(
      <MarkdownSlide markdown="> This is a quote" />
    )
    const blockquote = container.querySelector('blockquote')
    expect(blockquote).toBeTruthy()
  })

  test('has slide class on root element', () => {
    const { container } = render(
      <MarkdownSlide markdown="# Test" />
    )
    const slide = container.querySelector('.slide')
    expect(slide).toBeTruthy()
  })

  test('has content section', () => {
    const { container } = render(
      <MarkdownSlide markdown="# Test" />
    )
    const content = container.querySelector('.content')
    expect(content).toBeTruthy()
  })

  test('applies scale via style', () => {
    const { container } = render(
      <MarkdownSlide markdown="# Test" scale={0.5} />
    )
    const style = container.querySelector('style')
    expect(style?.textContent).toContain('scale(0.5)')
  })
})
