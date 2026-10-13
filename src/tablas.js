// Tablas de SGA que el conector puede consultar, con las columnas permitidas.
// Lo que una persona ve de verdad lo decide la base (RLS) según sus permisos en SGA;
// esta lista solo limita el alcance y esconde columnas internas (tokens y firmas).
// Las columnas que SGA cierra a nivel de columna (p. ej. pastores.fecha_nacimiento,
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
    descripcion: 'Iglesias y grupos con zona, distrito, pastor asignado, situación del título y votos de organización. Fuente oficial de ADOSE.',
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
    descripcion: 'Todo el personal (pastores y empleados de oficina): cargo, rol, zona, distrito, contacto y estado. La fecha de ingreso está en vacaciones_balance. `cod` es el código de la persona y se usa como pastor_cod en las demás tablas.',
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
};

export const OPERADORES = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in', 'cs'];
