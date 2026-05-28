import { X } from 'lucide-react'
import BottomSheet from './BottomSheet'

const CHANGELOG = [
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
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-slate-600 mt-0.5 flex-shrink-0 select-none">·</span>
                      <span>{c}</span>
                    </li>
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
