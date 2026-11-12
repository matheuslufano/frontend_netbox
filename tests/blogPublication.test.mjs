import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/app/integracoes/blog/articlePublication.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { updatePublishedArticles } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
const article = (id, status = 'published') => ({ id, title: id, status, revision: 7 });

test('bulk publication reads every page before writes, deduplicates and preserves non-published records', async () => {
  const calls = [];
  const progress = [];
  const api = {
    list: async params => {
      assert.deepEqual(params, { status: 'published', sort: 'createdAt', pageSize: 48, page: params.page });
      calls.push(`read:${params.page}`);
      return { pages: 2, items: params.page === 1 ? [article('a'), article('draft', 'draft')] : [article('a'), article('b'), article('demo', 'demo'), article('archive', 'archived')] };
    },
    publish: async (item, action) => { assert.equal(action, 'publish'); assert.equal(item.revision, 7); calls.push(`write:${item.id}`); return item; },
  };
  const result = await updatePublishedArticles(api, value => progress.push(value));
  assert.deepEqual(calls, ['read:1', 'read:2', 'write:a', 'write:b']);
  assert.equal(result.updated, 2);
  assert.deepEqual(progress.at(-1), { completed: 2, total: 2 });
});

test('revision conflicts are reported without retry or overwrite and other articles continue', async () => {
  const conflict = { response: { status: 409 } };
  const writes = [];
  const result = await updatePublishedArticles({
    list: async () => ({ pages: 1, items: [article('a'), article('b')] }),
    publish: async item => { writes.push(item.id); if (item.id === 'a') throw conflict; return item; },
  }, () => {});
  assert.deepEqual(writes, ['a', 'b']);
  assert.equal(result.updated, 1);
  assert.equal(result.failures[0].reason, conflict);
  assert.equal(result.interrupted, false);
});

test('authorization failure stops the remaining publications and reports partial completion', async () => {
  const writes = [];
  const result = await updatePublishedArticles({
    list: async () => ({ pages: 1, items: [article('a'), article('b'), article('c')] }),
    publish: async item => { writes.push(item.id); if (item.id === 'b') throw { response: { status: 403 } }; return item; },
  }, () => {});
  assert.deepEqual(writes, ['a', 'b']);
  assert.equal(result.updated, 1);
  assert.equal(result.total, 3);
  assert.equal(result.interrupted, true);
});

test('a failed later page prevents any publication', async () => {
  let writes = 0;
  await assert.rejects(updatePublishedArticles({
    list: async ({ page }) => { if (page === 2) throw new Error('offline'); return { pages: 2, items: [article('a')] }; },
    publish: async item => { writes++; return item; },
  }, () => {}), /offline/);
  assert.equal(writes, 0);
});

test('an empty catalog produces a zero result without mutations', async () => {
  const result = await updatePublishedArticles({
    list: async () => ({ pages: 0, items: [] }),
    publish: async () => assert.fail('unexpected publication'),
  }, () => {});
  assert.deepEqual(result, { updated: 0, failures: [], total: 0, interrupted: false });
});
