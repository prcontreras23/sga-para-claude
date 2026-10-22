#!/usr/bin/env node
// sga-para-claude — conector MCP de solo lectura entre Claude y SDA+ (ADOSE).
//
//   sga-para-claude           servidor MCP completo (lo arranca Claude)
//   sga-para-claude directorio  servidor MCP solo con zonas, distritos, iglesias y personal
//   sga-para-claude entrar    iniciar sesión en SDA+
//   sga-para-claude estado    ver con qué usuario está conectado
//   sga-para-claude salir     borrar la sesión guardada

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { OPERADORES, tablasPara } from './src/tablas.js';
import { consultar, miPerfil, SinSesion } from './src/consulta.js';
import { iniciarSesion, sesionActual, borrarSesion, tokenVigente } from './src/sesion.js';

const comando = process.argv[2];

if (comando === 'entrar') {
  console.log('Se abrirá una página en su navegador para entrar a SDA+...');
  try {
    const s = await iniciarSesion({ avisar: (url) => console.log(`Si no se abre sola, copie esta dirección en el navegador:\n${url}`) });
    console.log(`Listo. Claude quedó conectado a SDA+ con el usuario ${s.email}.`);
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
} else if (comando === 'estado') {
  const token = await tokenVigente().catch(() => null);
  const s = sesionActual();
  console.log(token && s ? `Conectado a SDA+ como ${s.email}.` : 'No hay sesión de SDA+. Use: sga-para-claude entrar');
  process.exit(0);
} else if (comando === 'salir') {
  borrarSesion();
  console.log('Sesión de SDA+ borrada de esta computadora.');
  process.exit(0);
} else if (comando && comando !== 'directorio') {
  console.error(`Comando desconocido: ${comando}. Use entrar, estado, salir o directorio.`);
  process.exit(1);
}

// ── Servidor MCP ──────────────────────────────────────────────

const alcance = comando === 'directorio' ? 'directorio' : 'completo';
const TABLAS = tablasPara(alcance);
const MODULOS = [...new Set(Object.values(TABLAS).map((d) => d.modulo))];

const texto = (t) => ({ content: [{ type: 'text', text: t }] });
const json = (o) => texto(JSON.stringify(o, null, 2));

// Si no hay sesión, abre la página de entrada y espera un rato. Si la persona no
// termina a tiempo, la página sigue abierta y la siguiente consulta ya funciona.
async function conSesion(fn) {
  try {
    return await fn();
  } catch (e) {
    if (!(e instanceof SinSesion)) return { ...texto(`Error: ${e.message}`), isError: true };
    let url;
    const espera = iniciarSesion({ avisar: (u) => { url = u; } });
    const listo = await Promise.race([
      espera.then(() => true, () => false),
      new Promise((r) => setTimeout(() => r(false), 45_000)),
    ]);
    if (!listo) {
      return texto(
        'Para consultar SDA+ hay que iniciar sesión. Se abrió una página en el navegador: ' +
        'entre con el mismo correo y contraseña de SDA+ y luego repita la consulta.' +
        (url ? `\nSi la página no se abrió, use esta dirección: ${url}` : ''),
      );
    }
    try { return await fn(); } catch (e2) { return { ...texto(`Error: ${e2.message}`), isError: true }; }
  }
}

const server = new McpServer({ name: alcance === 'directorio' ? 'sga-directorio' : 'sga', version: '0.4.1' }, {
  instructions:
    'Conector de solo lectura a SDA+, el sistema oficial de ADOSE (Asociación Dominicana del Sureste): ' +
    (alcance === 'directorio'
      ? 'zonas, distritos, iglesias y personal (pastores, plantadores, oficina, departamentales y administradores) con sus teléfonos. '
      : 'iglesias, distritos, zonas, personal y RRHH, vacaciones y permisos, y actas de junta. ') +
    'También los formularios y sus respuestas, y los eventos con sus personas, programas y asistencia. ' +
    'Consulta con el usuario de SDA+ de la persona y solo ve lo que sus permisos le dejan ver. ' +
    'Para buscar a alguien y su teléfono use sga_buscar_persona. Para ver formularios use sga_formularios y sga_formulario_respuestas. Para las personas, el grupo y la asistencia de un evento use sga_evento_personas. Para lo demás, sga_tablas y luego sga_consultar. ' +
    'Las tablas se relacionan por códigos: pastores.cod = pastor_cod; distritos.cod = codDistrito; zonas.cod = codZona; iglesias.cod = iglesia_cod. ' +
    'No puede modificar nada en SDA+.',
});

server.registerTool('sga_buscar_persona', {
  title: 'Buscar persona en SDA+',
  description:
    'Busca personas del personal de ADOSE (pastores y empleados de oficina) por nombre, cargo, distrito o zona, ' +
    'y devuelve teléfono, extensión, correo, cargo, zona y distrito. Busca cada palabra por separado y no distingue mayúsculas.',
  inputSchema: {
    texto: z.string().min(2).describe('Nombre o parte del nombre, p. ej. "Noemí Vizcaíno" o "Vizcaino"'),
    campo: z.enum(['nombre', 'cargo', 'rol', 'distrito', 'zona']).default('nombre').describe('Dónde buscar. rol: pastor, plantador, oficina, departamental o administrador'),
    incluir_inactivos: z.boolean().default(false).describe('Incluir personas inhabilitadas'),
  },
  annotations: { readOnlyHint: true },
}, async ({ texto: t, campo, incluir_inactivos }) => conSesion(async () => {
  // El personal es corto: se trae completo y se filtra aquí, sin tildes ni
  // mayúsculas, para que «Noemi» encuentre «Noemí».
  const normal = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const palabras = normal(t).split(/\s+/).filter(Boolean);
  const r = await consultar({
    tabla: 'pastores',
    columnas: ['cod', 'nombre', 'cargo', 'rol', 'telefono', 'extension', 'email', 'zona', 'distrito', 'activo'],
    filtros: incluir_inactivos ? [] : [{ columna: 'activo', operador: 'is', valor: 'false', negar: true }],
    orden: [{ columna: 'nombre' }],
    limite: 1000,
  }, TABLAS);
  const filas = r.filas.filter((f) => palabras.every((p) => normal(f[campo]).includes(p)));
  if (!filas.length) return texto(`No encontré a nadie con "${t}" en ${campo}.`);
  return json(filas.slice(0, 50));
}));

server.registerTool('sga_tablas', {
  title: 'Tablas de SDA+',
  description: 'Lista las tablas de SDA+ que se pueden consultar, con su descripción y columnas. Úsela antes de sga_consultar.',
  inputSchema: {
    modulo: z.enum(MODULOS).optional().describe('Filtrar por módulo'),
  },
  annotations: { readOnlyHint: true },
}, async ({ modulo }) => {
  const lista = Object.entries(TABLAS)
    .filter(([, d]) => !modulo || d.modulo === modulo)
    .map(([nombre, d]) => ({ tabla: nombre, modulo: d.modulo, descripcion: d.descripcion, columnas: d.columnas, por_defecto: d.por_defecto || d.columnas }));
  return json(lista);
});

const filtroSchema = z.object({
  columna: z.string(),
  operador: z.enum(OPERADORES).describe('eq =, neq ≠, gt >, gte ≥, lt <, lte ≤, like/ilike (comodín *; ilike sin mayúsculas), is (null/true/false), in (lista), cs (el arreglo contiene)'),
  valor: z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number()]))]),
  negar: z.boolean().optional().describe('Invierte el filtro (NOT)'),
});

