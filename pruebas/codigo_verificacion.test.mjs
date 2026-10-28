// Prueba del paso del código de verificación (28 oct 2026) con Supabase simulado.
// No toca el llavero real ni SDA+. Uso: node --test --experimental-test-module-mocks pruebas/
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

const guardado = { v: null };
// Que la prueba no abra el navegador de verdad.
mock.module('node:child_process', { namedExports: { spawn: () => ({ unref() {} }) } });
mock.module('@napi-rs/keyring', { namedExports: { Entry: class {
  getPassword() { return guardado.v; } setPassword(v) { guardado.v = v; } deletePassword() { guardado.v = null; }
} } });

// Supabase simulado: «pide» decide si la cuenta pide código; «factor» si ya lo activó.
const est = { pide: true, factor: true, codigoBueno: '123456', llamadas: [] };
const jwt = (aal) => `x.${Buffer.from(JSON.stringify({ aal })).toString('base64url')}.y`;
const aalDe = (h) => JSON.parse(Buffer.from(String(h).split(' ')[1].split('.')[1], 'base64url')).aal;
const sesion = (aal) => ({ access_token: jwt(aal), refresh_token: 'r-' + aal, expires_in: 3600, user: { id: 'u1', email: 'a@b.org' } });
const resp = (status, cuerpo) => new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });
const fetchReal = globalThis.fetch;
globalThis.fetch = async (url, op = {}) => {
  const u = String(url);
  if (u.startsWith('http://127.0.0.1')) return fetchReal(url, op);
  est.llamadas.push(u.replace(/^https:\/\/[^/]+/, ''));
  if (u.includes('/token?grant_type=password')) return resp(200, sesion('aal1'));
  if (u.includes('/token?grant_type=refresh_token')) return resp(200, sesion(JSON.parse(op.body).refresh_token === 'r-aal2' ? 'aal2' : 'aal1'));
  if (u.includes('/rpc/dos_pasos_estado')) return resp(200, { requiere: est.pide, aal: aalDe(op.headers.Authorization) });
  if (u.endsWith('/auth/v1/user')) return resp(200, { factors: est.factor ? [{ id: 'f1', factor_type: 'totp', status: 'verified' }] : [] });
  if (u.endsWith('/factors/f1/challenge')) return resp(200, { id: 'c1' });
  if (u.endsWith('/factors/f1/verify')) {
    const b = JSON.parse(op.body);
    return b.code === est.codigoBueno && b.challenge_id === 'c1' ? resp(200, sesion('aal2')) : resp(422, { error_code: 'mfa_verification_failed', msg: 'Invalid TOTP code entered' });
  }
  throw new Error('llamada no esperada ' + u);
};

const { iniciarSesion, tokenVigente, borrarSesion } = await import('../src/sesion.js');
const enviar = (url, datos) => fetchReal(url, { method: 'POST', body: new URLSearchParams(datos), redirect: 'manual' });

async function entrar(pasos) {
  let url;
  const p = iniciarSesion({ avisar: (u) => { url = u; }, minutos: 1 });
  while (!url) await new Promise((r) => setTimeout(r, 10));
  const r1 = await enviar(url, { email: 'a@b.org', password: 'x', captcha: 'tok' });
  const t1 = r1.status === 303 ? null : await r1.text();
  return { p, url, r1, t1 };
}

test('cuenta que no pide código: entra con la contraseña sola', async () => {
  borrarSesion(); est.pide = false; est.llamadas = [];
  const { p, t1 } = await entrar();
  assert.match(t1, /Listo/);
  assert.equal(aalDe('B ' + (await p).access_token), 'aal1');
  assert.ok(!est.llamadas.some((l) => l.includes('factors')));
});

