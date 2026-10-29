import { readFile, writeFile } from 'node:fs/promises'

const path = 'public/index.html'
const html = await readFile(path, 'utf8')
const updated = html.replace(/(<script id="eloc-config" type="application\/json">)(.*?)(<\/script>)/, (_, open, json, close) => {
  const config = JSON.parse(json)
  config.mode = 'site'
  return open + JSON.stringify(config).replace(/</g, '\\u003c') + close
})
if (updated === html) throw new Error('Site configuration not found')
await writeFile(path, updated)
