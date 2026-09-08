// ============================================================================
//  DATOS DEL MODELO - Mapa MINULP 2026
//  Este es el UNICO archivo que hay que editar de un ano al otro.
//  Todo lo demas (mapa, cronograma, buscador) se arma solo a partir de aca.
//
//  x, y = posicion en el mapa, en fracciones de 0 a 1 (0,0 arriba a la izquierda).
//         Para sacar las coordenadas de un punto nuevo abri editor.html,
//         hace clic en el mapa y copia la linea que te da.
// ============================================================================

/* ---------------------------------------------------------------------------
   ORGANOS
   track : 'asamblearios' | 'sti' | 'cs'  -> que columna del cronograma le toca
   sede  : nombre del edificio donde sesiona
   x, y  : donde cae el marcador en el mapa (fraccion de 0 a 1)

   ATENCION: las sedes y las posiciones de abajo son LAS DE 2025, tomadas del
   mapa oficial de la VIII edicion. Confirmalas o corregilas para 2026.
   --------------------------------------------------------------------------- */
export const ORGANOS = [
  { sigla: 'AG',     nombre: 'Asamblea General',                                        track: 'asamblearios',  sede: 'Casa del Niño',       x: 0.3014, y: 0.3663, nota: '80.º período de sesiones' },
  { sigla: 'STI',    nombre: 'Sala de Tratados Internacionales',                        track: 'sti',           sede: 'Legislatura',         x: 0.4852, y: 0.6406, nota: '' },
  { sigla: 'CS',     nombre: 'Consejo de Seguridad',                                    track: 'cs',            sede: 'Banco',               x: 0.3313, y: 0.6654, nota: '' },
  { sigla: 'ECOSOC', nombre: 'Consejo Económico y Social',                              track: 'asamblearios',  sede: 'Casa del Niño',       x: 0.3441, y: 0.3902, nota: '' },
  { sigla: 'CDH',    nombre: 'Consejo de Derechos Humanos',                             track: 'asamblearios',  sede: 'Domo',                x: 0.4290, y: 0.1930, nota: '' },
  { sigla: 'ONUM',   nombre: 'Oficina de ONU Mujeres',                                  track: 'asamblearios',  sede: 'Capilla',             x: 0.3866, y: 0.7709, nota: '' },
  { sigla: 'PNUMA',  nombre: 'Programa de la ONU para el Medio Ambiente',               track: 'asamblearios',  sede: 'Microcine',           x: 0.2915, y: 0.6820, nota: '' },
  { sigla: 'UNESCO', nombre: 'Organización para la Educación, la Ciencia y la Cultura', track: 'asamblearios',  sede: 'Museo del Muñeco',    x: 0.2751, y: 0.7155, nota: '' },
  { sigla: 'ACNUR',  nombre: 'Alto Comisionado de la ONU para los Refugiados',          track: 'asamblearios',  sede: 'Marina',              x: 0.5919, y: 0.2691, nota: '' },
  { sigla: 'UNICEF', nombre: 'Fondo de la ONU para la Infancia',                        track: 'asamblearios',  sede: 'Museo del Muñeco',    x: 0.3014, y: 0.7378, nota: '' },
  { sigla: 'OMS',    nombre: 'Organización Mundial de la Salud',                        track: 'asamblearios',  sede: 'Palacio de Justicia', x: 0.4461, y: 0.6280, nota: '' },
  { sigla: 'CAJ',    nombre: 'Comisión de Asuntos Jurídicos',                           track: 'asamblearios',  sede: 'YPF',                 x: 0.3705, y: 0.5758, nota: '' },
  { sigla: 'OIT',    nombre: 'Organización Internacional del Trabajo',                  track: 'asamblearios',  sede: 'Archivo',             x: 0.3913, y: 0.5395, nota: '' },
  { sigla: 'ONUDD',  nombre: 'Oficina de la ONU contra la Droga y el Delito',           track: 'asamblearios',  sede: 'Mundo Nuevo',         x: 0.5174, y: 0.3733, nota: '' },
  { sigla: 'UNODA',  nombre: 'Oficina de la ONU para el Desarme',                       track: 'asamblearios',  sede: 'IDR',                 x: 0.3151, y: 0.7065, nota: '' },
];

