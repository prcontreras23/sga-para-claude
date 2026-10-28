// Sesión de SDA+: inicio de sesión en el navegador, guardado en el almacén de
// credenciales del sistema (Administrador de credenciales en Windows, Llavero en
// Mac) y renovación automática del token. La contraseña nunca se guarda: solo el
// token de renovación que entrega SDA+, que se anula al desactivar al usuario.

import http from 'node:http';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { Entry } from '@napi-rs/keyring';
import { paginaEntrada, paginaListo } from './paginas.js';

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
  return {
    access_token: d.access_token,
    refresh_token: d.refresh_token,
    expira: Date.now() + (d.expires_in - 60) * 1000,
    email: d.user?.email,
    user_id: d.user?.id,
  };
}

// Devuelve un access_token vigente, o null si hay que iniciar sesión.
export async function tokenVigente() {
  if (enMemoria && Date.now() < enMemoria.expira) return enMemoria.access_token;
  const base = enMemoria || leerGuardada();
  if (!base?.refresh_token) return null;
  try {
    const s = await pedirToken('refresh_token', { refresh_token: base.refresh_token });
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
        const email = (f.get('email') || '').trim().toLowerCase();
        const password = f.get('password') || '';
        const captcha = f.get('captcha') || '';
        try {
          const s = await pedirToken('password', { email, password, gotrue_meta_security: { captcha_token: captcha } });
          guardar(s);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(paginaListo(s.email));
          terminar();
          resolve(s);
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
