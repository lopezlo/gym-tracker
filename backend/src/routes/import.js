const express = require('express')
const multer = require('multer')
const { parse } = require('csv-parse/sync')
const pool = require('../db')
const router = express.Router()

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

// Detect delimiter: Excel in Spain/Europe uses ; instead of ,
function detectDelimiter(content) {
  const firstLine = content.split('\n')[0] || ''
  const semis  = (firstLine.match(/;/g)  || []).length
  const commas = (firstLine.match(/,/g)  || []).length
  const tabs   = (firstLine.match(/\t/g) || []).length
  if (tabs > semis && tabs > commas) return '\t'
  if (semis > commas) return ';'
  return ','
}

router.post('/preview', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' })
  try {
    const content = req.file.buffer.toString('utf-8')
    const delimiter = detectDelimiter(content)
    const records = parse(content, {
      columns: true, skip_empty_lines: true, trim: true, relax_column_count: true, delimiter,
    })
    const headers = records.length > 0 ? Object.keys(records[0]) : []
    res.json({ headers, sample: records.slice(0, 8), total: records.length, delimiter })
  } catch (e) {
    res.status(400).json({ error: 'CSV inválido: ' + e.message })
  }
})

router.post('/execute', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' })
  const { user_id, mapping } = req.body
  if (!user_id) return res.status(400).json({ error: 'user_id required' })

  let columnMap
  try { columnMap = typeof mapping === 'string' ? JSON.parse(mapping) : mapping }
  catch (e) { return res.status(400).json({ error: 'mapping JSON inválido' }) }

  let records
  try {
    const content = req.file.buffer.toString('utf-8')
    const delimiter = detectDelimiter(content)
    records = parse(content, {
      columns: true, skip_empty_lines: true, trim: true, relax_column_count: true, delimiter,
    })
  } catch (e) { return res.status(400).json({ error: 'CSV inválido: ' + e.message }) }

  const byDate = new Map()
  for (const row of records) {
    const exerciseName = columnMap.exercise ? row[columnMap.exercise]?.trim() : null
    if (!exerciseName) continue
    const rawDate = columnMap.date ? row[columnMap.date] : null
    const dateKey = rawDate ? normalizeDate(rawDate) : new Date().toISOString().split('T')[0]
    if (!byDate.has(dateKey)) byDate.set(dateKey, [])
    byDate.get(dateKey).push(row)
  }

  let imported = 0, skipped = 0
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const [dateKey, rows] of byDate) {
      const { rows: [sess] } = await client.query(`
        INSERT INTO sessions (user_id, started_at, ended_at)
        VALUES ($1, ($2 || ' 09:00:00')::TIMESTAMP, ($2 || ' 10:00:00')::TIMESTAMP)
        RETURNING id
      `, [Number(user_id), dateKey])
      const sessionId = sess.id
      let order = 0

      for (const row of rows) {
        const exerciseName = (columnMap.exercise ? row[columnMap.exercise] : null)?.trim()
        if (!exerciseName) { skipped++; continue }

        let { rows: [exercise] } = await client.query(
          'SELECT * FROM exercises WHERE LOWER(name) = LOWER($1)', [exerciseName]
        )
        if (!exercise) {
          const hasTime = columnMap.duration && row[columnMap.duration]?.trim()
          const { rows: [ex] } = await client.query(
            'INSERT INTO exercises (name, type) VALUES ($1, $2) RETURNING *',
            [exerciseName, hasTime ? 'time' : 'reps']
          )
          exercise = ex
        }

        const weight   = columnMap.weight   ? (parseFloat(row[columnMap.weight])  || null) : null
        const reps     = columnMap.reps     ? (parseInt(row[columnMap.reps])       || null) : null
        const duration = columnMap.duration ? (Math.round((parseFloat(row[columnMap.duration]) || 0) * 60) || null) : null

        await client.query(`
          INSERT INTO sets (session_id, exercise_id, weight, reps, duration, recorded_at, set_order)
          VALUES ($1, $2, $3, $4, $5, ($6 || ' 09:00:00')::TIMESTAMP, $7)
        `, [sessionId, exercise.id, weight, reps, duration, dateKey, ++order])
        imported++
      }
    }

    await client.query('COMMIT')
    res.json({ imported, skipped, sessions_created: byDate.size })
  } catch (e) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: e.message })
  } finally {
    client.release()
  }
})

function normalizeDate(str) {
  const s = str.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10)
  const m1 = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/)
  if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return s
}

module.exports = router
