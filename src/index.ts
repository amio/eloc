#!/usr/bin/env node

import mri from 'mri'
import kleur from 'kleur'

import serve from './serve'
import build from './build'

const { bold, dim, green } = kleur

const help = `
  ${bold('eloc')} - The eloquent cli

  Usage

    $ eloc <markdown-file>        ${dim('Serve markdown file as presentation')}
    $ eloc open <markdown-file>   ${dim('Open markdown file as presention in browser')}
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

const { _: params, ...options } = mri(process.argv.slice(2), {
  string: ['out-dir', 'include', 'title', 'css'],
  boolean: ['help', 'version', 'quiet', 'progress-bar', 'dark'],
  alias: {
    h: 'help',
    v: 'version',
    o: 'out-dir',
    i: 'include',
    t: 'title',
    q: 'quiet',
    p: 'port',
    c: 'css',
    d: 'dark',
    b: 'progress-bar'
  }
})

if (options.help) {
  console.info(help)
} else if (options.version) {
  console.info(require('../package.json').version)
} else if (params.length === 1) {
  serve(params[0], options)
} else if (params[0] === 'open' && params.length > 1) {
  serve(params[1], { ...options, open: true })
} else if (params[0] === 'build' && params.length > 1) {
  build(params[1], options)
} else {
  console.info(help)
}
