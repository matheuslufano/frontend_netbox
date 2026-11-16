import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/app/integracoes/blog/richDocument.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { toDocument, documentSections, documentHtml, safeHref, videoSource } = await import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));

test('legacy paragraphs, headings, lists, links and images survive conversion without mutating the article', () => {
  const legacy = [{ heading: 'Título', level: 3, paragraphs: ['Primeiro', 'Segundo'], list: ['Item'], link: { href: 'https://example.org', label: 'Fonte' }, image: { src: '/blog/image.webp', alt: 'Imagem' } }];
  const before = structuredClone(legacy);
  const blocks = toDocument(legacy);
  assert.deepEqual(blocks.map(b => b.type), ['heading', 'paragraph', 'paragraph', 'list-item', 'paragraph', 'image']);
  assert.deepEqual(legacy, before);
  const saved = documentSections(blocks);
  assert.deepEqual(saved[0].paragraphs, ['Título', 'Primeiro', 'Segundo', 'Item', 'Fonte']);
  assert.deepEqual(toDocument(saved), blocks);
});
test('internal links survive legacy conversion and editor rendering', () => {
  for (const href of ['/site/blog/wifi-5-e-wifi-6', '/site#planos-netbox', '/site/blog?categoria=hqs']) {
    const blocks = toDocument([{ heading: '', paragraphs: [], link: { label: 'Leia mais', href } }]);
    assert.ok(documentHtml(blocks, src => src).includes(`href="${href}"`));
    assert.equal(safeHref(href, true), href);
  }
  for (const href of ['//example.org', '/\\example.org', 'javascript:alert(1)', '/bad path']) assert.equal(safeHref(href, true), '');
});

test('editable HTML escapes text and URLs and retains supported formatting', () => {
  const html = documentHtml([{ type: 'paragraph', content: [{ text: '<script>alert(1)</script>', bold: true, href: 'javascript:alert(1)' }, { text: 'Fonte', font: 'serif', italic: true }] }, { type: 'image', src: '/blog/image.webp', alt: '"><svg onload=alert(1)>' }], src => 'https://example.org' + src);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('<svg'));
  assert.ok(!html.includes('javascript:'));
  assert.ok(html.includes('<strong>'));
  assert.ok(html.includes('font-family:Georgia'));
});
test('only supported video hosts and web protocols are embedded', () => {
  assert.equal(videoSource('https://youtu.be/dQw4w9WgXcQ'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
  assert.equal(videoSource('https://vimeo.com/123456'), 'https://player.vimeo.com/video/123456');
  assert.equal(videoSource('https://example.org/video.mp4'), 'https://example.org/video.mp4');
  assert.equal(videoSource('https://youtube.com.evil.example/embed/dQw4w9WgXcQ'), '');
  assert.equal(videoSource('javascript:alert(1)'), '');
  assert.equal(safeHref('//example.org/asset', true), '');
});

test('media layout is serialized safely and keeps document order', () => {
  const blocks = [{ type: 'video', src: 'https://example.org/clip.mp4', width: 45, align: 'right' }, { type: 'paragraph', content: [{ text: 'Entre as mídias' }] }, { type: 'image', src: '/blog/image.webp', alt: 'Imagem', width: 60, align: 'left' }];
  const html = documentHtml(blocks, src => src);
  assert.ok(html.includes('data-width="45" data-align="right"'));
  assert.ok(html.includes('width:45%;margin-left:auto;margin-right:0'));
  assert.ok(html.includes('width:60%;margin-left:0;margin-right:auto'));
  assert.ok(html.indexOf('data-media="video"') < html.indexOf('Entre as mídias'));
  assert.ok(html.indexOf('Entre as mídias') < html.indexOf('data-media="image"'));
  const malformed = documentHtml([{ ...blocks[0], width: '20;position:fixed', align: 'bad" onclick="bad()' }], src => src);
  assert.ok(malformed.includes('data-width="100" data-align="center"'));
  assert.ok(!malformed.includes('onclick'));
});