server.registerTool('sga_consultar', {
  title: 'Consultar SDA+',
  description:
    'Consulta una tabla de SDA+ en solo lectura, con filtros, orden y límite. Las fechas van en formato AAAA-MM-DD. ' +
    'Si no se indican columnas, devuelve las más útiles. Si una tabla devuelve vacío, puede ser que el usuario no tenga permiso para verla en SDA+.',
  inputSchema: {
    tabla: z.enum(Object.keys(TABLAS)),
    columnas: z.array(z.string()).optional(),
    filtros: z.array(filtroSchema).optional().describe('Se combinan con Y'),
    orden: z.array(z.object({ columna: z.string(), descendente: z.boolean().optional() })).optional(),
    limite: z.number().int().min(1).max(1000).default(100),
    desde: z.number().int().min(0).default(0).describe('Para paginar: cuántas filas saltar'),
    contar: z.boolean().default(false).describe('Devolver también el total de filas que cumplen los filtros'),
  },
  annotations: { readOnlyHint: true },
}, async (args) => conSesion(async () => {
  const r = await consultar(args, TABLAS);
  const nota = r.cantidad === 0
    ? 'Sin resultados. Si esperaba datos, puede ser que su usuario de SDA+ no tenga permiso para esta tabla.'
    : r.cantidad === r.limite ? `Se devolvieron ${r.limite} filas (el límite). Puede haber más: use "desde" o filtros.` : undefined;
  return json({ ...r, ...(nota ? { nota } : {}) });
}));