/* ---------------------------------------------------------------------------
   LUGARES
   tipo: 'edificio'   referencia para orientarse
         'sanitarios' | 'accesible' | 'comida' | 'kiosco' | 'heladeria'
         'salud' | 'info' | 'acceso' | 'estacion'
   Los servicios salen de los pictogramas del mapa oficial de la Republica
   (misma leyenda que el cartel del predio).
   --------------------------------------------------------------------------- */
export const LUGARES = [

  // --- edificio ---
  { id: 'domo',                    nombre: 'Domo',                            tipo: 'edificio',   x: 0.4221, y: 0.1953 },
  { id: 'casa-del-teatro',         nombre: 'Casa del Teatro',                 tipo: 'edificio',   x: 0.4046, y: 0.2439 },
  { id: 'anfiteatro',              nombre: 'Anfiteatro',                      tipo: 'edificio',   x: 0.4120, y: 0.2917 },
  { id: 'pileta',                  nombre: 'Pileta',                          tipo: 'edificio',   x: 0.3468, y: 0.3164 },
  { id: 'frontones',               nombre: 'Frontones',                       tipo: 'edificio',   x: 0.3740, y: 0.1984 },
  { id: 'cabana-del-pescador',     nombre: 'Cabaña del Pescador',             tipo: 'edificio',   x: 0.5469, y: 0.1957 },
  { id: 'cabana-del-lenador',      nombre: 'Cabaña del Leñador',              tipo: 'edificio',   x: 0.5643, y: 0.0517 },
  { id: 'casa-del-colono',         nombre: 'Casa del Colono',                 tipo: 'edificio',   x: 0.6875, y: 0.0864 },
  { id: 'carpinteria',             nombre: 'Carpintería',                     tipo: 'edificio',   x: 0.8319, y: 0.2594 },
  { id: 'pulperia',                nombre: 'Pulpería',                        tipo: 'edificio',   x: 0.7937, y: 0.2551 },
  { id: 'aduana',                  nombre: 'Aduana',                          tipo: 'edificio',   x: 0.4618, y: 0.2820 },
  { id: 'granja-educativa',        nombre: 'Granja Educativa',                tipo: 'edificio',   x: 0.6232, y: 0.3921 },
  { id: 'talleres',                nombre: 'Talleres',                        tipo: 'edificio',   x: 0.4891, y: 0.4751 },
  { id: 'canchas-de-basquet',      nombre: 'Canchas de Básquet',              tipo: 'edificio',   x: 0.4357, y: 0.4123 },
  { id: 'casa-de-gobierno',        nombre: 'Casa de Gobierno',                tipo: 'edificio',   x: 0.3308, y: 0.7517 },
  { id: 'estacion-de-servicio',    nombre: 'Estación de Servicio',            tipo: 'edificio',   x: 0.3939, y: 0.5604 },
  { id: 'casa-del-nino',           nombre: 'Casa del Niño',                   tipo: 'edificio',   x: 0.2987, y: 0.3580 },
  { id: 'parque-de-juegos-mecanicos', nombre: 'Parque de Juegos Mecánicos',      tipo: 'edificio',   x: 0.6059, y: 0.4526 },
  { id: 'puente-levadizo',         nombre: 'Puente Levadizo',                 tipo: 'edificio',   x: 0.5292, y: 0.7173 },
  { id: 'aeronautica',             nombre: 'Aeronáutica',                     tipo: 'edificio',   x: 0.6505, y: 0.2782 },
  { id: 'vivero',                  nombre: 'Vivero',                          tipo: 'edificio',   x: 0.1201, y: 0.6239 },
  { id: 'casa-del-agua',           nombre: 'Casa del Agua',                   tipo: 'edificio',   x: 0.5839, y: 0.2605 },
  { id: 'afip',                    nombre: 'AFIP',                            tipo: 'edificio',   x: 0.4071, y: 0.5258 },
  { id: 'microestadio',            nombre: 'Microestadio',                    tipo: 'edificio',   x: 0.2093, y: 0.4303 },
  { id: 'circuito-de-karting',     nombre: 'Circuito de karting',             tipo: 'edificio',   x: 0.8000, y: 0.3599 },
  { id: 'circuito-de-seguridad-vial', nombre: 'Circuito de Seguridad Vial',      tipo: 'edificio',   x: 0.7136, y: 0.2252 },
  { id: 'boleteria',               nombre: 'Boletería',                       tipo: 'edificio',   x: 0.5404, y: 0.4304 },
  { id: 'estacion-peter-pan',      nombre: 'Estación Peter Pan',              tipo: 'edificio',   x: 0.2482, y: 0.2299 },
  { id: 'estacion-caperucita',     nombre: 'Estación Caperucita',             tipo: 'edificio',   x: 0.2192, y: 0.5943 },
  { id: 'estacion-blancanieves',   nombre: 'Estación Blancanieves',           tipo: 'edificio',   x: 0.4637, y: 0.0971 },
  { id: 'estacion-pulgarcito',     nombre: 'Estación Pulgarcito',             tipo: 'edificio',   x: 0.8029, y: 0.2120 },
  { id: 'plaza-san-martin',        nombre: 'Plaza San Martín',                tipo: 'edificio',   x: 0.3563, y: 0.7330 },
  { id: 'tanque-de-agua',          nombre: 'Tanque de Agua',                  tipo: 'edificio',   x: 0.4233, y: 0.4368 },
  { id: 'bomberos',                nombre: 'Bomberos',                        tipo: 'edificio',   x: 0.4507, y: 0.5737 },
  { id: 'comisaria',               nombre: 'Comisaría',                       tipo: 'edificio',   x: 0.4424, y: 0.5797 },
  { id: 'enfermeria',              nombre: 'Enfermería',                      tipo: 'edificio',   x: 0.4599, y: 0.5672 },
  { id: 'mercado',                 nombre: 'Mercado',                         tipo: 'edificio',   x: 0.3844, y: 0.5096 },
  { id: 'ejercito',                nombre: 'Ejército',                        tipo: 'edificio',   x: 0.4904, y: 0.3389 },
  { id: 'estacion-central-del-ferrocarril', nombre: 'Estación Central del Ferrocarril', tipo: 'edificio',   x: 0.4960, y: 0.5845 },
  { id: 'casa-del-jardinero',      nombre: 'Casa del Jardinero',              tipo: 'edificio',   x: 0.1635, y: 0.5582 },

  // --- salud ---
  { id: 'centro-de-salud',         nombre: 'Centro de Salud',                 tipo: 'salud',      x: 0.4750, y: 0.5698, det: 'Junto a Bomberos' },

  // --- info ---
  { id: 'informes',                nombre: 'Informes',                        tipo: 'info',       x: 0.3988, y: 0.6702, det: 'Centro Cívico' },

  // --- sanitarios ---
  { id: 'sanitarios',              nombre: 'Sanitarios',                      tipo: 'sanitarios', x: 0.4022, y: 0.2005, det: 'Junto al Domo' },
  { id: 'sanitarios-2',            nombre: 'Sanitarios',                      tipo: 'sanitarios', x: 0.4950, y: 0.3423, det: 'Junto al Ejército' },
  { id: 'sanitarios-3',            nombre: 'Sanitarios',                      tipo: 'sanitarios', x: 0.6707, y: 0.3992, det: 'Granja Educativa' },
  { id: 'sanitarios-4',            nombre: 'Sanitarios',                      tipo: 'sanitarios', x: 0.3936, y: 0.6495, det: 'Centro Cívico' },
  { id: 'sanitarios-5',            nombre: 'Sanitarios',                      tipo: 'sanitarios', x: 0.3671, y: 0.6738, det: 'Centro Cívico' },

  // --- accesible ---
  { id: 'sanitario-accesible',     nombre: 'Sanitario accesible',             tipo: 'accesible',  x: 0.6798, y: 0.4171, det: 'Granja Educativa' },
  { id: 'sanitario-accesible-2',   nombre: 'Sanitario accesible',             tipo: 'accesible',  x: 0.3787, y: 0.6597, det: 'Centro Cívico' },

  // --- comida ---
  { id: 'confiteria',              nombre: 'Confitería',                      tipo: 'comida',     x: 0.4758, y: 0.3111, det: 'Junto a la Aduana' },
  { id: 'confiteria-2',            nombre: 'Confitería',                      tipo: 'comida',     x: 0.6032, y: 0.4225, det: 'Parque de Juegos Mecánicos' },
  { id: 'confiteria-3',            nombre: 'Confitería',                      tipo: 'comida',     x: 0.4354, y: 0.4920, det: 'Junto al Mercado' },
  { id: 'restaurante',             nombre: 'Restaurante',                     tipo: 'comida',     x: 0.3808, y: 0.6884, det: 'Centro Cívico' },
  { id: 'confiteria-4',            nombre: 'Confitería',                      tipo: 'comida',     x: 0.4507, y: 0.7108, det: 'Centro Cívico' },
  { id: 'restaurante-2',           nombre: 'Restaurante',                     tipo: 'comida',     x: 0.3979, y: 0.7132, det: 'Centro Cívico' },

  // --- kiosco ---
  { id: 'kiosco',                  nombre: 'Kiosco',                          tipo: 'kiosco',     x: 0.7248, y: 0.3159, det: 'Zona Aeronáutica' },
  { id: 'kiosco-2',                nombre: 'Kiosco',                          tipo: 'kiosco',     x: 0.4146, y: 0.6601, det: 'Centro Cívico' },

  // --- heladeria ---
  { id: 'heladeria',               nombre: 'Heladería',                       tipo: 'heladeria',  x: 0.4319, y: 0.6548, det: 'Centro Cívico' },

  // --- acceso ---
  { id: 'acceso-peatonal-noroeste', nombre: 'Acceso Peatonal (noroeste)',      tipo: 'acceso',     x: 0.2209, y: 0.2464 },
  { id: 'acceso-peatonal-este',    nombre: 'Acceso Peatonal (este)',          tipo: 'acceso',     x: 0.8182, y: 0.4394 },
  { id: 'ingreso-puente-levadizo', nombre: 'Ingreso Puente Levadizo',         tipo: 'acceso',     x: 0.5502, y: 0.6954 },
  { id: 'acceso-peatonal-y-vehicular', nombre: 'Acceso Peatonal y Vehicular',     tipo: 'acceso',     x: 0.1770, y: 0.9833 },

  // --- estacion ---
  { id: 'estacionamiento',         nombre: 'Estacionamiento',                 tipo: 'estacion',   x: 0.3226, y: 0.9270, det: 'Sobre Camino General Belgrano' },
];


