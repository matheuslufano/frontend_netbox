const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const modules = new Map();
function load(name) {
  if (modules.has(name)) return modules.get(name);
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/notifications', `${name}.ts`), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', compiled)((id) => id.startsWith('./') ? load(id.replace('./', '')) : require(id), module, module.exports);
  modules.set(name, module.exports);
  return module.exports;
}
const storage = new Map();
global.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v) };
const { notificationRepository: repo, sessionOwner } = load('repository');
const item = (id, extra = {}) => ({ id: String(id), type:'success', context:'user-created', title:'Private name', message:'Sensitive details', metadata:{ secret:'secret' }, read:false, createdAt:new Date(1700000000000 + id * 1000).toISOString(), ...extra });

test('history survives reload, strips personal content and isolates accounts', () => {
  storage.clear(); repo.save('1', [item(1)]);
  assert.equal(repo.load('1').length, 1);
  assert.equal(repo.load('2').length, 0);
  const serialized = storage.get('netbox:notifications:v1:1');
  assert.ok(!serialized.includes('Private') && !serialized.includes('Sensitive') && !serialized.includes('secret'));
  assert.equal(repo.load('1')[0].title, 'Usuário criado');
});
test('retention, descending order and duplicate IDs', () => {
  storage.clear();
  storage.set('netbox:notifications:v1:1', JSON.stringify([...Array.from({length:210}, (_, i) => item(i)), item(209)]));
  const loaded = repo.load('1'); assert.equal(loaded.length,200); assert.equal(loaded[0].id,'209');
  assert.equal(new Set(loaded.map(n => n.id)).size,200);
});
test('read status persists and deletion removes history entry', () => {
  repo.save('1', [item(1,{read:true,readAt:new Date().toISOString()})]);
  assert.equal(repo.load('1')[0].read,true);
  repo.save('1', []); assert.equal(repo.load('1').length,0);
});
test('malformed storage exposes recoverable error; invalid rows and unsafe destinations are rejected', () => {
  storage.set('netbox:notifications:v1:1','broken'); assert.throws(() => repo.load('1'));
  storage.set('netbox:notifications:v1:1',JSON.stringify([item(1,{href:'javascript:alert(1)'}),item(2,{context:'__proto__'}),item(3,{createdAt:'bad'})]));
  assert.equal(repo.load('1').length,1); assert.equal(repo.load('1')[0].href,'/configuracoes?section=usuarios');
});
test('API mutations use one loading toast and update it after confirmation', () => {
  storage.clear(); localStorage.setItem('afiliados_netbox_token','test'); localStorage.setItem('afiliados_netbox_user',JSON.stringify({id:1}));
  assert.equal(sessionOwner(),'1');
  const received=[]; global.CustomEvent = class { constructor(type, init) { this.type=type; this.detail=init.detail; } }; global.window={dispatchEvent:e => received.push(e)};
  const { beginApiNotification, notifyApiSuccess } = load('apiNotifications');
  const id = beginApiNotification('post','/users');
  notifyApiSuccess('post','/users','1',id);
  assert.equal(received.length,2);
  assert.equal(received[0].detail.action,'show');
  assert.equal(received[1].detail.action,'update');
  assert.equal(received[1].detail.id,id);
  assert.equal(received[1].detail.notification.persist,true);
  assert.equal(received[1].detail.notification.context,'user-created');
  assert.equal(beginApiNotification('get','/users'),null);
  storage.delete('afiliados_netbox_token'); assert.equal(sessionOwner(),null);
});

test('friendly errors never expose technical implementation details', () => {
  const axios = require('axios');
  const { getFriendlyErrorMessage } = load('getFriendlyErrorMessage');
  const network = new axios.AxiosError('ECONNREFUSED');
  assert.match(getFriendlyErrorMessage(network, 'Não foi possível salvar.'), /conexão/);
  assert.doesNotMatch(getFriendlyErrorMessage(network, 'Não foi possível salvar.'), /ECONN/);
  const server = new axios.AxiosError('Request failed with status code 500', undefined, undefined, {}, { status:500, data:{message:'Prisma error'}, statusText:'Internal Server Error', headers:{}, config:{} });
  assert.match(getFriendlyErrorMessage(server, 'Não foi possível salvar.'), /temporariamente indisponível/);
  assert.doesNotMatch(getFriendlyErrorMessage(server, 'Não foi possível salvar.'), /Prisma|500/);
});

test('notification policy enforces contextual defaults, four visible items and seven seconds maximum', () => {
  const policy = load('policy');
  assert.equal(policy.MAX_VISIBLE_NOTIFICATIONS, 4);
  assert.equal(policy.clampNotificationDuration(30_000, 'error'), 7_000);
  assert.equal(policy.clampNotificationDuration(undefined, 'success'), 4_000);
  assert.equal(policy.clampNotificationDuration(undefined, 'automation'), 5_000);
  assert.equal(policy.clampNotificationDuration(undefined, 'warning'), 6_000);
  assert.equal(policy.clampNotificationDuration(-5, 'info'), 1_500);
});

test('toast styles include liquid glass, dark mode, hover pause support and reduced motion', () => {
  const css = fs.readFileSync(path.join(__dirname, '../src/components/systemNotifications.module.css'), 'utf8');
  const provider = fs.readFileSync(path.join(__dirname, '../src/components/SystemNotificationProvider.tsx'), 'utf8');
  assert.match(css, /backdrop-filter:\s*blur\(22px\)\s+saturate\(165%\)/);
  assert.match(css, /data-theme="dark"/);
  assert.match(css, /animation-play-state:\s*paused/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(provider, /onMouseEnter=\{pause\}/);
  assert.match(provider, /aria-label="Fechar notificação"/);
  assert.match(provider, /aria-live=\{toast\.type === "error" \? "assertive" : "polite"\}/);
});

test('every configured destination is an existing application page', () => {
  const { events } = load('repository');
  for (const [, href] of Object.values(events)) {
    if (!href) continue;
    const page = path.join(__dirname, '../src/app', href.split('?')[0], 'page.tsx');
    assert.ok(fs.existsSync(page), `Missing destination: ${href}`);
  }
});
