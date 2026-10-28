// Sesión de SDA+: inicio de sesión en el navegador, guardado en el almacén de
// credenciales del sistema (Administrador de credenciales en Windows, Llavero en
// Mac) y renovación automática del token. La contraseña nunca se guarda: solo el
// token de renovación que entrega SDA+, que se anula al desactivar al usuario.

import http from 'node:http';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { Entry } from '@napi-rs/keyring';
import { paginaEntrada, paginaCodigo, paginaListo } from './paginas.js';

// Datos públicos de SDA+: los mismos que lleva la página de entrada de la app.
export const SUPABASE_URL = 'https://gvbknabnrlliofbchczv.supabase.co';
export const SITIO = 'https://sda.adventistassureste.org';
export const PUBLISHABLE_KEY = 'sb_publishable_Aq0D-OaqMzUbtGNLrTo4aQ_36xEH-vI';

const llavero = new Entry('sga-para-claude', 'sesion');

let enMemoria = null; // { access_token, refresh_token, expira, email, user_id }

function leerGuardada() {
  try {
    const txt = llavero.getPassword();
    return txt ? JSON.parse(txt) : null;
  } catch {
    return null;
  }
}

function guardar(s) {
  enMemoria = s;
  llavero.setPassword(JSON.stringify({ refresh_token: s.refresh_token, email: s.email, user_id: s.user_id }));
}

export function borrarSesion() {
  enMemoria = null;
  try { llavero.deletePassword(); } catch { /* no había */ }
}

async function llamarAuth(ruta, cuerpo, token) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/${ruta}`, {
    method: cuerpo === undefined ? 'GET' : 'POST',
    headers: { apikey: PUBLISHABLE_KEY, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(d.error_description || d.msg || d.message || `Error ${r.status}`);
    err.status = r.status;
    err.code = d.error_code || d.error;
    throw err;
  }
  return d;
}

// Desde el 28 oct 2026 toda cuenta de SDA+ que puede cambiar o aprobar algo entra
// con contraseña y un código de su app autenticadora (sesión «aal2»). Sin el código,
// SDA+ la trata como si no tuviera permisos. Esto dice si hace falta y con qué factor.
async function codigoPendiente(s) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/dos_pasos_estado`, {
    method: 'POST',
    headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!r.ok) throw new Error('No se pudo comprobar si su cuenta pide código de verificación.');
  const est = await r.json();
  if (!est?.requiere || est.aal === 'aal2') return null;
  const u = await llamarAuth('user', undefined, s.access_token);
  const factor = (u.factors || []).find((f) => f.factor_type === 'totp' && f.status === 'verified');
  return { factorId: factor?.id || null };
}

async function verificarCodigo(s, factorId, codigo) {
  const reto = await llamarAuth(`factors/${factorId}/challenge`, {}, s.access_token);
  return aSesion(await llamarAuth(`factors/${factorId}/verify`, { challenge_id: reto.id, code: codigo }, s.access_token));
}

function aSesion(d) {
  return {
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    expira: Date.now() + (d.expires_in - 60) * 1000,
    email: d.user?.email,
    user_id: d.user?.id,
  };
}

