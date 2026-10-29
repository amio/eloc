import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { test, expect } from './test'

const exec = promisify(execFile)

test('the bundled CLI prints help and the package version', async () => {
  for (const args of [[], ['--help'], ['-h']]) {
    const result = await exec(process.execPath, ['dist/index.js', ...args])
    expect(result.stdout).toContain('Usage')
    expect(result.stderr).toBe('')
  }
  const { version } = JSON.parse(await readFile('package.json', 'utf8'))
  for (const flag of ['--version', '-v']) {
    const result = await exec(process.execPath, ['dist/index.js', flag])
    expect(result.stdout.trim()).toBe(version)
    expect(result.stderr).toBe('')
  }
})

test('the bundled CLI reports core failures with exit code 1 and a concise error', async () => {
  for (const [args, message] of [
    [['deck.md', '--port', 'invalid'], 'Invalid --port'],
    [['build', 'missing-deck.md'], 'ENOENT']
  ] as const) {
    const result = await exec(process.execPath, ['dist/index.js', ...args]).catch(error => error)
    expect(result).toMatchObject({ code: 1, stdout: '', stderr: expect.stringContaining(message) })
    expect(result.stderr).not.toContain('at main')
  }
})
