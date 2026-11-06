import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/app/integracoes/blog/imageCatalog.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { imageCatalog } = await import('data:text/javascript;base64,' + Buffer.from(output).toString('base64'));
test('category slugs route HQs and games to the correct catalog while retaining TMDB', () => {
  for (const category of ['hqs', 'HQ', 'quadrinhos']) assert.equal(imageCatalog(category), 'metron');
  for (const category of ['games', 'jogos']) assert.equal(imageCatalog(category), 'igdb');
  for (const category of ['filmes', 'series', '', 'tecnologia']) assert.equal(imageCatalog(category), 'tmdb');
});
