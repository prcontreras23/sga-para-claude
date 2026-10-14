// Consultas de solo lectura a SGA por la API de Supabase (PostgREST), con el token
// de la persona. Solo GET: este programa no tiene forma de escribir.

import { TABLAS as TODAS } from './tablas.js';
import { SUPABASE_URL, PUBLISHABLE_KEY, tokenVigente } from './sesion.js';

export class SinSesion extends Error {}

function citar(v) {
  return `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

function valorFiltro(op, valor) {
  if (op === 'in') {
    const lista = Array.isArray(valor) ? valor : String(valor).split(',').map((s) => s.trim());
    return `in.(${lista.map(citar).join(',')})`;
  }
  if (op === 'cs') {
    const lista = Array.isArray(valor) ? valor : String(valor).split(',').map((s) => s.trim());
    return `cs.{${lista.map(citar).join(',')}}`;
  }
  if (op === 'is') {
    const v = String(valor).toLowerCase();
    if (!['null', 'true', 'false'].includes(v)) throw new Error('El operador "is" solo acepta null, true o false.');
    return `is.${v}`;
  }
  if (op === 'like' || op === 'ilike') return `${op}.${String(valor).replace(/%/g, '*')}`;
  return `${op}.${valor}`;
}

function validarColumna(TABLAS, tabla, col, para) {
  if (!TABLAS[tabla].columnas.includes(col)) {
    throw new Error(`La columna "${col}" no está disponible en ${tabla} (${para}). Columnas: ${TABLAS[tabla].columnas.join(', ')}`);
  }
}

export async function consultar({ tabla, columnas, filtros = [], orden, limite = 100, desde = 0, contar = false }, TABLAS = TODAS) {
  const def = TABLAS[tabla];
  if (!def) throw new Error(`Tabla no disponible: ${tabla}`);

  const cols = columnas?.length ? columnas : (def.por_defecto || def.columnas);
  cols.forEach((c) => validarColumna(TABLAS, tabla, c, 'columnas'));

  const q = new URLSearchParams();
  q.set('select', cols.join(','));
  for (const f of filtros) {
    validarColumna(TABLAS, tabla, f.columna, 'filtros');
    q.append(f.columna, (f.negar ? 'not.' : '') + valorFiltro(f.operador, f.valor));
  }
  if (orden?.length) {
    orden.forEach((o) => validarColumna(TABLAS, tabla, o.columna, 'orden'));
    q.set('order', orden.map((o) => `${o.columna}.${o.descendente ? 'desc' : 'asc'}.nullslast`).join(','));
  } else if (def.orden) {
    q.set('order', def.orden);
  }
  const lim = Math.min(Math.max(1, limite), 1000);
  q.set('limit', String(lim));
  if (desde) q.set('offset', String(desde));

  const url = `${SUPABASE_URL}/rest/v1/${def.tabla || tabla}?${q}`;

  for (let intento = 0; intento < 2; intento++) {
    const token = await tokenVigente();
    if (!token) throw new SinSesion();
    const r = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        ...(def.esquema ? { 'Accept-Profile': def.esquema } : {}),
        ...(contar ? { Prefer: 'count=exact' } : {}),
      },
    });
    if (r.status === 401 && intento === 0) continue;
    const d = await r.json().catch(() => null);
    if (!r.ok) {
      if (r.status === 401 || r.status === 403 || d?.code === '42501') {
        throw new Error(`Su usuario de SGA no tiene permiso para consultar ${tabla}.`);
      }
      throw new Error(d?.message ? `${d.message}${d.hint ? ` (${d.hint})` : ''}` : `Error ${r.status} al consultar ${tabla}`);
    }
    const total = contar ? Number((r.headers.get('content-range') || '').split('/')[1]) : undefined;
    return { tabla, filas: d, cantidad: d.length, total, limite: lim, desde };
  }
  throw new SinSesion();
}

export async function miPerfil(user_id) {
  const token = await tokenVigente();
  if (!token) throw new SinSesion();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user_id)}&select=activo,permisos`, {
    headers: { apikey: PUBLISHABLE_KEY, Authorization: `Bearer ${token}` },
  });
  const d = await r.json().catch(() => []);
  return r.ok && d[0] ? d[0] : null;
}
