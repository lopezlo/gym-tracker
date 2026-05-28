const BASE = '/api'

async function req(method, path, body, isFormData = false) {
  const opts = { method, headers: {} }
  if (body && !isFormData) {
    opts.headers['Content-Type'] = 'application/json'
    opts.body = JSON.stringify(body)
  } else if (isFormData) {
    opts.body = body
  }
  const res = await fetch(BASE + path, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Error en la petición')
  }
  return res.json()
}

export const api = {
  getUsers: () => req('GET', '/users'),
  createUser: (name) => req('POST', '/users', { name }),
  deleteUser: (id) => req('DELETE', `/users/${id}`),

  getExercises: (userId) => req('GET', `/exercises${userId ? `?user_id=${userId}` : ''}`),
  createExercise: (name, type = 'reps', category = null) => req('POST', '/exercises', { name, type, category }),
  updateExercise: (id, data) => req('PATCH', `/exercises/${id}`, data),

  getSessions: (userId, limit = 50) => req('GET', `/sessions?user_id=${userId}&limit=${limit}`),
  getActiveSession: (userId) => req('GET', `/sessions?user_id=${userId}&active=true&limit=1`),
  getSession: (id) => req('GET', `/sessions/${id}`),
  startSession: (userId) => req('POST', '/sessions', { user_id: userId }),
  endSession: (id, notes) => req('POST', `/sessions/${id}/end`, { notes }),
  addSet: (sessionId, data) => req('POST', `/sessions/${sessionId}/sets`, data),
  deleteSet: (sessionId, setId) => req('DELETE', `/sessions/${sessionId}/sets/${setId}`),

  getStats: (userId) => req('GET', `/sessions/stats/${userId}`),

  updateUser: (id, data) => req('PATCH', `/users/${id}`, data),

  updateSet: (setId, data) => req('PATCH', `/sets/${setId}`, data),
  getLastSet: (exerciseId, userId) => req('GET', `/exercises/${exerciseId}/last-set?user_id=${userId}`),

  deleteSession: (id) => req('DELETE', `/sessions/${id}`),
  updateSession: (id, data) => req('PATCH', `/sessions/${id}`, data),
  reorderSets: (sessionId, setIds) => req('PUT', `/sessions/${sessionId}/reorder`, { setIds }),

  previewCSV: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return req('POST', '/import/preview', fd, true)
  },
  executeImport: (file, userId, mapping) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('user_id', String(userId))
    fd.append('mapping', JSON.stringify(mapping))
    return req('POST', '/import/execute', fd, true)
  },

  executeImportWithProgress: (file, userId, mapping, onUploadProgress) => {
    return new Promise((resolve, reject) => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('user_id', String(userId))
      fd.append('mapping', JSON.stringify(mapping))
      const xhr = new XMLHttpRequest()
      xhr.open('POST', BASE + '/import/execute')
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onUploadProgress?.(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText)
          if (xhr.status >= 200 && xhr.status < 300) resolve(data)
          else reject(new Error(data.error || xhr.statusText))
        } catch { reject(new Error('Respuesta inválida del servidor')) }
      }
      xhr.onerror = () => reject(new Error('Error de red'))
      xhr.send(fd)
    })
  },
}
