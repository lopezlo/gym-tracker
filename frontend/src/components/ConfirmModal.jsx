import BottomSheet from './BottomSheet'

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
}) {
  return (
    <BottomSheet onClose={onCancel}>
      {() => (
        <div className="px-6 pb-6 pt-2 space-y-4">
          <div className="space-y-1">
            <h2 className="text-white font-bold text-lg">{title}</h2>
            {message && <p className="text-slate-400 text-sm">{message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onCancel}
              className="py-3.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`py-3.5 text-white rounded-xl font-semibold transition-colors ${
                danger ? 'bg-red-600 hover:bg-red-500' : 'bg-indigo-600 hover:bg-indigo-500'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  )
}