test('cuenta que pide código: muestra la página del código, rechaza uno malo y entra con el bueno', async () => {
  borrarSesion(); est.pide = true; est.factor = true;
  const { p, url, t1 } = await entrar();
  assert.match(t1, /Código de verificación/);
  const malo = await (await enviar(url, { paso: 'codigo', codigo: '000000' })).text();
  assert.match(malo, /no es correcto o ya venció/);
  const corto = await (await enviar(url, { paso: 'codigo', codigo: '12' })).text();
  assert.match(corto, /6 dígitos/);
  const bueno = await (await enviar(url, { paso: 'codigo', codigo: '123 456' })).text();
  assert.match(bueno, /Listo/);
  const s = await p;
  assert.equal(aalDe('B ' + s.access_token), 'aal2');
  assert.match(guardado.v, /r-aal2/);
});

test('cuenta que pide código y no lo ha activado: avisa que lo active en SDA+', async () => {
  borrarSesion(); est.pide = true; est.factor = false;
  const { p, r1, url } = await entrar();
  assert.equal(r1.status, 303);
  assert.equal(guardado.v, null);
  // Se cierra la ventana entrando bien, para que las pruebas siguientes abran la suya.
  await enviar(url, { paso: 'sesion', refresh_token: 'r-aal2' });
  await p;
});

test('sesión guardada sin código en una cuenta que ahora lo pide: se borra para volver a entrar', async () => {
  borrarSesion(); est.pide = true;
  guardado.v = JSON.stringify({ refresh_token: 'r-aal1', email: 'a@b.org', user_id: 'u1' });
  assert.equal(await tokenVigente(), null);
  assert.equal(guardado.v, null);
});

test('sesión guardada con código: sigue funcionando al renovarse', async () => {
  borrarSesion(); est.pide = true;
  guardado.v = JSON.stringify({ refresh_token: 'r-aal2', email: 'a@b.org', user_id: 'u1' });
  const t = await tokenVigente();
  assert.equal(aalDe('B ' + t), 'aal2');
});

// ---- v0.7.0: la entrada se hace en la página de SDA+ y la sesión llega por POST ----
async function abrir() {
  let url;
  const p = iniciarSesion({ avisar: (u) => { url = u; }, minutos: 1 });
  while (!url) await new Promise((r) => setTimeout(r, 10));
  return { p, url };
}

test('v0.7.0: abre la página de entrada de SDA+ con v=2', async () => {
  borrarSesion(); est.pide = false;
  const { p, url } = await abrir();
  const r = await fetchReal(url, { redirect: 'manual' });
  assert.equal(r.status, 302);
  assert.match(r.headers.get('location'), /^https:\/\/sda\.adventistassureste\.org\/conector\/\?p=\d+&c=[0-9a-f]{32}&v=2$/);
  await enviar(url, { paso: 'sesion', refresh_token: 'r-aal1' });
  await p;
});

test('v0.7.0: sesión con código desde SDA+ → queda conectado con aal2', async () => {
  borrarSesion(); est.pide = true;
  const { p, url } = await abrir();
  const t = await (await enviar(url, { paso: 'sesion', refresh_token: 'r-aal2' })).text();
  assert.match(t, /Listo/);
  assert.equal(aalDe('B ' + (await p).access_token), 'aal2');
});

test('v0.7.0: sesión sin código en cuenta que lo pide → no se guarda y se puede reintentar', async () => {
  borrarSesion(); est.pide = true;
  const { p, url } = await abrir();
  const t = await (await enviar(url, { paso: 'sesion', refresh_token: 'r-aal1' })).text();
  assert.match(t, /No se pudo conectar/);
  assert.equal(guardado.v, null);
  // La misma ventana sigue abierta para intentarlo bien.
  assert.match(await (await enviar(url, { paso: 'sesion', refresh_token: 'r-aal2' })).text(), /Listo/);
  await p;
});

test('v0.7.0: SDA+ con la página anterior (vuelve con ?captcha) → sigue el formulario de aquí', async () => {
  borrarSesion(); est.pide = false;
  const { p, url } = await abrir();
  assert.match(await (await fetchReal(url + '?captcha=tok')).text(), /Contraseña/);
  assert.match(await (await enviar(url, { email: 'a@b.org', password: 'x', captcha: 'tok' })).text(), /Listo/);
  await p;
});
