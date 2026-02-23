/**
 * Markdown Tokenizer
 *
 * A regex-based tokenizer that scans text with multiple grammar rules
 * and returns tokens with type, start, and end positions.
 */

export interface Token {
  type: string
  start: number
  end: number
}

export interface Grammar {
  [key: string]: RegExp
}

/**
 * Default Markdown grammar rules.
 * Each rule is a regex with the global (and optionally multiline) flag.
 */
export const grammars: Grammar = {
  heading: /^#{1,6}\s.*/gm,
  bold: /\*\*[\s\S]+?\*\*/g,
  italic: /(?<!\*)\*(?!\*)[\s\S]+?(?<!\*)\*(?!\*)/g,
  code: /`[^`]+`/g,
  link: /\[[\s\S]*?\]\([\s\S]*?\)/g,
  blockquote: /^>\s.*/gm,
  hr: /^[-*]{3,}\s*$/gm,
  list: /^[\t ]*[-*+]\s.*/gm,
  orderedList: /^[\t ]*\d+\.\s.*/gm,
  strikethrough: /~~[\s\S]+?~~/g,
}

/**
 * Tokenize a text string using the provided grammar rules.
 * Performs multiple passes (one per grammar rule) and collects all tokens.
 *
 * @param text - The input text to tokenize
 * @param rules - Grammar rules to use (defaults to built-in grammars)
 * @returns Array of tokens sorted by start position
 */
export function tokenize(text: string, rules: Grammar = grammars): Token[] {
  const tokens: Token[] = []

  for (const [type, pattern] of Object.entries(rules)) {
    // Create a fresh regex to reset lastIndex
    const regex = new RegExp(pattern.source, pattern.flags)
    let match: RegExpExecArray | null

    while ((match = regex.exec(text)) !== null) {
      tokens.push({
        type,
        start: match.index,
        end: match.index + match[0].length,
      })
    }
  }

  return tokens.sort((a, b) => a.start - b.start)
}
