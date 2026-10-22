// Tablas de SDA+ que el conector puede consultar, con las columnas permitidas.
// Lo que una persona ve de verdad lo decide la base (RLS) según sus permisos en SDA+;
// esta lista solo limita el alcance y esconde columnas internas (tokens y firmas).
// Las columnas que SDA+ cierra a nivel de columna (p. ej. pastores.fecha_nacimiento,
// email_personal, fecha_ingreso) no se incluyen: pedirlas hace fallar la consulta.

export const TABLAS = {
  // ── Organización ─────────────────────────────────────────────
  zonas: {
    modulo: 'Organización',
    descripcion: 'Zonas de ADOSE (9).',
    columnas: ['cod', 'nombre'],
    orden: 'cod',
  },
  distritos: {
    modulo: 'Organización',
    descripcion: 'Distritos pastorales (64) con su zona.',
    columnas: ['cod', 'nombre', 'codZona', 'zona'],
    orden: 'cod',
  },
  iglesias: {
    modulo: 'Organización',
    descripcion: 'Iglesias y grupos con zona, distrito y pastor asignado (y, según el alcance, situación del título y votos de organización). Fuente oficial de ADOSE.',
    columnas: [
      'cod', 'nombre', 'tipo', 'codZona', 'zona', 'codDistrito', 'distrito', 'pastor', 'pastor_cod',
      'titulacion_estado', 'titulacion_detalle', 'titulacion_via', 'titulacion_archivos', 'titulacion_actualizado', 'titulacion_nota',
      'voto_junta_numero', 'voto_junta_fecha', 'voto_organizacion_numero', 'voto_organizacion_fecha',
      'voto_regreso_grupo_numero', 'voto_regreso_grupo_fecha', 'congreso_voto_numero', 'congreso_fecha',
      'carpeta_drive', 'datos_extra', 'created_at',
    ],
    por_defecto: ['cod', 'nombre', 'tipo', 'zona', 'distrito', 'pastor', 'pastor_cod', 'titulacion_estado'],
    orden: 'cod',
  },
  iglesias_bajas: {
    modulo: 'Organización',
    descripcion: 'Iglesias dadas de baja o unidas a otra, con el voto y el motivo.',
    columnas: ['cod', 'nombre', 'tipo', 'zona', 'distrito', 'motivo', 'voto_junta_numero', 'voto_junta_fecha', 'congreso_voto_numero', 'congreso_fecha', 'unida_a_cod', 'unida_a_nombre', 'notas', 'created_at'],
    orden: 'created_at.desc',
  },
  iglesia_distrito_historial: {
    modulo: 'Organización',
    descripcion: 'Historial de a qué distrito ha pertenecido cada iglesia.',
    columnas: ['iglesia_cod', 'distrito_cod', 'fecha_inicio', 'fecha_fin'],
    orden: 'fecha_inicio.desc',
  },
  distrito_pastor_historial: {
    modulo: 'Organización',
    descripcion: 'Historial de pastores por distrito.',
    columnas: ['distrito_cod', 'pastor', 'fecha_inicio', 'fecha_fin'],
    orden: 'fecha_inicio.desc',
  },
  organizacion_iglesias: {
    modulo: 'Organización',
    descripcion: 'Proceso de organización de grupos en iglesia, por fases.',
    columnas: [
      'iglesia_cod', 'iglesia_nombre', 'zona', 'distrito', 'pastor_asignado', 'pastor_asignado_cod', 'pastor_telefono', 'pastor_confirmado',
      'fase1_completada', 'fase1_fecha', 'fecha_ceremonia', 'req_min_miembros', 'req_lideres', 'req_solvencia', 'req_lugar_culto',
      'instructivo_enviado_junta', 'fase2_completada', 'fase2_fecha', 'fecha_ceremonia_realizada', 'acta_firmada',
      'fase3_completada', 'fase3_fecha', 'acms_actualizado', 'acms_fecha', 'oficiales_electos', 'fase4_completada', 'fase4_fecha',
      'fase5_completada', 'fase5_fecha', 'completado', 'completado_fecha', 'notas', 'voto_junta_numero', 'voto_junta_fecha',
      'presidente_invitado', 'presidente_consultado', 'feligresia_asociacion', 'feligresia_fecha', 'updated_at',
    ],
    por_defecto: ['iglesia_cod', 'iglesia_nombre', 'zona', 'distrito', 'pastor_asignado', 'fase1_completada', 'fase2_completada', 'fase3_completada', 'fase4_completada', 'fase5_completada', 'completado', 'notas'],
    orden: 'updated_at.desc',
  },

  // ── Personal y RRHH ──────────────────────────────────────────
  pastores: {
    modulo: 'RRHH',
    descripcion: 'Todo el personal: rol pastor, plantador, oficina, departamental o administrador; con cargo, zona, distrito, contacto y estado. La fecha de ingreso está en vacaciones_balance. `cod` es el código de la persona y se usa como pastor_cod en las demás tablas.',
    columnas: [
      'cod', 'nombre', 'cargo', 'rol', 'estado', 'activo', 'sexo', 'telefono', 'extension', 'email',
      'codZona', 'zona', 'codDistrito', 'distrito', 'iglesia_asignada_cod', 'pastor_principal_cod', 'oficiante_matrimonios',
      'carpeta_drive', 'created_at',
    ],
    por_defecto: ['cod', 'nombre', 'cargo', 'rol', 'activo', 'zona', 'distrito', 'telefono', 'extension', 'email'],
    orden: 'nombre',
  },
  familiares: {
    modulo: 'RRHH',
    descripcion: 'Familiares del personal (cónyuge, hijos, etc.).',
    columnas: ['pastor_cod', 'parentesco', 'nombre', 'sexo', 'fecha_nacimiento', 'fecha_fallecimiento', 'estado_civil', 'cedula', 'activo', 'fuente'],
    orden: 'pastor_cod',
  },
  puestos: {
    modulo: 'RRHH',
    descripcion: 'Catálogo de puestos (Manual de Descripción de Puestos 2026): misión, funciones, línea de autoridad y competencias.',
    columnas: ['id', 'codigo', 'titulo', 'grupo', 'nivel', 'rinde_cuenta_a', 'supervisa_a', 'colabora_con', 'depende_de', 'mision', 'funciones', 'forma_responder', 'condiciones', 'competencias', 'notas', 'fuente', 'activo'],
    por_defecto: ['id', 'codigo', 'titulo', 'grupo', 'nivel', 'rinde_cuenta_a', 'activo'],
    orden: 'orden',
  },
  puestos_personas: {
    modulo: 'RRHH',
    descripcion: 'Qué persona ocupa cada puesto (puesto_id → puestos.id, pastor_cod → pastores.cod).',
    columnas: ['puesto_id', 'pastor_cod', 'principal', 'desde'],
    orden: 'desde.desc',
  },
  notas_personal: {
    modulo: 'RRHH',
    descripcion: 'Notas internas sobre una persona del personal.',
    columnas: ['pastor_cod', 'nota', 'autor', 'created_at'],
    orden: 'created_at.desc',
  },
  documentos_persona: {
    modulo: 'RRHH',
    descripcion: 'Lista de documentos del expediente de cada persona (solo los datos, no el archivo).',
    columnas: ['pastor_cod', 'categoria', 'titulo', 'archivo_nombre', 'estado', 'motivo_rechazo', 'subido_por', 'decidido_por', 'decidido_at', 'created_at'],
    orden: 'created_at.desc',
  },

  // ── Vacaciones y permisos ────────────────────────────────────
  vacaciones_solicitudes: {
    modulo: 'Vacaciones',
    descripcion: 'Solicitudes de vacaciones con fechas, días, etapa de aprobación y quién cubre.',
    columnas: [
      'id', 'pastor_cod', 'nombre', 'email', 'celular', 'fecha_solicitud', 'fecha_inicio', 'fecha_fin', 'dias_solicitados', 'semanas_solicitadas',
      'feriados_periodo', 'feriados_declarados', 'lugar', 'cubre', 'observaciones', 'estado', 'etapa',
      'presidente_aprobado_at', 'presidente_notas', 'presidente_firmante', 'presidente_via',
      'secretario_aprobado_at', 'secretario_notas', 'secretario_firmante', 'secretario_via',
      'rechazado_por', 'motivo_rechazo', 'aviso_salida_at', 'aviso_regreso_at', 'created_at',
    ],
    por_defecto: ['id', 'pastor_cod', 'nombre', 'fecha_inicio', 'fecha_fin', 'dias_solicitados', 'estado', 'etapa', 'cubre'],
    orden: 'fecha_inicio.desc',
  },
  vacaciones_balance: {
    modulo: 'Vacaciones',
    descripcion: 'Balance del año por persona: días asignados y días tomados.',
    columnas: ['pastor_cod', 'nombre', 'fecha_ingreso', 'dias_asignados_anio', 'dias_tomados_anio', 'es_excepcion', 'motivo_excepcion'],
    orden: 'nombre',
  },
  vacaciones_cambios: {
    modulo: 'Vacaciones',
    descripcion: 'Cambios de fechas hechos a solicitudes ya aprobadas.',
    columnas: ['solicitud_id', 'fecha_inicio_anterior', 'fecha_fin_anterior', 'fecha_inicio_nueva', 'fecha_fin_nueva', 'dias_anteriores', 'dias_nuevos', 'motivo', 'hecho_por', 'created_at'],
    orden: 'created_at.desc',
  },
  vacaciones_fuera_de_calendario: {
    modulo: 'Vacaciones',
    descripcion: 'Vacaciones que caen fuera del calendario normal.',
    columnas: ['id', 'nombre', 'fecha_inicio', 'fecha_fin', 'feriados_periodo', 'feriados_declarados'],
    orden: 'fecha_inicio.desc',
  },
  permisos_ausencia: {
    modulo: 'Vacaciones',
    descripcion: 'Permisos y licencias (ausencias, maternidad, duelo, etc.).',
    columnas: ['id', 'pastor_cod', 'nombre', 'email', 'tipo', 'fecha_solicitud', 'fecha_ausencia', 'fecha_hasta', 'dias', 'motivo', 'lugar', 'parentesco', 'fecha_parto', 'estado', 'decidido_por', 'decidido_at', 'motivo_decision', 'observaciones', 'created_at'],
    por_defecto: ['id', 'pastor_cod', 'nombre', 'tipo', 'fecha_ausencia', 'fecha_hasta', 'dias', 'motivo', 'estado'],
    orden: 'fecha_ausencia.desc',
  },

  // ── Actas ────────────────────────────────────────────────────
  actas_juntas: {
    modulo: 'Actas',
    descripcion: 'Juntas (sesiones) con tipo, número, fecha, lugar y estado del acta. Requiere el permiso ver_actas.',
    columnas: ['id', 'tipo', 'numero', 'fecha', 'hora', 'lugar', 'modalidad', 'estado', 'lectura_biblica', 'devocional_por', 'devocional_resumen', 'pagina_inicial', 'pagina_final', 'historica', 'observaciones', 'firmada_at'],
    por_defecto: ['id', 'tipo', 'numero', 'fecha', 'lugar', 'estado'],
    orden: 'fecha.desc',
  },
  actas_puntos: {
    modulo: 'Actas',
    descripcion: 'Puntos y votos de cada junta (junta_id → actas_juntas.id). voto_numero es el número oficial del voto (p. ej. 2026-056). Requiere ver_actas.',
    columnas: ['id', 'junta_id', 'seccion', 'orden', 'titulo', 'verbo', 'considerandos', 'texto', 'informativo', 'propuesto_por', 'estado', 'metodo', 'a_favor', 'en_contra', 'abstenciones', 'voto_anio', 'voto_numero', 'modifica_voto', 'pastor_cods', 'iglesia_cods', 'seguimiento_estado', 'seguimiento_nota', 'pagina', 'indice_asunto'],
    por_defecto: ['junta_id', 'voto_numero', 'titulo', 'verbo', 'texto', 'estado', 'seguimiento_estado'],
    orden: 'voto_numero.desc',
  },
  actas_asistentes: {
    modulo: 'Actas',
    descripcion: 'Asistentes a cada junta. Requiere ver_actas.',
    columnas: ['junta_id', 'orden', 'nombre', 'cargo', 'pastor_cod', 'invitado', 'presente'],
    orden: 'orden',
  },
  actas_indice_historico: {
    modulo: 'Actas',
    descripcion: 'Índice de actas viejas (2004–2025): año, concepto y página.',
    columnas: ['anio', 'concepto', 'pagina', 'fuente'],
    orden: 'anio.desc',
  },

  // ── Formularios ──────────────────────────────────────────────
  // Dos orígenes: el módulo Formularios de SDA+ (esquema public) y los formularios de
  // cada evento (esquema eventos, con `esquema` y el nombre real en `tabla`).
  // Para leer respuestas con el nombre de cada pregunta es más fácil sga_formulario_respuestas.
  formularios: {
    modulo: 'Formularios',
    descripcion: 'Formularios del módulo Formularios de SDA+ (audiencia: distritos, libre o empleados; estado: borrador, abierto o cerrado). Requiere ver_formularios.',
    columnas: ['id', 'titulo', 'descripcion', 'audiencia', 'estado', 'fecha_limite', 'mensaje_final', 'creado_por_email', 'created_at', 'updated_at'],
    por_defecto: ['id', 'titulo', 'audiencia', 'estado', 'fecha_limite', 'created_at'],
    orden: 'created_at.desc',
  },
  formularios_campos: {
    modulo: 'Formularios',
    descripcion: 'Preguntas de cada formulario de SDA+ (formulario_id → formularios.id). En formularios_respuestas.valores, la llave de cada respuesta es el id del campo.',
    columnas: ['id', 'formulario_id', 'orden', 'tipo', 'etiqueta', 'ayuda', 'requerido', 'opciones', 'identifica', 'activo'],
    orden: 'orden',
  },
  formularios_respuestas: {
    modulo: 'Formularios',
    descripcion: 'Respuestas a los formularios de SDA+. valores es un objeto {id_del_campo: respuesta}. Incluye distrito, zona y pastor cuando el formulario es por distrito, y empleado_cod cuando está vinculada a un empleado.',
    columnas: ['id', 'formulario_id', 'created_at', 'cod_distrito', 'distrito', 'zona', 'pastor_cod', 'pastor_nombre', 'valores', 'empleado_cod', 'vinculo_origen'],
    orden: 'created_at.desc',
  },
  formularios_destinatarios: {
    modulo: 'Formularios',
    descripcion: 'Empleados a quienes va dirigido un formulario de audiencia «empleados» (pastor_cod → pastores.cod).',
    columnas: ['formulario_id', 'pastor_cod', 'created_at'],
    orden: 'created_at',
  },
  eventos: {
    modulo: 'Eventos',
    esquema: 'eventos',
    tabla: 'eventos',
    descripcion: 'Eventos de SDA+ (módulo Eventos) que el usuario puede ver: los de su equipo, o todos si ve todos los eventos.',
    columnas: ['id', 'slug', 'nombre', 'descripcion', 'tipo', 'fecha_inicio', 'fecha_fin', 'estado', 'archivado'],
    por_defecto: ['id', 'slug', 'nombre', 'tipo', 'fecha_inicio', 'fecha_fin', 'estado'],
    orden: 'fecha_inicio.desc',
  },
  eventos_formularios: {
    modulo: 'Formularios',
    esquema: 'eventos',
    tabla: 'formularios',
    descripcion: 'Formularios de los eventos (evento_id → eventos.id). Solo salen los de eventos en los que el usuario tiene acceso a Formularios.',
    columnas: ['id', 'evento_id', 'nombre', 'descripcion', 'ambito', 'activo', 'abre', 'cierra', 'multiples', 'created_at'],
    por_defecto: ['id', 'evento_id', 'nombre', 'ambito', 'activo', 'cierra'],
    orden: 'created_at.desc',
  },
  eventos_formulario_campos: {
    modulo: 'Formularios',
    esquema: 'eventos',
    tabla: 'formulario_campos',
    descripcion: 'Preguntas de cada formulario de evento. En eventos_formulario_respuestas.valores, la llave de cada respuesta es `clave`.',
    columnas: ['id', 'formulario_id', 'clave', 'etiqueta', 'tipo', 'requerido', 'opciones', 'ayuda', 'orden'],
    orden: 'orden',
  },
  eventos_formulario_respuestas: {
    modulo: 'Formularios',
    esquema: 'eventos',
    tabla: 'formulario_respuestas',
    descripcion: 'Respuestas a los formularios de eventos. valores es un objeto {clave_del_campo: respuesta}; distrito_cod e iglesia_cod cuando aplican.',
    columnas: ['id', 'formulario_id', 'distrito_cod', 'iglesia_cod', 'valores', 'enviado_por', 'created_at', 'corregida_at'],
    orden: 'created_at.desc',
  },

  // ── Eventos: personas, programas y asistencia ────────────────
  // Solo lo de los eventos en cuyo equipo está la persona (RLS por área).
  // Sin tokens ni pagos: los enlaces personales y el dinero no salen de SDA+.
  eventos_personas: {
    modulo: 'Eventos',
    esquema: 'eventos',
    tabla: 'personas',
    descripcion: 'Personas inscritas en cada evento (evento_id → eventos.id) con iglesia, distrito, zona y teléfono. `categoria` es el grupo de la persona (p. ej. «Graduación 21 nov»). Requiere ver Personas en el evento.',
    columnas: ['id', 'evento_id', 'linea', 'nombre', 'apellido', 'iglesia', 'iglesia_cod', 'distrito', 'zona', 'telefono', 'email', 'categoria', 'visita', 'no_adventista', 'nota', 'llego_at', 'created_at'],
    por_defecto: ['linea', 'nombre', 'apellido', 'iglesia', 'distrito', 'zona', 'telefono', 'categoria'],
    orden: 'linea',
  },
  eventos_programas: {
    modulo: 'Eventos',
    esquema: 'eventos',
    tabla: 'programas',
    descripcion: 'Programas de cada evento (una noche, un culto, una graduación), con fecha, hora de inicio, lugar y estado (borrador, activo, cerrado).',
    columnas: ['id', 'evento_id', 'nombre', 'fecha', 'hora_inicio_base', 'lugar', 'estado', 'nota', 'orden'],
    orden: 'orden',
  },
  eventos_asistencia: {
    modulo: 'Eventos',
    esquema: 'eventos',
    tabla: 'programa_presencias',
    descripcion: 'Asistencia: una fila por persona presente en un programa (programa_id → eventos_programas.id, persona_id → eventos_personas.id). Para contar noches por persona es más fácil sga_evento_personas.',
    columnas: ['programa_id', 'evento_id', 'persona_id', 'llego_en'],
    orden: 'llego_en',
  },
};

