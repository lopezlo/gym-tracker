import { X } from 'lucide-react'

const CHANGELOG = [
  {
    version: '1.5.8',
    date: '27 may 2026',
    changes: [
      'Selector de ejercicio: margen superior siempre visible al abrir sin teclado. Usa CSS calc(100% - 60px) para evitar desbordamiento independientemente del valor JS del viewport.',
    ],
  },
  {
    version: '1.5.7',
    date: '27 may 2026',
    changes: [
      'Selector de ejercicio: margen de 60 px sin teclado y 30 px con teclado abierto. Corregido el cálculo de altura para que el margen siempre sea visible.',
    ],
  },
  {
    version: '1.5.6',
    date: '27 may 2026',
    changes: [
      'Selector de ejercicio: margen superior fijo (60 px) y altura dinámica al abrir el teclado, sin desbordamiento por arriba.',
    ],
  },
  {
    version: '1.5.5',
    date: '27 may 2026',
    changes: [
      'Selector de ejercicio: buscador movido al pie del modal. La lista queda arriba del teclado y es scrollable con espacio completo.',
    ],
  },
  {
    version: '1.5.4',
    date: '27 may 2026',
    changes: [
      'Selector de ejercicio: eliminado el tracking JS del teclado (causaba modal flotante). Ahora usa CSS dvh nativo, sin bugs.',
    ],
  },
  {
    version: '1.5.3',
    date: '27 may 2026',
    changes: [
      'Corrección: modal de ejercicios quedaba flotante al cerrar el teclado en Android',
    ],
  },
  {
    version: '1.5.2',
    date: '27 may 2026',
    changes: [
      'Corrección: hueco negro entre el selector de ejercicio y el teclado (doble offset)',
    ],
  },
  {
    version: '1.5.1',
    date: '27 may 2026',
    changes: [
      'Selector de ejercicio: se desplaza encima del teclado al escribir (visualViewport)',
    ],
  },
  {
    version: '1.5.0',
    date: '27 may 2026',
    changes: [
      'Botón ⋯ de más opciones para editar/eliminar en el historial (compatible móvil)',
      'Arrastrar para reordenar ejercicios y series dentro de una sesión',
      'Selector de ejercicio: ordenado por los más usados',
      'Selector de ejercicio: sin apertura automática de teclado',
      'Selector de ejercicio: título descriptivo',
      'Gráfico de progreso: sin puntos en las líneas',
      'Dashboard: tiempo total redondeado en horas',
      'Corrección del selector de duración desbordado en móvil',
      'Este changelog',
    ],
  },
  {
    version: '1.4.3',
    date: '27 may 2026',
    changes: [
      'Gráfico de progreso vacío por defecto con mensaje orientativo',
      'Vibración táctil reducida a 15 ms',
    ],
  },
  {
    version: '1.4.2',
    date: '27 may 2026',
    changes: [
      'Resumen de récords por ejercicio seleccionado debajo del gráfico',
      'Navegación por deslizamiento horizontal entre Dashboard y Progreso',
    ],
  },
  {
    version: '1.4.1',
    date: '26 may 2026',
    changes: [
      'Filtro de rango temporal en el gráfico: 1 mes / 1 año / Todo',
      'Escala Y automática en el gráfico',
      'Marcadores de récord personal en el gráfico',
      'Persistencia de la selección de ejercicios en el gráfico',
    ],
  },
  {
    version: '1.4.0',
    date: '26 may 2026',
    changes: [
      'Gráfico de progreso con selección múltiple de ejercicios',
      'Etiquetas de color por ejercicio',
    ],
  },
  {
    version: '1.3.0',
    date: '26 may 2026',
    changes: [
      'Historial agrupado por año con colapso/expansión',
      'Calendario de actividad anual con navegación por año',
      'Rendimiento: caché en memoria, pantalla sin saltos',
      'Microinteracciones: esqueletos, animaciones de entrada, píldora de navegación',
      'Vibración háptica en taps (Android)',
    ],
  },
  {
    version: '1.2.0',
    date: '26 may 2026',
    changes: [
      'Importación de historial desde CSV con barra de progreso real',
      'El botón central navega a la sesión activa si la hay',
      'Botón "Finalizar sesión" en rojo',
    ],
  },
  {
    version: '1.1.0',
    date: '26 may 2026',
    changes: [
      'Perfiles de usuario con foto de avatar',
      'Número de versión y fecha de build en el pie',
    ],
  },
  {
    version: '1.0.0',
    date: '—',
    changes: [
      'Lanzamiento inicial',
      'Registro de sesiones con ejercicios de fuerza y tiempo',
      'Dashboard con estadísticas y calendario de actividad',
      'Historial de sesiones con edición de series',
    ],
  },
]

export default function ChangelogModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full bg-slate-800 rounded-t-3xl max-h-[82vh] flex flex-col">
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-slate-600 rounded-full" />
        </div>
        <div className="px-4 pb-2 flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-bold text-lg">Novedades</h2>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
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
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <span className="text-slate-600 mt-0.5 flex-shrink-0 select-none">·</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
