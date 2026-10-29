import { createEffect, onCleanup, onMount } from 'solid-js'
import { createMdInk, type MdInk } from 'md-ink'

interface EditorProps {
  value: string
  onChange: (editor: HTMLTextAreaElement) => void
  onReady: (editor: HTMLTextAreaElement) => void
}

export function Editor(props: EditorProps) {
  let editor!: HTMLTextAreaElement
  let ink: MdInk | undefined

  createEffect(() => {
    const value = props.value
    // Native input refreshes md-ink itself; only script assignments need update().
    if (editor.value !== value) {
      editor.value = value
      ink?.update()
    }
  })
  onMount(() => {
    ink = createMdInk(editor)
    props.onReady(editor)
  })
  onCleanup(() => ink?.destroy())

  return <textarea ref={editor} class="editor" aria-label="Markdown" spellcheck={false}
    onInput={event => props.onChange(event.currentTarget)}
    onClick={event => props.onChange(event.currentTarget)}
    onKeyUp={event => { if (event.code !== 'Escape') props.onChange(event.currentTarget) }} />
}
