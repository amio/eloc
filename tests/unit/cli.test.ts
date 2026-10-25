import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCommand } from '../../src/cli.ts'

for (const [args, kind, file] of [
  [['deck.md'], 'serve', 'deck.md'],
  [['open', 'new.md'], 'serve', 'new.md'],
  [['build', 'deck.md'], 'build', 'deck.md'],
  [['--', '-deck.md'], 'serve', '-deck.md'],
  [['build'], 'serve', 'build']
] as const) {
  test(`dispatches ${args.join(' ')}`, () => {
    const command = parseCommand([...args])
    assert.equal(command.kind, kind)
    assert.ok('file' in command)
    assert.equal(command.file, file)
    if (args[0] === 'open' && command.kind === 'serve') assert.equal(command.options.open, true)
  })
}

for (const args of [[], ['unknown', 'deck.md'], ['-h'], ['--help', '--version', 'deck.md']]) {
  test(`shows help for ${JSON.stringify(args)}`, () => {
    assert.deepEqual(parseCommand(args), { kind: 'help' })
  })
}

for (const flag of ['-v', '--version']) {
  test(`shows version for ${flag}`, () => {
    assert.deepEqual(parseCommand([flag, 'deck.md']), { kind: 'version' })
  })
}

for (const flags of [
  ['-o', 'output', '-i', 'assets/**', '-c', 'theme.css', '-t', 'Deck title', '-p', '5100', '-q', '-d', '-b'],
  ['--out-dir', 'output', '--include', 'assets/**', '--css', 'theme.css', '--title', 'Deck title', '--port', '5100', '--quiet', '--dark', '--progress-bar']
]) {
  test(`parses ${flags[0]} and the remaining documented options`, () => {
    const command = parseCommand(['build', 'deck.md', ...flags])
    assert.equal(command.kind, 'build')
    if (command.kind !== 'build') return
    for (const [name, value] of Object.entries({ 'out-dir': 'output', include: 'assets/**', css: 'theme.css', title: 'Deck title', port: 5100, quiet: true, dark: true, 'progress-bar': true })) {
      assert.equal((command.options as Record<string, unknown>)[name], value)
    }
  })
}

test('preserves repeated include/CSS flags, numeric strings, equals syntax, and boolean negation', () => {
  const command = parseCommand(['build', 'deck.md', '--include', '*.txt', '--include', '!secret.txt', '--css', 'first.css', '--css', 'last.css', '--title=123', '--no-dark'])
  assert.equal(command.kind, 'build')
  if (command.kind !== 'build') return
  assert.deepEqual(command.options.include, ['*.txt', '!secret.txt'])
  assert.deepEqual(command.options.css, ['first.css', 'last.css'])
  assert.equal(command.options.title, '123')
  assert.equal(command.options.dark, false)
})

test('preserves the order of repeated short and long aliases', () => {
  const command = parseCommand(['build', 'deck.md', '-i', 'assets/**', '--include', '!secret.txt', '-i=*.txt', '--css', 'first.css', '-c', 'last.css', '-qdb'])
  assert.equal(command.kind, 'build')
  if (command.kind !== 'build') return
  assert.deepEqual(command.options.include, ['assets/**', '!secret.txt', '*.txt'])
  assert.deepEqual(command.options.css, ['first.css', 'last.css'])
  assert.equal(command.options.dark, true)
  assert.equal(command.options['progress-bar'], true)
  assert.equal((command.options as Record<string, unknown>).quiet, true)
  assert.equal(parseCommand(['--', '-db']).kind, 'serve')
})
