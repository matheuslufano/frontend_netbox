import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/app/integracoes/blog/catalogUtils.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { articleAvailability, menuPosition, paginationPages } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

test('availability distinguishes the published snapshot from unpublished changes', () => {
  assert.equal(articleAvailability({ status: 'published', revision: 3, publishedRevision: 3 }).tone, 'success');
  assert.equal(articleAvailability({ status: 'published', revision: 4, publishedRevision: 3 }).tone, 'warning');
  assert.equal(articleAvailability({ status: 'draft' }).tone, 'muted');
  assert.equal(articleAvailability({ status: 'published', syncError: 'Falha real' }).detail, 'Falha real');
});
test('context menu remains inside the viewport at corners and with oversized menus', () => {
  assert.deepEqual(menuPosition(995, 695, 216, 280, 1000, 700), { left: 776, top: 412 });
  assert.deepEqual(menuPosition(-30, -20, 216, 280, 1000, 700), { left: 8, top: 8 });
  assert.deepEqual(menuPosition(100, 100, 216, 280, 200, 240), { left: 8, top: 8 });
});
test('pagination keeps current neighbours and boundaries without expanding the whole range', () => {
  assert.deepEqual(paginationPages(1, 0), []);
  assert.deepEqual(paginationPages(1, 1), [1]);
  assert.deepEqual(paginationPages(50, 100000), [1,49,50,51,100000]);
  assert.deepEqual(paginationPages(3, 3), [1,2,3]);
});
