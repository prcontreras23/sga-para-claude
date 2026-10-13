#!/usr/bin/env node
// sga-para-claude — conector MCP de solo lectura entre Claude y SGA (ADOSE).
//
//   sga-para-claude           servidor MCP (lo arranca Claude)
//   sga-para-claude entrar    iniciar sesión en SGA
//   sga-para-claude estado    ver con qué usuario está conectado
//   sga-para-claude salir     borrar la sesión guardada

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { TABLAS, OPERADORES } from './src/tablas.js';
import { consultar, miPerfil, SinSesion } from './src/consulta.js';
import { iniciarSesion, sesionActual, borrarSesion, tokenVigente } from './src/sesion.js';

const comando = process.argv[2];

if (comando === 'entrar') {
  console.log('Se abrirá una página en su navegador para entrar a SGA...');
  try {
    const s = await iniciarSesion({ avisar: (url) => console.log(`Si no se abre sola, copie esta dirección en el navegador:\n${url}`) });
    console.log(`Listo. Claude quedó conectado a SGA con el usuario ${s.email}.`);
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
} else if (comando === 'estado') {
  const token = await tokenVigente().catch(() => null);
  const s = sesionActual();
  console.log(token && s ? `Conectado a SGA como ${s.email}.` : 'No hay sesión de SGA. Use: sga-para-claude entrar');
  process.exit(0);
} else if (comando === 'salir') {
  borrarSesion();
  console.log('Sesión de SGA borrada de esta computadora.');
  process.exit(0);
} else if (comando) {
  console.error(`Comando desconocido: ${comando}. Use entrar, estado o salir.`);
  process.exit(1);
}

// ── Servidor MCP ──────────────────────────────────────────────

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
        'Para consultar SGA hay que iniciar sesión. Se abrió una página en el navegador: ' +
        'entre con el mismo correo y contraseña de SGA y luego repita la consulta.' +
        (url ? `\nSi la página no se abrió, use esta dirección: ${url}` : ''),
      );
    }
    try { return await fn(); } catch (e2) { return { ...texto(`Error: ${e2.message}`), isError: true }; }
  }
}

const server = new McpServer({ name: 'sga', version: '0.1.0' }, {
  instructions:
    'Conector de solo lectura a SGA, el sistema oficial de ADOSE (Asociación Dominicana del Sureste): ' +
    'iglesias, distritos, zonas, personal y RRHH, vacaciones y permisos, y actas de junta. ' +
    'Consulta con el usuario de SGA de la persona y solo ve lo que sus permisos le dejan ver. ' +
    'Para buscar a alguien y su teléfono use sga_buscar_persona. Para lo demás, sga_tablas y luego sga_consultar. ' +
    'Las tablas se relacionan por códigos: pastores.cod = pastor_cod; distritos.cod = codDistrito; zonas.cod = codZona; iglesias.cod = iglesia_cod. ' +
    'No puede modificar nada en SGA.',
});

server.registerTool('sga_buscar_persona', {
  title: 'Buscar persona en SGA',
  description:
    'Busca personas del personal de ADOSE (pastores y empleados de oficina) por nombre, cargo, distrito o zona, ' +
    'y devuelve teléfono, extensión, correo, cargo, zona y distrito. Busca cada palabra por separado y no distingue mayúsculas.',
  inputSchema: {
    texto: z.string().min(2).describe('Nombre o parte del nombre, p. ej. "Noemí Vizcaíno" o "Vizcaino"'),
    campo: z.enum(['nombre', 'cargo', 'distrito', 'zona']).default('nombre').describe('Dónde buscar'),
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
    columnas: ['cod', 'nombre', 'cargo', 'telefono', 'extension', 'email', 'zona', 'distrito', 'activo'],
    filtros: incluir_inactivos ? [] : [{ columna: 'activo', operador: 'is', valor: 'false', negar: true }],
    orden: [{ columna: 'nombre' }],
    limite: 1000,
  });
  const filas = r.filas.filter((f) => palabras.every((p) => normal(f[campo]).includes(p)));
  if (!filas.length) return texto(`No encontré a nadie con "${t}" en ${campo}.`);
  return json(filas.slice(0, 50));
}));

server.registerTool('sga_tablas', {
  title: 'Tablas de SGA',
  description: 'Lista las tablas de SGA que se pueden consultar, con su descripción y columnas. Úsela antes de sga_consultar.',
  inputSchema: {
    modulo: z.enum(['Organización', 'RRHH', 'Vacaciones', 'Actas']).optional().describe('Filtrar por módulo'),
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
  title: 'Consultar SGA',
  description:
    'Consulta una tabla de SGA en solo lectura, con filtros, orden y límite. Las fechas van en formato AAAA-MM-DD. ' +
    'Si no se indican columnas, devuelve las más útiles. Si una tabla devuelve vacío, puede ser que el usuario no tenga permiso para verla en SGA.',
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
  const r = await consultar(args);
  const nota = r.cantidad === 0
    ? 'Sin resultados. Si esperaba datos, puede ser que su usuario de SGA no tenga permiso para esta tabla.'
    : r.cantidad === r.limite ? `Se devolvieron ${r.limite} filas (el límite). Puede haber más: use "desde" o filtros.` : undefined;
  return json({ ...r, ...(nota ? { nota } : {}) });
}));

server.registerTool('sga_quien_soy', {
  title: 'Usuario de SGA conectado',
  description: 'Dice con qué usuario de SGA está conectado Claude y qué permisos tiene ese usuario.',
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