// ── Formularios ───────────────────────────────────────────────
const normal = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
// Trae todas las filas (de mil en mil). Si la persona no tiene permiso, la base devuelve vacío.
async function todas(tabla, args = {}) {
  const out = [];
  for (let desde = 0; desde < 50000; desde += 1000) {
    const r = await consultar({ ...args, tabla, limite: 1000, desde }, TABLAS);
    out.push(...r.filas);
    if (r.cantidad < 1000) break;
  }
  return out;
}
// Solo «sin permiso» cuenta como lista vacía. Una sesión vencida o un error de red se
// dejan pasar, para que se pida entrar de nuevo o se vea el error real (el 14 oct un
// error tragado aquí le dijo a Ribel que no tenía acceso a ningún formulario).
const sinPermisoVacio = (e) => { if (!(e instanceof SinSesion) && /no tiene permiso/.test(e.message)) return []; throw e; };
async function listaFormularios() {
  const [sga, evs, evf, rs, re] = await Promise.all([
    todas('formularios', { columnas: ['id', 'titulo', 'audiencia', 'estado', 'fecha_limite', 'created_at'] }).catch(sinPermisoVacio),
    todas('eventos', { columnas: ['id', 'nombre'] }).catch(sinPermisoVacio),
    todas('eventos_formularios', { columnas: ['id', 'evento_id', 'nombre', 'activo', 'cierra', 'created_at'] }).catch(sinPermisoVacio),
    todas('formularios_respuestas', { columnas: ['formulario_id'] }).catch(sinPermisoVacio),
    todas('eventos_formulario_respuestas', { columnas: ['formulario_id'] }).catch(sinPermisoVacio),
  ]);
  const cuenta = (xs, id) => xs.filter((r) => r.formulario_id === id).length;
  return [
    ...sga.map((f) => ({ id: f.id, origen: 'sga', nombre: f.titulo, estado: f.estado, audiencia: f.audiencia, fecha_limite: f.fecha_limite, respuestas: cuenta(rs, f.id), creado: f.created_at })),
    ...evf.map((f) => ({ id: f.id, origen: 'evento', nombre: f.nombre, evento: evs.find((e) => e.id === f.evento_id)?.nombre ?? null, estado: f.activo ? 'activo' : 'inactivo', cierra: f.cierra, respuestas: cuenta(re, f.id), creado: f.created_at })),
  ];
}

server.registerTool('sga_formularios', {
  title: 'Formularios de SDA+',
  description:
    'Lista los formularios que el usuario puede ver: los del módulo Formularios de SDA+ (origen "sga") y los de los eventos (origen "evento"), ' +
    'con estado y cantidad de respuestas. Use el id con sga_formulario_respuestas.',
  inputSchema: {
    texto: z.string().optional().describe('Filtrar por parte del nombre del formulario o del evento'),
  },
  annotations: { readOnlyHint: true },
}, async ({ texto: t }) => conSesion(async () => {
  let xs = await listaFormularios();
  if (t) { const ps = normal(t).split(/\s+/).filter(Boolean); xs = xs.filter((f) => ps.every((p) => normal(`${f.nombre} ${f.evento || ''}`).includes(p))); }
  if (!xs.length) return texto(t ? `No encontré formularios con "${t}" que su usuario pueda ver.` : 'Su usuario de SDA+ no tiene acceso a ningún formulario.');
  return json(xs);
}));

