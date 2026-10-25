#!/usr/bin/env node

import { help, parseCommand } from './cli'
import serve from './serve'
import build from './build'
import { embeddedAssets } from './embedded-assets'

async function main() {
  const command = parseCommand(process.argv.slice(2))
  switch (command.kind) {
    case 'help':
      console.info(help)
      break
    case 'version':
      console.info(require('../package.json').version)
      break
    case 'build':
      await build(command.file, command.options, embeddedAssets)
      break
    case 'serve':
      await serve(command.file, command.options, embeddedAssets)
      break
  }
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
