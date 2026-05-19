/// <reference types="node" />
import { execFile } from 'node:child_process';
import { readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { test, expect } from '@playwright/test';

const execFileAsync = promisify(execFile);
const BUILD_OUT_DIR = 'test-results/cli-build-output';

test.describe('Eloc CLI build', () => {
  test.beforeEach(async () => {
    await rm(BUILD_OUT_DIR, { recursive: true, force: true });
  });

  test.afterEach(async () => {
    await rm(BUILD_OUT_DIR, { recursive: true, force: true });
  });

  test('exports a self-contained deck with configured assets', async () => {
    await execFileAsync(process.execPath, [
      'dist/index.js',
      'build',
      'tests/e2e/fixtures/build-deck.md',
      '--out-dir',
      BUILD_OUT_DIR,
      '--include',
      'assets/**',
      '--css',
      'custom.css',
      '--title',
      'E2E Build',
      '--dark',
      '--progress-bar',
    ], { cwd: process.cwd() });

    const indexHTML = await readFile(join(BUILD_OUT_DIR, 'index.html'), 'utf8');

    const deckTag = indexHTML.match(/<markdown-deck\b[^>]*>/)?.[0] ?? '';

    expect(indexHTML).toContain('<title>E2E Build</title>');
    expect(indexHTML).toContain('|| "build-deck.md"');
    expect(deckTag).toContain('css="custom.css"');
    expect(deckTag).toContain('progressBar');
    expect(deckTag).toContain('invert');
    expect(deckTag).toContain('hotkey');
    expect(deckTag).toContain('hashsync');

    await expectFileToMatch(join(BUILD_OUT_DIR, 'build-deck.md'), /# Build deck/);
    await expectFileToMatch(join(BUILD_OUT_DIR, 'custom.css'), /rgb\(12, 34, 56\)/);
    await expectFileToMatch(join(BUILD_OUT_DIR, 'diagram.svg'), /<circle/);
    await expectFileToMatch(join(BUILD_OUT_DIR, 'assets/notes.txt'), /included by --include/);
  });
});

async function expectFileToMatch(path: string, expected: RegExp) {
  await stat(path);
  expect(await readFile(path, 'utf8')).toMatch(expected);
}
