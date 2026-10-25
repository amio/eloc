import mri from 'mri'
import kleur from 'kleur'
import type { BuildOptions } from './build.ts'
import type { ServeOptions } from './serve.ts'

const { bold, dim, green } = kleur

export const help = `
  ${bold('eloc')} - The eloquent cli

  Usage

    $ eloc <markdown-file>        ${dim('Serve markdown file as presentation')}
    $ eloc open <markdown-file>   ${dim('Open markdown file as presentation in browser')}
    $ eloc build <markdown-file>  ${dim('Export presentation to directory')}

  Options

    -p, --port <number>     ${dim('Port (default: 5000)')}
    -c, --css <file>        ${dim('External css for customization')}
    -i, --include <globs>   ${dim('Files for referencing in markdown')}
    -o, --out-dir <dir>     ${dim('Output directory for build (default: public)')}
    -t, --title <string>    ${dim('HTML title (default: <markdown-filename>)')}
    -b, --progress-bar      ${dim('Enable progress bar')}
    -d, --dark              ${dim('Enable dark theme')}

    -q, --quiet             ${dim('Mute verbose logs')}
    -v, --version           ${dim('Display version number')}
    -h, --help              ${dim('Display usage information')}

  Examples

    # Serve "deck.md" as presentation
    $ ${green('eloc deck.md')}

    # Create & open "new-deck.md" as presentation in browser
    $ ${green('eloc open new-deck.md')}

    # Export presentation with images
    $ ${green('eloc build deck.md --include "*.jpg"')}
`

export type Command =
  | { kind: 'help' | 'version' }
  | { kind: 'build'; file: string; options: BuildOptions }
  | { kind: 'serve'; file: string; options: ServeOptions }

export function parseCommand(argv: string[]): Command {
  const { _: params, ...options } = mri(expandAliases(argv), {
    string: ['out-dir', 'include', 'title', 'css'],
    boolean: ['help', 'version', 'quiet', 'progress-bar', 'dark']
  })

  if (options.help) return { kind: 'help' }
  if (options.version) return { kind: 'version' }
  if (params.length === 1) return { kind: 'serve', file: params[0], options }
  if (params[0] === 'open' && params.length > 1) {
    return { kind: 'serve', file: params[1], options: { ...options, open: true } }
  }
  if (params[0] === 'build' && params.length > 1) {
    return { kind: 'build', file: params[1], options }
  }
  return { kind: 'help' }
}

const aliases: Record<string, string> = {
  h: 'help', v: 'version', o: 'out-dir', i: 'include', t: 'title',
  q: 'quiet', p: 'port', c: 'css', d: 'dark', b: 'progress-bar'
}

// mri merges aliases after parsing, losing values when short and long forms mix.
// Canonicalize flag names first so repeated values keep their command-line order.
function expandAliases(argv: string[]): string[] {
  const expanded: string[] = []
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === '--') return [...expanded, ...argv.slice(index)]
    const short = arg.match(/^-([a-zA-Z]+)(=.*)?$/)
    if (!short) {
      expanded.push(arg)
      continue
    }
    const names = [...short[1]]
    expanded.push(...names.map((name, offset) => `--${aliases[name] || name}${offset === names.length - 1 ? short[2] || '' : ''}`))
  }
  return expanded
}
