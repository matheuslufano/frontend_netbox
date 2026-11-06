import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/app/integracoes/blog/trailer.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { isSupportedTrailerUrl } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

test('accepts the YouTube destinations understood by the real slide player and optional removal', () => {
  for (const value of ['', '  ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=12', 'https://youtu.be/dQw4w9WgXcQ?si=share']) assert.equal(isSupportedTrailerUrl(value), true, value);
});
test('rejects executable, misleading, unsupported and malformed trailer links', () => {
  for (const value of ['javascript:alert(1)', 'http://youtu.be/dQw4w9WgXcQ', 'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ', 'https://vimeo.com/123456789', 'https://youtube.com/watch?v=bad', 'https://youtu.be/', 'not a URL']) assert.equal(isSupportedTrailerUrl(value), false, value);
});
