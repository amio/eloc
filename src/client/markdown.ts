import { Marked } from 'marked'
import { markedHighlight } from 'marked-highlight'
import Prism from 'prismjs'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-csharp'

const marked = new Marked(
  { gfm: true, breaks: true, async: false },
  markedHighlight({
    langPrefix: 'language-',
    highlight(code, language) {
      const grammar = Prism.languages[language || 'markup']
      return grammar ? Prism.highlight(code, grammar, language || 'markup') : code
    }
  })
)

export function renderMarkdown(markdown: string): string {
  return marked.parse(markdown) as string
}
