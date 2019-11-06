#!/usr/bin/env node

import mri from 'mri'
import { bold, dim, green } from 'kleur'

import serve from './serve'
import build from './build'
import init from './init'

const help = `
  ${bold('eloc')} - Elequence cli

  Usage

    $ eloc <markdown-file>        ${dim('Serve markdown file as presentation')}
    $ eloc open <markdown-file>   ${dim('Open markdown file as presention in browser')}
    $ eloc build <markdown-file>  ${dim('Export presentation to directory')}

  Options

    -p, --port      ${dim('Port (default: 3000)')}
    -c, --css       ${dim('External css for customization')}
    -i, --include   ${dim('Files for referencing in markdown (format: glob)')}
    -o, --out-dir   ${dim('Output directory for build (default: public)')}
    -t, --title     ${dim('HTML title (default: <markdown-filename>)')}
    -q, --quiet     ${dim('Mute verbose logs')}

    --progress      ${dim('Enable progress bar')}

  Flags

    -v, --version   ${dim('Display version number')}
    -h, --help      ${dim('Display usage information')}

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
  boolean: ['help', 'version', 'quiet', 'progress-bar'],
  alias: {
    h: 'help',
    v: 'version',
    o: 'out-dir',
    i: 'include',
    t: 'title',
    q: 'quiet',
    p: 'port',
    c: 'css'
  }
})

if (options.help) {
  console.info(help)
} else if (options.version) {
  console.info(require('../package.json').version)
} else if (params.length === 1) {
  serve(params[0], options)
} else if (params.length === 2 && params[0] === 'open') {
  serve(params[1], { ...options, open: true })
} else if (params.length === 2 && params[0] === 'build') {
  build(params[1], options)
} else if (params.length === 2 && params[0] === 'init') {
  init(params[1], options)
} else {
  console.info(help)
}