server.registerTool('sga_formulario_respuestas', {
  title: 'Respuestas de un formulario',
  description:
    'Devuelve las respuestas de un formulario (de SDA+ o de un evento) con el texto de cada pregunta como nombre de columna, ' +
    'más la fecha de envío y, si aplica, distrito, pastor o quien envió. Acepta el id o parte del nombre del formulario.',
  inputSchema: {
    formulario: z.string().min(2).describe('Id del formulario (de sga_formularios) o parte de su nombre'),
    limite: z.number().int().min(1).max(5000).default(1000),
  },
  annotations: { readOnlyHint: true },
}, async ({ formulario, limite }) => conSesion(async () => {
  const todos = await listaFormularios();
  let f = todos.find((x) => x.id === formulario);
  if (!f) {
    const ps = normal(formulario).split(/\s+/).filter(Boolean);
    const xs = todos.filter((x) => ps.every((p) => normal(`${x.nombre} ${x.evento || ''}`).includes(p)));
    if (!xs.length) return texto(`No encontré un formulario "${formulario}" que su usuario pueda ver.`);
    if (xs.length > 1) return json({ nota: 'Hay varios formularios con ese nombre. Repita con el id.', formularios: xs.map(({ id, origen, nombre, evento }) => ({ id, origen, nombre, evento })) });
    f = xs[0];
  }
  const filtro = [{ columna: 'formulario_id', operador: 'eq', valor: f.id }];
  let campos, filas;
  if (f.origen === 'sga') {
    campos = (await todas('formularios_campos', { filtros: filtro, orden: [{ columna: 'orden' }] })).map((c) => ({ llave: c.id, etiqueta: c.etiqueta, tipo: c.tipo, activo: c.activo }));
    const rs = await todas('formularios_respuestas', { filtros: filtro, columnas: ['created_at', 'distrito', 'zona', 'pastor_nombre', 'empleado_cod', 'valores'], orden: [{ columna: 'created_at', descendente: true }] });
    filas = rs.map((r) => ({ enviada: r.created_at, ...(r.distrito ? { zona: r.zona, distrito: r.distrito, pastor: r.pastor_nombre } : {}), ...(r.empleado_cod ? { empleado_cod: r.empleado_cod } : {}), valores: r.valores || {} }));
  } else {
    campos = (await todas('eventos_formulario_campos', { filtros: filtro, orden: [{ columna: 'orden' }] })).map((c) => ({ llave: c.clave, etiqueta: c.etiqueta, tipo: c.tipo, activo: true }));
    const rs = await todas('eventos_formulario_respuestas', { filtros: filtro, columnas: ['created_at', 'distrito_cod', 'iglesia_cod', 'enviado_por', 'valores'], orden: [{ columna: 'created_at', descendente: true }] });
    filas = rs.map((r) => ({ enviada: r.created_at, ...(r.enviado_por ? { enviado_por: r.enviado_por } : {}), ...(r.distrito_cod ? { distrito_cod: r.distrito_cod } : {}), ...(r.iglesia_cod ? { iglesia_cod: r.iglesia_cod } : {}), valores: r.valores || {} }));
  }
  // Cada respuesta con el texto de la pregunta en vez del código interno.
  const respuestas = filas.slice(0, limite).map(({ valores, ...resto }) => {
    const o = { ...resto };
    for (const c of campos) if (valores[c.llave] !== undefined) o[c.etiqueta] = valores[c.llave];
    return o;
  });
  return json({
    formulario: { id: f.id, origen: f.origen, nombre: f.nombre, ...(f.evento ? { evento: f.evento } : {}), estado: f.estado },
    preguntas: campos.map((c) => `${c.etiqueta} (${c.tipo})${c.activo ? '' : ' — ya no se muestra'}`),
    total: filas.length,
    respuestas,
    ...(filas.length > limite ? { nota: `Se devolvieron ${limite} de ${filas.length}. Suba el límite para ver más.` } : {}),
  });
}));

// ── Eventos ───────────────────────────────────────────────────
async function buscarEvento(t) {
  const evs = await todas('eventos', { columnas: ['id', 'slug', 'nombre', 'fecha_inicio', 'fecha_fin'] }).catch(sinPermisoVacio);
  const exacto = evs.find((e) => e.id === t || e.slug === t);
  if (exacto) return { evento: exacto };
  const ps = normal(t).split(/\s+/).filter(Boolean);
  const xs = evs.filter((e) => ps.every((p) => normal(`${e.nombre} ${e.slug}`).includes(p)));
  if (xs.length === 1) return { evento: xs[0] };
  return { opciones: xs.length ? xs : evs };
}