/* ---------------------------------------------------------------------------
   CRONOGRAMA
   Un objeto por jornada. Cada bloque tiene desde/hasta en hora local (HH:MM).
     todos : el bloque es igual para todo el modelo (actos, refrigerios, comidas)
     sti / asamblearios / cs : que hace cada columna en ese bloque
   tipo: 'sesion' (por defecto) | 'pausa' | 'acto' | 'social' | 'cierre'
   --------------------------------------------------------------------------- */
export const CRONOGRAMA = [
  {
    fecha: '2026-09-22', titulo: 'Martes 22', subtitulo: 'Apertura',
    bloques: [
      { desde: '17:00', hasta: '18:00', todos: 'Acreditaciones', tipo: 'acto' },
      { desde: '18:00', hasta: '20:00', todos: 'Acto de Apertura', tipo: 'acto' },
      { desde: '20:00', hasta: '20:30', todos: 'Fin del Acto de Apertura', tipo: 'cierre' },
    ],
  },
  {
    fecha: '2026-09-23', titulo: 'Miércoles 23', subtitulo: 'Primera jornada',
    bloques: [
      { desde: '08:00', hasta: '10:20', sti: 'Orden del día', asamblearios: 'Debate General', cs: 'Orden del día' },
      { desde: '10:20', hasta: '10:40', todos: 'Refrigerio simultáneo', tipo: 'pausa' },
      { desde: '10:40', hasta: '13:00', sti: 'Orden del día', asamblearios: 'Debate General', cs: 'Orden del día' },
      { desde: '13:00', hasta: '14:00', todos: 'Almuerzo', tipo: 'pausa' },
      { desde: '14:00', hasta: '15:50', sti: 'Orden del día', asamblearios: 'Debate General', cs: 'Orden del día' },
      { desde: '15:50', hasta: '16:10', todos: 'Refrigerio simultáneo', tipo: 'pausa' },
      { desde: '16:10', hasta: '18:00', sti: 'Orden del día', asamblearios: 'Debate General', cs: 'Orden del día' },
      { desde: '18:00', hasta: '18:30', todos: 'Cierre de la primera jornada de sesiones', tipo: 'cierre' },
    ],
  },
  {
    fecha: '2026-09-24', titulo: 'Jueves 24', subtitulo: 'Segunda jornada',
    bloques: [
      { desde: '08:00', hasta: '10:20', sti: 'Orden del día', asamblearios: 'Debate General', cs: 'Orden del día' },
      { desde: '10:20', hasta: '10:40', todos: 'Refrigerio simultáneo', tipo: 'pausa' },
      { desde: '10:40', hasta: '13:00', sti: 'Orden del día', asamblearios: 'Debate General', cs: 'Orden del día' },
      { desde: '13:00', hasta: '14:00', todos: 'Almuerzo', tipo: 'pausa' },
      { desde: '14:00', hasta: '15:20', sti: 'Orden del día', asamblearios: 'Elaboración de Anteproyectos', cs: 'Orden del día' },
      { desde: '15:20', hasta: '15:40', todos: 'Refrigerio simultáneo', tipo: 'pausa' },
      { desde: '15:40', hasta: '17:00', sti: 'Orden del día', asamblearios: 'Elaboración de Anteproyectos', cs: 'Orden del día' },
      { desde: '17:00', hasta: '17:30', todos: 'Cierre de la segunda jornada de sesiones', tipo: 'cierre' },
      { desde: '20:00', hasta: '23:00', todos: 'Agasajo Diplomático', tipo: 'social' },
    ],
  },
  {
    fecha: '2026-09-25', titulo: 'Viernes 25', subtitulo: 'Tercera jornada y clausura',
    bloques: [
      { desde: '08:00', hasta: '10:20', sti: 'Orden del día', asamblearios: 'Defensa de Anteproyectos', cs: 'Orden del día' },
      { desde: '10:20', hasta: '10:40', todos: 'Refrigerio simultáneo', tipo: 'pausa' },
      { desde: '10:40', hasta: '13:00', sti: 'Orden del día', asamblearios: 'Defensa de Anteproyectos / Debate en Particular', cs: 'Orden del día' },
      { desde: '13:00', hasta: '14:00', todos: 'Almuerzo', tipo: 'pausa' },
      { desde: '14:00', hasta: '15:20', sti: 'Orden del día', asamblearios: 'Debate en Particular / Votación', cs: 'Orden del día' },
      { desde: '15:20', hasta: '15:40', todos: 'Refrigerio simultáneo', tipo: 'pausa' },
      { desde: '15:40', hasta: '17:00', sti: 'Orden del día', asamblearios: 'Debate General', cs: 'Orden del día' },
      { desde: '17:00', hasta: '17:30', todos: 'Cierre de la tercera jornada de sesiones', tipo: 'cierre' },
      { desde: '17:30', hasta: '19:30', todos: 'Acto de Clausura y Premiaciones', tipo: 'acto' },
    ],
  },
];