export const OPERADORES = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'cs'];

// Alcances: qué tablas y columnas ofrece cada modalidad del conector.
// «directorio» es para quien solo necesita iglesias, personal y la división territorial.
const DIRECTORIO = {
  zonas: null,
  distritos: null,
  iglesias: ['cod', 'nombre', 'tipo', 'codZona', 'zona', 'codDistrito', 'distrito', 'pastor', 'pastor_cod'],
  pastores: ['cod', 'nombre', 'cargo', 'rol', 'activo', 'telefono', 'extension', 'email', 'codZona', 'zona', 'codDistrito', 'distrito', 'iglesia_asignada_cod'],
  // Formularios también en el directorio: la base solo muestra los que la persona puede ver.
  formularios: null,
  formularios_campos: null,
  formularios_respuestas: null,
  formularios_destinatarios: null,
  eventos: null,
  eventos_formularios: null,
  eventos_formulario_campos: null,
  eventos_formulario_respuestas: null,
  eventos_personas: null,
  eventos_programas: null,
  eventos_asistencia: null,
};

export const ALCANCES = ['completo', 'directorio'];

export function tablasPara(alcance) {
  if (alcance !== 'directorio') return TABLAS;
  return Object.fromEntries(Object.entries(DIRECTORIO).map(([nombre, cols]) => {
    const def = TABLAS[nombre];
    if (!cols) return [nombre, def];
    return [nombre, { ...def, columnas: cols, por_defecto: (def.por_defecto || def.columnas).filter((c) => cols.includes(c)) }];
  }));
}
