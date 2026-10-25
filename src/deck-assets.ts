import { isAbsolute, relative, resolve, dirname, basename, sep, posix } from 'node:path'

export interface DeckAssetOptions {
  include?: string | string[];
  css?: string | string[];
}

export interface ResolvedDeckAssets {
  markdownPath: string;
  rootDir: string;
  filename: string;
  source: string;
  css?: string;
  requiredFiles: string[];
  assetGlobs: string[];
}

const IMAGE_GLOBS = ['*.png', '*.svg', '*.gif', '*.jpg']

export function resolveDeckAssets (markdownFile: string, options: DeckAssetOptions = {}): ResolvedDeckAssets {
  const markdownPath = resolve(process.cwd(), markdownFile)
  const rootDir = dirname(markdownPath)
  const filename = basename(markdownPath)
  const markdownDirFromCwd = normalizePath(dirname(markdownFile))

  const css = normalizeCssReference(options.css, rootDir, markdownDirFromCwd)
  const includes = normalizeGlobList(options.include, rootDir, markdownDirFromCwd)
  const assetGlobs = unique([
    ...IMAGE_GLOBS,
    ...includes
  ])

  return {
    markdownPath,
    rootDir,
    filename,
    source: browserPath(filename),
    css: css?.reference,
    requiredFiles: unique([filename, css?.localPath].filter(isString)),
    assetGlobs
  }
}

export function assertPathInsideRoot (filePath: string, rootDir: string) {
  const relativePath = relative(rootDir, filePath)

  if (relativePath === '' || relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new Error(`Refusing to access "${filePath}" outside allowed directory "${rootDir}"`)
  }
}

function normalizeCssReference (css: string | string[] | undefined, rootDir: string, markdownDirFromCwd: string) {
  const cssValue = last(toArray(css))
  if (!cssValue) return undefined

  if (isExternalReference(cssValue)) {
    return { reference: cssValue }
  }

  const localPath = normalizeLocalPath(cssValue, rootDir, markdownDirFromCwd)
  return { reference: browserPath(localPath), localPath }
}

function normalizeGlobList (value: string | string[] | undefined, rootDir: string, markdownDirFromCwd: string): string[] {
  return toArray(value).map(item => {
    const negated = item.startsWith('!')
    const path = normalizeLocalPath(negated ? item.slice(1) : item, rootDir, markdownDirFromCwd)
    return negated ? `!${path}` : path
  })
}

function normalizeLocalPath (pattern: string, rootDir: string, markdownDirFromCwd: string): string {
  if (isExternalReference(pattern)) {
    throw new Error(`External URL is not supported as a local asset pattern: ${pattern}`)
  }

  if (isAbsolute(pattern)) {
    const relativePattern = normalizePath(relative(rootDir, pattern))
    assertRelativePatternInsideRoot(relativePattern, pattern, rootDir)
    return relativePattern
  }

  const strippedPattern = stripMarkdownDirPrefix(normalizePath(pattern), markdownDirFromCwd)
  assertRelativePatternInsideRoot(strippedPattern, pattern, rootDir)
  return posix.normalize(strippedPattern)
}

function browserPath (path: string): string {
  return `./${path.split('/').map(encodeURIComponent).join('/')}`
}

function assertRelativePatternInsideRoot (relativePattern: string, originalPattern: string, rootDir: string) {
  if (relativePattern === '' || relativePattern.split('/').includes('..')) {
    throw new Error(`Asset pattern "${originalPattern}" must stay inside deck asset root "${rootDir}"`)
  }
}

function stripMarkdownDirPrefix (pattern: string, markdownDirFromCwd: string): string {
  if (!markdownDirFromCwd || markdownDirFromCwd === '.') {
    return trimCurrentDirectoryPrefix(pattern)
  }

  const normalizedDir = trimCurrentDirectoryPrefix(markdownDirFromCwd).replace(/\/$/, '')
  const normalizedPattern = trimCurrentDirectoryPrefix(pattern)

  if (normalizedPattern === normalizedDir) {
    return ''
  }

  if (normalizedPattern.startsWith(`${normalizedDir}/`)) {
    return normalizedPattern.slice(normalizedDir.length + 1)
  }

  return normalizedPattern
}

function normalizePath (value: string): string {
  return value.replace(/\\/g, '/')
}

function trimCurrentDirectoryPrefix (value: string): string {
  return value.replace(/^\.\//, '')
}

function isExternalReference (value: string): boolean {
  return !/^[a-zA-Z]:[\\/]/.test(value) && (/^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('//'))
}

function toArray<T> (value: T | T[] | undefined): T[] {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

function last<T> (value: T[]): T | undefined {
  return value[value.length - 1]
}

function isString (value: unknown): value is string {
  return typeof value === 'string'
}

function unique<T> (values: T[]): T[] {
  return [...new Set(values)]
}
