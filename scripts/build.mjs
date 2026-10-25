import { build, context, transform } from 'esbuild'
import { transformAsync } from '@babel/core'
import solid from 'babel-preset-solid'
import { chmod, readFile, rm } from 'node:fs/promises'
import { resolve } from 'node:path'

const rawTextPlugin = {
  name: 'raw-text',
  setup(build) {
    build.onResolve({ filter: /\?raw$/ }, args => ({
      namespace: 'raw-text',
      path: resolve(args.resolveDir, args.path.slice(0, -4))
    }))
    build.onLoad({ filter: /.*/, namespace: 'raw-text' }, async args => ({
      contents: await readFile(args.path, 'utf8'),
      loader: 'text',
      watchFiles: [args.path]
    }))
  }
}

const solidPlugin = {
  name: 'solid',
  setup(build) {
    build.onLoad({ filter: /\.tsx$/ }, async args => {
      const source = await readFile(args.path, 'utf8')
      const stripped = await transform(source, { loader: 'tsx', jsx: 'preserve', sourcefile: args.path })
      const compiled = await transformAsync(stripped.code, {
        filename: args.path,
        babelrc: false,
        configFile: false,
        presets: [[solid, { generate: 'dom' }]]
      })
      return { contents: compiled.code, loader: 'js' }
    })
  }
}

const browserOptions = {
  entryPoints: ['src/client/index.tsx'],
  outfile: 'dist/client.js',
  platform: 'browser',
  format: 'iife',
  target: ['es2022'],
  bundle: true,
  minify: true,
  logLevel: 'info',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [solidPlugin, rawTextPlugin]
}
const cliOptions = {
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  platform: 'node',
  target: ['node22'],
  bundle: true,
  minify: true,
  logLevel: 'info',
  plugins: [rawTextPlugin, {
    name: 'executable',
    setup(build) {
      build.onEnd(async result => { if (!result.errors.length) await chmod('dist/index.js', 0o755) })
    }
  }]
}

await rm('dist', { recursive: true, force: true })
await build(browserOptions)
if (process.argv.includes('--watch')) {
  const browser = await context(browserOptions)
  const cli = await context(cliOptions)
  await browser.watch()
  await cli.watch()
  console.info('Watching CLI and Solid sources. Run node dist/index.js deck.md to serve.')
} else {
  await build(cliOptions)
}
