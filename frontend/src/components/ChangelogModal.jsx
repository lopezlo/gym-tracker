import { X } from 'lucide-react'
import BottomSheet from './BottomSheet'

// Badge color per entry type — keep consistent across all versions
const BADGE = {
  'Nuevo':  'bg-emerald-500/20 text-emerald-400',
  'Mejora': 'bg-sky-500/20     text-sky-400',
  'Fixed':  'bg-amber-500/20   text-amber-400',
}

function ChangeEntry({ text }) {
  const colon = text.indexOf(':')
  if (colon === -1) return (
    <li className="flex items-start gap-2 text-sm text-slate-300">
      <span className="text-slate-600 mt-0.5 flex-shrink-0">·</span>
      <span>{text}</span>
    </li>
  )
  const type  = text.slice(0, colon).trim()
  const body  = text.slice(colon + 1).trim()
  const color = BADGE[type]
  return (
    <li className="flex items-start gap-2 text-sm text-slate-300">
      {color
        ? <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold flex-shrink-0 mt-0.5 ${color}`}>{type}</span>
        : <span className="text-slate-600 mt-0.5 flex-shrink-0">·</span>}
      <span>{body}</span>
    </li>
  )
}

const CHANGELOG = [
  {
    version: '2.0.25',
    date: '7 jun 2026',
    changes: [
      'Mejora: Menú más estrecho y centrado — 58% del ancho con mínimo de 250px',
      'Mejora: Eliminada la rallita deslizante bajo los iconos del menú',
    ],
  },
  {
    version: '2.0.24',
    date: '7 jun 2026',
    changes: [
      'Fixed: Desde Progreso, clic en el menú con entrenamiento activo ahora anima correctamente hasta la sesión',
    ],
  },
  {
    version: '2.0.23',
    date: '6 jun 2026',
    changes: [
      'Mejora: Subheader de sesión altura fija (h-11) — sin saltos de layout independientemente del timer',
      'Mejora: Separación fija entre la línea divisora y las tarjetas de ejercicio',
    ],
  },
  {
    version: '2.0.22',
    date: '6 jun 2026',
    changes: [
      'Fixed: Artefacto de tarjeta en esquina superior derecha al volver a sesión (container transform intermedio)',
    ],
  },
  {
    version: '2.0.21',
    date: '6 jun 2026',
    changes: [
      'Mejora: Subheader siempre visible en sesión — los ejercicios ya no quedan pegados al borde superior',
    ],
  },
  {
    version: '2.0.20',
    date: '6 jun 2026',
    changes: [
      'Fixed: Artefacto visual al volver a sesión — wrapper oculto síncronamente antes del navigate',
      'Fixed: Línea en el top al deslizar con sesión sin ejercicios (subheader condicional en SessionPreview)',
    ],
  },
  {
    version: '2.0.19',
    date: '6 jun 2026',
    changes: [
      'Fixed: Artefacto visual al navegar a sesión desde menú — swipe container se limpia después de que React lo oculta',
    ],
  },
  {
    version: '2.0.18',
    date: '6 jun 2026',
    changes: [
      'Nuevo: SessionPreview en panel 0 — al deslizar hacia sesión se ven los ejercicios en tiempo real',
      'Mejora: Clic en el círculo desde Plan/Progreso anima el swipe container fuera de pantalla',
      'Fixed: Parpadeo de sesión durante el swipe de salida (el Outlet se desmonta limpiamente)',
    ],
  },
  {
    version: '2.0.17',
    date: '6 jun 2026',
    changes: [
      'Mejora: Vuelta a sesión activa instantánea — caché de datos elimina spinner y animación de entrada',
    ],
  },
  {
    version: '2.0.16',
    date: '6 jun 2026',
    changes: [
      'Mejora: Swipe sesión↔Plan con deslizamiento coordinado real (ambas vistas se mueven a la vez)',
      'Mejora: Toque en Plan/Progreso desde sesión usa la misma animación que el swipe',
    ],
  },
  {
    version: '2.0.15',
    date: '6 jun 2026',
    changes: [
      'Mejora: Swipe sesión↔Plan con acompañamiento visual simultáneo en ambas direcciones',
    ],
  },
  {
    version: '2.0.14',
    date: '6 jun 2026',
    changes: [
      'Mejora: Transición de swipe hacia sesión invisible — fondo oscuro en vez de spinner',
    ],
  },
  {
    version: '2.0.13',
    date: '6 jun 2026',
    changes: [
      'Mejora: Swipe desde sesión con acompañamiento visual — la pantalla sigue el dedo al deslizar hacia Plan',
      'Mejora: Rubber band en dirección sin destino desde la pantalla de sesión',
    ],
  },
  {
    version: '2.0.12',
    date: '5 jun 2026',
    changes: [
      'Fixed: Swipe desde Plan hacia entrenamiento ya no muestra pantalla en blanco',
      'Fixed: Swipe izquierdo desde entrenamiento ya no se queda en blanco',
      'Fixed: El contenedor de swipe no anima desde panel 0 al volver de una sesión',
      'Mejora: Swipe derecho en pantalla de sesión actua como borde (rubber band)',
    ],
  },
  {
    version: '2.0.11',
    date: '5 jun 2026',
    changes: [
      'Mejora: Selector de usuario simplificado — menú ⋯ eliminado (edición/eliminación en Ajustes)',
      'Fixed: Flash de "Empezar entrenamiento" al volver a Inicio con sesión activa',
      'Nuevo: Swipe en pantalla de sesión — derecha vuelve a Inicio, izquierda va a Plan',
    ],
  },
  {
    version: '2.0.10',
    date: '5 jun 2026',
    changes: [
      'Fixed: Menú ⋯ en selector de usuario volvía a quedar recortado (overflow-hidden en la tarjeta)',
      'Nuevo: Editar perfil directamente desde Ajustes (lápiz en la tarjeta de usuario)',
      'Nuevo: Descargar datos y Eliminar cuenta en Ajustes (zona inferior, estilo sutil)',
    ],
  },
  {
    version: '2.0.9',
    date: '5 jun 2026',
    changes: [
      'Mejora: Al volver a Inicio con entrenamiento activo, va directamente a la sesión sin pantalla intermedia',
    ],
  },
  {
    version: '2.0.8',
    date: '5 jun 2026',
    changes: [
      'Mejora: Círculo del menú más grande (52px) y pulso solo hacia afuera sin retracción',
      'Nuevo: "Finalizar entrenamiento" en el header — disponible desde cualquier ventana',
      'Fixed: Botón "Añadir ejercicio" ya no queda detrás del menú flotante',
    ],
  },
  {
    version: '2.0.7',
    date: '5 jun 2026',
    changes: [
      'Fixed: Contenido ahora se desplaza realmente por detrás del menú flotante (padding en el scroll interno de cada página)',
    ],
  },
  {
    version: '2.0.6',
    date: '5 jun 2026',
    changes: [
      'Mejora: Orden nav — Inicio · Plan · Progreso (círculo a la izquierda)',
      'Mejora: Círculo dentro del pill, centrado verticalmente, sin desbordarse (46px)',
      'Mejora: Borde oscuro en el círculo para dar profundidad',
      'Mejora: Contenido llega hasta el fondo de la pantalla, el nav flota encima',
    ],
  },
  {
    version: '2.0.5',
    date: '4 jun 2026',
    changes: [
      'Mejora: Círculo centrado en el menú flotante — Plan · ⬤ · Progreso',
      'Mejora: Círculo apagado (morado muy tenue) cuando no estás en Inicio',
      'Mejora: Contenido llega hasta abajo — nav flota sobre él con efecto cristal',
    ],
  },
  {
    version: '2.0.4',
    date: '4 jun 2026',
    changes: [
      'Mejora: Botón de sesión renombrado a "Empezar entrenamiento"',
      'Mejora: "Próxima sesión" → "Próximo entrenamiento" en Plan',
      'Mejora: Estadísticas de Progreso muestran totales desde el inicio (sin el bloque de días)',
      'Nuevo: Menú de navegación flotante con efecto cristal traslúcido y bordes redondeados',
    ],
  },
  {
    version: '2.0.3',
    date: '4 jun 2026',
    changes: [
      'Fixed: Iconos del menú inferior centrados — las tres secciones usan flex-1 igual',
    ],
  },
  {
    version: '2.0.2',
    date: '4 jun 2026',
    changes: [
      'Mejora: Nav reordenada — Sesión (círculo izquierda) · Plan · Progreso',
      'Mejora: "Planif." renombrado a "Plan"',
      'Mejora: Cronómetro de sesión activa visible en todas las ventanas del header',
    ],
  },
  {
    version: '2.0.1',
    date: '4 jun 2026',
    changes: [
      'Mejora: Tarjetas de rutinas compactas — nombre + preview + bullets de días + acciones en una sola fila',
      'Fixed: "de" en la fecha del Inicio en minúsculas',
      'Fixed: Plan de próxima sesión no aparecía en el Inicio hasta recargar (refetch al navegar al tab)',
    ],
  },
  {
    version: '2.0.0',
    date: '4 jun 2026',
    changes: [
      'Nuevo: Inicio rediseñado — lanzador de sesiones con carga de rutina/plan antes de empezar',
      'Nuevo: Nav simplificada — Planificador · ⬤ Inicio · Progreso (con swipe entre los tres)',
      'Nuevo: El círculo central es el Inicio — pulsa para lanzar o ver la sesión activa',
      'Nuevo: Sesión activa con header compartido — timer visible en el header al entrenar',
      'Nuevo: Pantalla de sesión con nav completa — puedes moverte entre tabs sin salir',
      'Mejora: Progreso unificado — estadísticas + calendario + gráfico + histórico en un scroll',
      'Mejora: Conteo de entrenamientos del año integrado en el calendario (se actualiza al cambiar año)',
      'Mejora: El plan de próxima sesión se consume solo al iniciar, no al previsualizar',
    ],
  },
  {
    version: '1.9.2',
    date: '3 jun 2026',
    changes: [
      'Fixed: Modales del Planificador rotos al estar dentro del contenedor de swipe (portal a document.body)',
    ],
  },
  {
    version: '1.9.1',
    date: '3 jun 2026',
    changes: [
      'Mejora: Botón de rutina muestra "Hoy toca rutina de: <nombre>" con acción Cargar/Elegir',
      'Nuevo: Botón "Quitar" para limpiar plantilla cargada si te arrepientes',
      'Mejora: Swipe horizontal incluye el Planificador entre Dashboard y Progreso',
    ],
  },
  {
    version: '1.9.0',
    date: '3 jun 2026',
    changes: [
      'Nuevo: Planificador — tab dedicado para gestionar rutinas y la próxima sesión',
      'Nuevo: Rutinas reutilizables con días de la semana asignados (multi-día)',
      'Nuevo: Próxima sesión — planifica los ejercicios de tu siguiente entreno (uso único)',
      'Nuevo: En sesión activa, botón para cargar rutina del día o la sesión planificada',
      'Nuevo: Ejercicios planificados aparecen como tarjetas fantasma hasta que se empieza a ejecutarlos',
      'Mejora: La próxima sesión se consume automáticamente al cargarla',
    ],
  },
  {
    version: '1.8.2',
    date: '2 jun 2026',
    changes: [
      'Mejora: Cache headers corregidos — Chrome ya no cargará versiones antiguas al abrir la app',
    ],
  },
  {
    version: '1.8.1',
    date: '2 jun 2026',
    changes: [
      'Mejora: Calendario muestra el año completo — días futuros visibles en gris oscuro',
      'Fixed: Etiquetas de mes del calendario en minúsculas',
      'Mejora: Zoom desactivado (user-scalable=no) para experiencia nativa',
    ],
  },
  {
    version: '1.8.0',
    date: '2 jun 2026',
    changes: [
      'Nuevo: Pantalla de sesión rediseñada — tarjeta por ejercicio con botón "+ Serie" directo',
      'Nuevo: Panel de entrada de serie como modal (peso, reps, series previas como referencia)',
      'Nuevo: Temporizador de descanso siempre visible en el header junto al cronómetro',
      'Mejora: Ejercicios salteados ahora son cómodos — puedes añadir serie a cualquier ejercicio con un tap',
    ],
  },
  {
    version: '1.7.3',
    date: '2 jun 2026',
    changes: [
      'Mejora: Búsqueda de ejercicios ignora acentos (elíptica = eliptica)',
      'Mejora: Alerta sonora del temporizador más fuerte — tres pitidos ascendentes con vibración',
      'Fixed: Orden de ejercicios en el registro de sesión (mismo fix que el histórico — Map en vez de objeto plano)',
    ],
  },
  {
    version: '1.7.2',
    date: '29 may 2026',
    changes: [
      'Fixed: Cronómetro de sesión mostraba -1:-1 en el primer segundo (desfase reloj servidor/cliente)',
      'Fixed: Temporizador de descanso mostraba 1s de más al arrancar',
      'Mejora: Color naranja en el temporizador de descanso solo en los últimos 5s (antes 30s)',
    ],
  },
  {
    version: '1.7.1',
    date: '28 may 2026',
    changes: [
      'Fixed: Temporizador de descanso se reiniciaba al eliminar una serie — ahora solo desaparece si se eliminan todas',
      'Fixed: Editar perfil de usuario bloqueado mientras hay una sesión activa (aviso)',
    ],
  },
  {
    version: '1.7.0',
    date: '28 may 2026',
    changes: [
      'Nuevo: Selector de ejercicios con categorías por músculo y favoritos (⭐)',
      'Nuevo: Temporizador de descanso con cuenta atrás y aviso por vibración',
      'Nuevo: Panel de ajustes accesible desde el avatar (temporizador + salir)',
      'Nuevo: Botón "Salir" con aviso si hay sesión activa (finalizar / salir igual)',
      'Nuevo: Animación de pulsación en tarjetas de usuario',
      'Mejora: Finalizar sesión vacía informa de que no se guardará',
      'Fixed: Menú desplegable de sesión solapado por la tarjeta siguiente',
      'Fixed: "Exportar datos" descuadrado en el menú de usuario',
      'Fixed: Color hover incorrecto en selector de usuarios (slate-750)',
    ],
  },
  {
    version: '1.6.6',
    date: '28 may 2026',
    changes: [
      'Nuevo: Menú ⋯ en el selector de usuarios (editar / exportar datos / eliminar)',
      'Nuevo: Editar nombre y foto de perfil desde el menú',
      'Mejora: La foto solo se puede cambiar desde el modo edición',
    ],
  },
  {
    version: '1.6.5',
    date: '28 may 2026',
    changes: [
      'Fixed: Reordenación de ejercicios — orden se guardaba siempre por ID numérico (Map en vez de objeto plano)',
    ],
  },
  {
    version: '1.6.4',
    date: '28 may 2026',
    changes: [
      'Fixed: Reordenación de ejercicios (colisión ahora ignora IDs de series anidadas)',
      'Fixed: Hueco visible al abrir paneles por la animación elástica',
      'Mejora: Elasticidad reducida en la animación de entrada de los paneles',
      'Mejora: Sesiones del histórico permanecen abiertas de forma independiente',
      'Mejora: Animación de apertura suave al expandir una sesión',
    ],
  },
  {
    version: '1.6.3',
    date: '28 may 2026',
    changes: [
      'Fixed: Reordenación de ejercicios en el histórico (colisión mejorada)',
      'Fixed: Modal de finalizar sesión sin animación de entrada',
      'Mejora: Zona de arrastre en paneles cubre toda la ventana',
    ],
  },
  {
    version: '1.6.2',
    date: '28 may 2026',
    changes: [
      'Nuevo: Animación de entrada elástica en los paneles',
      'Nuevo: Arrastrar el asa para cerrar los paneles',
      'Fixed: Paneles a ancho completo en escritorio',
    ],
  },
  {
    version: '1.6.1',
    date: '28 may 2026',
    changes: [
      'Fixed: Reordenación de ejercicios en el histórico (drag & drop)',
      'Fixed: Menú de serie visible en el último ejercicio de la sesión',
    ],
  },
  {
    version: '1.6.0',
    date: '28 may 2026',
    changes: [
      'Nuevo: Header del usuario compartido y estático entre Dashboard y Progreso',
      'Fixed: Indicador de tab activo mal posicionado tras el swipe',
    ],
  },
  {
    version: '1.5.9',
    date: '28 may 2026',
    changes: [
      'Nuevo: Navegación swipe horizontal fluida entre tabs (estilo Instagram)',
    ],
  },
  {
    version: '1.5.8',
    date: '27 may 2026',
    changes: [
      'Fixed: Margen superior del selector de ejercicio no se mostraba',
    ],
  },
  {
    version: '1.5.7',
    date: '27 may 2026',
    changes: [
      'Mejora: Margen del selector de ejercicio reducido cuando el teclado está abierto',
    ],
  },
  {
    version: '1.5.6',
    date: '27 may 2026',
    changes: [
      'Mejora: Selector de ejercicio se redimensiona al abrir el teclado',
    ],
  },
  {
    version: '1.5.5',
    date: '27 may 2026',
    changes: [
      'Mejora: Buscador del selector de ejercicio fijo al pie del modal',
    ],
  },
  {
    version: '1.5.4',
    date: '27 may 2026',
    changes: [
      'Fixed: Modal del selector flotando al cerrar el teclado',
    ],
  },
  {
    version: '1.5.3',
    date: '27 may 2026',
    changes: [
      'Fixed: Modal del selector descolocado en Android al cerrar el teclado',
    ],
  },
  {
    version: '1.5.2',
    date: '27 may 2026',
    changes: [
      'Fixed: Hueco negro entre el selector de ejercicio y el teclado',
    ],
  },
  {
    version: '1.5.1',
    date: '27 may 2026',
    changes: [
      'Mejora: El selector de ejercicio sube sobre el teclado al escribir',
    ],
  },
  {
    version: '1.5.0',
    date: '27 may 2026',
    changes: [
      'Nuevo: Menú ⋯ en el histórico (editar / eliminar en móvil)',
      'Nuevo: Reordenar ejercicios y series arrastrando',
      'Nuevo: Changelog de versiones',
      'Mejora: Ejercicios ordenados por uso en el selector',
    ],
  },
  {
    version: '1.4.3',
    date: '27 may 2026',
    changes: [
      'Mejora: Gráfico vacío por defecto con mensaje orientativo',
      'Mejora: Vibración táctil reducida a 15 ms',
    ],
  },
  {
    version: '1.4.2',
    date: '27 may 2026',
    changes: [
      'Nuevo: Resumen de récords por ejercicio bajo el gráfico',
      'Nuevo: Swipe horizontal entre Dashboard y Progreso',
    ],
  },
  {
    version: '1.4.1',
    date: '26 may 2026',
    changes: [
      'Nuevo: Filtro temporal en el gráfico (1 mes / 1 año / todo)',
      'Mejora: Escala automática y marcadores de récord en el gráfico',
    ],
  },
  {
    version: '1.4.0',
    date: '26 may 2026',
    changes: [
      'Nuevo: Gráfico de progreso con selección múltiple de ejercicios',
    ],
  },
  {
    version: '1.3.0',
    date: '26 may 2026',
    changes: [
      'Nuevo: Historial agrupado por año con colapso/expansión',
      'Nuevo: Calendario de actividad anual',
      'Mejora: Caché en memoria, animaciones de entrada, vibración háptica',
    ],
  },
  {
    version: '1.2.0',
    date: '26 may 2026',
    changes: [
      'Nuevo: Importación de historial desde CSV',
      'Mejora: Botón central navega a la sesión activa si existe',
    ],
  },
  {
    version: '1.1.0',
    date: '26 may 2026',
    changes: [
      'Nuevo: Perfiles de usuario con foto de avatar',
    ],
  },
  {
    version: '1.0.0',
    date: '—',
    changes: [
      'Lanzamiento inicial',
    ],
  },
]

export default function ChangelogModal({ onClose }) {
  return (
    <BottomSheet onClose={onClose} className="max-h-[82vh] flex flex-col">
      {({ dismiss }) => (
        <>
          <div className="px-4 pb-2 flex items-center justify-between flex-shrink-0">
            <h2 className="text-white font-bold text-lg">Novedades</h2>
            <button onClick={dismiss} className="p-2 text-slate-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-10 space-y-6">
            {CHANGELOG.map(v => (
              <div key={v.version}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-indigo-400 font-bold text-sm">v{v.version}</span>
                  <span className="text-slate-600 text-xs">{v.date}</span>
                  {v.version === __APP_VERSION__ && (
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-medium">actual</span>
                  )}
                </div>
                <ul className="space-y-1.5">
                  {v.changes.map((c, i) => (
                    <ChangeEntry key={i} text={c} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}
    </BottomSheet>
  )
}