/* ---------------------------------------------------------------------------
   CONTACTOS  ->  COMPLETAR ANTES DEL MODELO

   Una entrada aparece en Info solo si tiene telefono (`tel`) o un punto del
   mapa (`lugar`). Las que no tienen ninguno de los dos no se muestran: una
   tarjeta que dice "numero a completar" no le sirve a nadie que este en el
   predio. Asi que las de abajo sin numero estan esperando el suyo.

   urgente: true  destaca la tarjeta y pinta de rojo el boton de llamar.
   --------------------------------------------------------------------------- */
export const CONTACTOS = [
  { nombre: 'Centro de Salud de la Repu', detalle: 'En el predio, junto a Bomberos', tel: '', lugar: 'centro-de-salud' },
  { nombre: 'Secretaría General', detalle: 'Organización del modelo', tel: '' },
  { nombre: 'Coordinación de Ujieres', detalle: 'Traslados y logística en el predio', tel: '' },
  { nombre: 'Informes de la Repu', detalle: 'Centro Cívico', tel: '', lugar: 'informes' },
];

/* ---------------------------------------------------------------------------
   INFO PRACTICA  ->  ajustar segun la edicion

   lugar   : id de LUGARES. Agrega un boton "Ver en el mapa".        (opcional)
   enlaces : [{ texto, url }] que se muestran como links de verdad.  (opcional)
   --------------------------------------------------------------------------- */
