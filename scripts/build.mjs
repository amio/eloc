import { build, context } from 'esbuild'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const rawTextPlugin = {
  name: 'raw-text',
  setup (build) {
    build.onResolve({ filter: /.*/ }, args => {
      const isRawImport = args.path.endsWith('?raw') || args.suffix === '?raw'
      if (!isRawImport) return undefined

      const importPath = args.path.endsWith('?raw')
        ? args.path.slice(0, -'?raw'.length)
        : args.path

      return {
        namespace: 'raw-text',
        path: resolve(args.resolveDir, importPath)
      }
    })

    build.onLoad({ filter: /.*/, namespace: 'raw-text' }, async args => {
      const source = await readFile(args.path, 'utf8')

      return {
        contents: `export default ${JSON.stringify(source)}`,
        loader: 'js',
        watchFiles: [args.path]
      }
    })
  }
}

const options = {
  entryPoints: ['src/index.ts'],
  outdir: 'dist',
  platform: 'node',
  bundle: true,
  minify: true,
  logLevel: 'info',
  plugins: [rawTextPlugin]
}

if (process.argv.includes('--watch')) {
  const ctx = await context(options)
  await ctx.watch()
  console.info('Watching for changes...')
} else {
  await build(options)
}