async function pedirToken(grant, cuerpo) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=${grant}`, {
    method: 'POST',
    headers: { apikey: PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = new Error(d.error_description || d.msg || d.message || `Error ${r.status}`);
    err.status = r.status;
    err.code = d.error_code || d.error;
    throw err;
  }
  return aSesion(d);
}

// Devuelve un access_token vigente, o null si hay que iniciar sesión.
export async function tokenVigente() {
  if (enMemoria && Date.now() < enMemoria.expira) return enMemoria.access_token;
  const base = enMemoria || leerGuardada();
  if (!base?.refresh_token) return null;
  try {
    const s = await pedirToken('refresh_token', { refresh_token: base.refresh_token });
    // Una sesión guardada antes de que su cuenta pidiera el código no ve nada en SDA+:
    // se borra para que la próxima consulta abra la entrada y pida el código. Si la
    // comprobación falla (red), se sigue: la base lo exige igual.
    if (await codigoPendiente(s).catch(() => null)) {
      borrarSesion();
      return null;
    }
    guardar(s);
    return s.access_token;
  } catch (e) {
    // Token vencido, revocado o usuario desactivado: hay que volver a entrar.
    if (e.status === 400 || e.status === 401 || e.status === 403) {
      borrarSesion();
      return null;
    }
    throw e;
  }
}

export function sesionActual() {
  return enMemoria || leerGuardada();
}

function abrirNavegador(url) {
  const [cmd, args] =
    process.platform === 'win32' ? ['cmd', ['/c', 'start', '""', url]]
    : process.platform === 'darwin' ? ['open', [url]]
    : ['xdg-open', [url]];
  try {
    spawn(cmd, args, { stdio: 'ignore', detached: true, windowsVerbatimArguments: process.platform === 'win32' }).unref();
  } catch { /* se muestra la dirección para abrirla a mano */ }
}

let entradaEnCurso = null;

// Abre la página de entrada en el navegador y espera a que la persona inicie sesión.
// La contraseña viaja del navegador a este programa (en la misma computadora) y de
// aquí directo a SDA+; no se guarda en ningún lado.
export function iniciarSesion({ avisar = () => {}, minutos = 5 } = {}) {
  if (entradaEnCurso) return entradaEnCurso;
  entradaEnCurso = new Promise((resolve, reject) => {
    const clave = crypto.randomBytes(16).toString('hex');
    let ultimo = {};
    let pendiente = null; // sesión con contraseña que espera el código: { s, factorId }
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname !== `/${clave}`) { res.writeHead(404).end(); return; }

      // SDA+ exige la comprobación de Turnstile para entrar. Esa comprobación se hace en una
      // página de SDA+, que vuelve aquí con ?captcha=<token>; cada token sirve una sola vez.
      if (req.method === 'GET') {
        const captcha = url.searchParams.get('captcha') || '';
        if (!captcha) {
          res.writeHead(302, { Location: `${SITIO}/conector/?p=${server.address().port}&c=${clave}` }).end();
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          .end(paginaEntrada({ ...ultimo, captcha }));
        return;
      }
      if (req.method !== 'POST') { res.writeHead(405).end(); return; }

      let cuerpo = '';
      req.on('data', (c) => { cuerpo += c; if (cuerpo.length > 10_000) req.destroy(); });
      req.on('end', async () => {
        const f = new URLSearchParams(cuerpo);
        const html = (pagina) => res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(pagina);
        const listo = (s) => { guardar(s); html(paginaListo(s.email)); terminar(); resolve(s); };

        // Segundo paso: el código de 6 dígitos de la app autenticadora.
        if (f.get('paso') === 'codigo') {
          if (!pendiente) { res.writeHead(303, { Location: `/${clave}` }).end(); return; }
          const codigo = (f.get('codigo') || '').replace(/\D/g, '');
          if (codigo.length !== 6) { html(paginaCodigo({ error: 'Escriba los 6 dígitos del código.' })); return; }
          try {
            listo(await verificarCodigo(pendiente.s, pendiente.factorId, codigo));
            pendiente = null;
          } catch (e) {
            html(paginaCodigo({ error: /invalid|expired/i.test(`${e.code} ${e.message}`)
              ? 'El código no es correcto o ya venció. Escriba el que aparece ahora.'
              : `No se pudo verificar el código: ${e.message}` }));
          }
          return;
        }

        const email = (f.get('email') || '').trim().toLowerCase();
        const password = f.get('password') || '';
        const captcha = f.get('captcha') || '';
        try {
          const s = await pedirToken('password', { email, password, gotrue_meta_security: { captcha_token: captcha } });
          const falta = await codigoPendiente(s);
          if (!falta) { listo(s); return; }
          if (!falta.factorId) {
            // El código se activa una sola vez en SDA+, que muestra el QR; aquí solo se pide.
            ultimo = { email, error: 'Su cuenta entra con contraseña y código de verificación, y todavía no lo ha activado. Entre primero a SDA+ en el navegador (sda.adventistassureste.org), active el código y vuelva a intentar aquí.' };
            res.writeHead(303, { Location: `/${clave}` }).end();
            return;
          }
          pendiente = { s, factorId: falta.factorId };
          html(paginaCodigo());
        } catch (e) {
          const msg = /captcha/i.test(`${e.code} ${e.message}`)
            ? 'No se pudo completar la comprobación de seguridad. Intente de nuevo.'
            : e.code === 'invalid_credentials' || e.status === 400
              ? 'El correo o la contraseña no son correctos. Use los mismos con los que entra a SDA+.'
              : `No se pudo iniciar sesión: ${e.message}`;
          // El token ya se gastó: se vuelve a la comprobación y luego al formulario con el aviso.
          ultimo = { error: msg, email };
          res.writeHead(303, { Location: `/${clave}` }).end();
        }
      });
    });

    const reloj = setTimeout(() => {
      terminar();
      reject(new Error('Se agotó el tiempo para iniciar sesión en SDA+.'));
    }, minutos * 60_000);

    function terminar() {
      clearTimeout(reloj);
      setTimeout(() => server.close(), 500);
      entradaEnCurso = null;
    }

    server.listen(0, '127.0.0.1', () => {
      const url = `http://127.0.0.1:${server.address().port}/${clave}`;
      avisar(url);
      abrirNavegador(url);
    });
  });
  return entradaEnCurso;
}