export const INFO = [
  { titulo: '¿Dónde me acredito?',
    texto: 'El martes 22 de 17:00 a 18:00, antes del Acto de Apertura. Acercate con tu documento.' },
  { titulo: '¿Dónde se come?',
    texto: 'Los refrigerios son simultáneos y se sirven en cada sede. El almuerzo va de 13:00 a 14:00. '
         + 'En el mapa están marcados el restaurante, las confiterías y los kioscos del predio.',
    lugar: 'restaurante' },
  { titulo: 'Código de vestimenta',
    texto: 'Formal durante las sesiones. Para el Agasajo Diplomático del jueves, formal de gala.' },
  { titulo: 'Dudas sobre el modelo',
    texto: 'La organización publica novedades, tópicos y recursos en su sitio y en Instagram.',
    enlaces: [
      { texto: 'acserp.org.ar', url: 'https://acserp.org.ar' },
      { texto: '@modeloonulp', url: 'https://www.instagram.com/modeloonulp/' },
      { texto: '@prensaacserp', url: 'https://www.instagram.com/prensaacserp/' },
    ] },
  { titulo: 'Si te perdés',
    texto: 'Tocá el botón de ubicación en el mapa para saber dónde estás, o acercate a Informes en el '
         + 'Centro Cívico. Los ujieres tienen la lista completa de sedes.',
    lugar: 'informes' },
];

/* ---------------------------------------------------------------------------
   HERRAMIENTAS
   Cosas de la organizacion que viven fuera de esta app y conviene tener a mano.
   Se muestran en Info, en "Para practicar".
   --------------------------------------------------------------------------- */
export const HERRAMIENTAS = [
  {
    nombre: 'Improratoria',
    texto: 'Tres ejercicios de un minuto para entrenar la improvisación: armar un discurso con '
         + 'palabras que van apareciendo cada diez segundos, tomar postura sobre un tema de la '
         + 'agenda mundial, o responder una pregunta arrancando por una frase dada.',
    boton: 'Entrenar antes de sesionar',
    url: 'https://improratoria.netlify.app/',
  },
];

/* ---------------------------------------------------------------------------
   CREDITOS
   --------------------------------------------------------------------------- */
export const CREDITOS = {
  autor: 'Joaquín Galasso',
  instagram: 'https://www.instagram.com/joacogalasso/',
  usuario: '@joacogalasso',
  para: 'ACSERP',
  organizacion: 'Asociación Civil Simulacros Educativos Río de la Plata',
  sitio: 'https://acserp.org.ar',
};