server.registerTool('sga_evento_personas', {
  title: 'Personas de un evento',
  description:
    'Lista las personas de un evento de SDA+ con iglesia, distrito, zona, teléfono, grupo (p. ej. «Graduación 21 nov») ' +
    'y la asistencia: cuántos programas asistió y cuáles. Incluye un resumen por grupo y por zona. ' +
    'Se puede filtrar por grupo, zona, distrito, iglesia o nombre (sin tildes ni mayúsculas).',
  inputSchema: {
    evento: z.string().min(2).describe('Nombre, parte del nombre o slug del evento, p. ej. "Graduación Southern"'),
    grupo: z.string().optional().describe('Parte del grupo, p. ej. "21 nov"'),
    zona: z.string().optional(),
    distrito: z.string().optional(),
    iglesia: z.string().optional(),
    nombre: z.string().optional(),
    solo_resumen: z.boolean().default(false).describe('Devolver solo los totales, sin la lista'),
    limite: z.number().int().min(1).max(5000).default(500),
  },
  annotations: { readOnlyHint: true },
}, async ({ evento, grupo, zona, distrito, iglesia, nombre, solo_resumen, limite }) => conSesion(async () => {
  const { evento: ev, opciones } = await buscarEvento(evento);
  if (!ev) {
    if (!opciones.length) return texto('Su usuario de SDA+ no tiene acceso a ningún evento.');
    return json({ nota: `No encontré un solo evento con "${evento}". Repita con el slug.`, eventos: opciones.map(({ slug, nombre }) => ({ slug, nombre })) });
  }
  const filtro = [{ columna: 'evento_id', operador: 'eq', valor: ev.id }];
  const [personas, programas, asistencia] = await Promise.all([
    todas('eventos_personas', { filtros: filtro, columnas: ['id', 'linea', 'nombre', 'apellido', 'iglesia', 'distrito', 'zona', 'telefono', 'categoria'] }),
    todas('eventos_programas', { filtros: filtro, columnas: ['id', 'nombre', 'fecha', 'estado', 'orden'] }).catch(sinPermisoVacio),
    todas('eventos_asistencia', { filtros: filtro, columnas: ['programa_id', 'persona_id'] }).catch(sinPermisoVacio),
  ]);
  if (!personas.length) return texto(`El evento «${ev.nombre}» no tiene personas, o su usuario no tiene permiso para ver Personas en ese evento.`);
  const nombreProg = new Map(programas.map((p) => [p.id, p.nombre]));
  const deCada = new Map();
  for (const a of asistencia) deCada.set(a.persona_id, [...(deCada.get(a.persona_id) || []), nombreProg.get(a.programa_id) || a.programa_id]);
  const tiene = (v, t) => !t || normal(v).includes(normal(t));
  const filas = personas
    .filter((p) => tiene(p.categoria, grupo) && tiene(p.zona, zona) && tiene(p.distrito, distrito) && tiene(p.iglesia, iglesia) && tiene(`${p.nombre} ${p.apellido || ''}`, nombre))
    .map((p) => ({
      linea: p.linea, nombre: [p.nombre, p.apellido].filter(Boolean).join(' '), iglesia: p.iglesia, distrito: p.distrito, zona: p.zona,
      telefono: p.telefono, grupo: p.categoria, asistio: (deCada.get(p.id) || []).length, programas: deCada.get(p.id) || [],
    }));
  const contar = (k) => Object.fromEntries([...filas.reduce((m, f) => m.set(f[k] || '(sin dato)', (m.get(f[k] || '(sin dato)') || 0) + 1), new Map())].sort());
  return json({
    evento: { nombre: ev.nombre, slug: ev.slug, desde: ev.fecha_inicio, hasta: ev.fecha_fin },
    programas: programas.map((p) => ({ nombre: p.nombre, fecha: p.fecha, estado: p.estado, presentes: asistencia.filter((a) => a.programa_id === p.id).length })),
    total: filas.length,
    por_grupo: contar('grupo'),
    por_zona: contar('zona'),
    ...(solo_resumen ? {} : { personas: filas.slice(0, limite) }),
    ...(!solo_resumen && filas.length > limite ? { nota: `Se devolvieron ${limite} de ${filas.length}. Suba el límite o filtre.` } : {}),
  });
}));

server.registerTool('sga_quien_soy', {
  title: 'Usuario de SDA+ conectado',
  description: 'Dice con qué usuario de SDA+ está conectado Claude y qué permisos tiene ese usuario.',
  inputSchema: {},
  annotations: { readOnlyHint: true },
}, async () => conSesion(async () => {
  if (!(await tokenVigente())) throw new SinSesion();
  const s = sesionActual();
  const p = await miPerfil(s.user_id);
  const permisos = p?.permisos ? Object.entries(p.permisos).filter(([, v]) => v === true).map(([k]) => k).sort() : null;
  return json({ usuario: s.email, activo: p?.activo ?? null, permisos });
}));

await server.connect(new StdioServerTransport());
