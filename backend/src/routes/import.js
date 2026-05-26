const express = require('express')
const multer = require('multer')
const { parse } = require('csv-parse/sync')
const pool = require('../db')
const router = express.Router()

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

// Detect delimiter from raw buffer — handles BOM and all line endings
function detectDelimiter(buffer) {
  let start = 0
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) start = 3
  let lineEnd = buffer.indexOf(0x0A, start)
  if (lineEnd === -1) lineEnd = buffer.length
  const firstLine = buffer.slice(start, lineEnd).toString('utf-8').replace(/\r$/, '')
  const semis  = (firstLine.match(/;/g)  || []).length
  const commas = (firstLine.match(/,/g)  || []).length
  const tabs   = (firstLine.match(/\t/g) || []).length
  if (tabs > semis && tabs > commas) return '\t'
  if (semis > commas) return ';'
  return ','
}

function parseContent(buffer) {
  const delimiter = detectDelimiter(buffer)
  const content = buffer.toString('utf-8').replace(/^﻿/, '')
  return parse(content, {
    columns: true, skip_empty_lines: true, trim: true, relax_column_count: true, delimiter,
  })
}

router.post('/preview', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' })
  try {
    const records = parseContent(req.file.buffer)
    const headers = records.length > 0 ? Object.keys(records[0]) : []
    res.json({ headers, sample: records.slice(0, 8), total: records.length })
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
  try { records = parseContent(req.file.buffer) }
  catch (e) { return res.status(400).json({ error: 'CSV inválido: ' + e.message }) }

  // Group rows by date
  const byDate = new Map()
  let skipped = 0
  for (const row of records) {
    const exerciseName = columnMap.exercise ? row[columnMap.exercise]?.trim() : null
    if (!exerciseName) { skipped++; continue }
    const rawDate = columnMap.date ? row[columnMap.date] : null
    const dateKey = rawDate ? normalizeDate(rawDate) : new Date().toISOString().split('T')[0]
    if (!byDate.has(dateKey)) byDate.set(dateKey, [])
    byDate.get(dateKey).push(row)
  }

  const durationIsSeconds = columnMap.duration && /seg|sec/i.test(columnMap.duration)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // ── 1. Pre-load all existing exercises into memory (1 query) ──
    const { rows: existingExercises } = await client.query('SELECT id, name, type FROM exercises')
    const exerciseCache = new Map(existingExercises.map(e => [e.name.toLowerCase(), e]))

    // ── 2. Find missing exercises and insert them (1 query each, usually very few) ──
    const toInsert = new Map()
    for (const [, rows] of byDate) {
      for (const row of rows) {
        const name = columnMap.exercise ? row[columnMap.exercise]?.trim() : null
        if (!name) continue
        const key = name.toLowerCase()
        if (!exerciseCache.has(key) && !toInsert.has(key)) {
          const hasTime = columnMap.duration && row[columnMap.duration]?.trim()
          toInsert.set(key, { name, type: hasTime ? 'time' : 'reps' })
        }
      }
    }
    for (const { name, type } of toInsert.values()) {
      const { rows: [ex] } = await client.query(
        `INSERT INTO exercises (name, type) VALUES ($1, $2)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id, name, type`,
        [name, type]
      )
      exerciseCache.set(ex.name.toLowerCase(), ex)
    }

    // ── 3. Batch-insert all sessions in one query ──
    const dateList = [...byDate.keys()]
    const sessValues = dateList.map((_, i) =>
      `($1::int, ($${i + 2}::text || ' 09:00:00')::TIMESTAMP, ($${i + 2}::text || ' 10:00:00')::TIMESTAMP)`
    ).join(',')
    const { rows: sessions } = await client.query(
      `INSERT INTO sessions (user_id, started_at, ended_at) VALUES ${sessValues}
       RETURNING id, TO_CHAR(DATE(started_at), 'YYYY-MM-DD') AS date`,
      [Number(user_id), ...dateList]
    )
    const sessionMap = new Map(sessions.map(s => [s.date, s.id]))

    // ── 4. Build set rows, insert in chunks of 500 (avoids param limit) ──
    const CHUNK = 500
    const setRows  = []  // VALUES strings
    const setParams = [] // flat param array
    let imported = 0

    for (const [dateKey, rows] of byDate) {
      const sessionId = sessionMap.get(dateKey)
      if (!sessionId) continue
      let order = 0
      for (const row of rows) {
        const name = columnMap.exercise ? row[columnMap.exercise]?.trim() : null
        if (!name) continue
        const exercise = exerciseCache.get(name.toLowerCase())
        if (!exercise) continue

        const weight = columnMap.weight   ? (parseFloat(row[columnMap.weight])  || null) : null
        const reps   = columnMap.reps     ? (parseInt(row[columnMap.reps])       || null) : null
        const raw    = columnMap.duration ? (parseFloat(row[columnMap.duration]) || 0)    : 0
        const duration = raw
          ? (durationIsSeconds ? Math.round(raw) : Math.round(raw * 60))
          : null

        const base = setParams.length
        setRows.push(
          `($${base+1}::int, $${base+2}::int, $${base+3}::numeric, $${base+4}::int, $${base+5}::int, ($${base+6}::text || ' 09:00:00')::TIMESTAMP, $${base+7}::int)`
        )
        setParams.push(sessionId, exercise.id, weight, reps, duration, dateKey, ++order)
        imported++
      }
    }

    for (let i = 0; i < setRows.length; i += CHUNK) {
      const chunkRows   = setRows.slice(i, i + CHUNK)
      const chunkParams = setParams.slice(i * 7, (i + CHUNK) * 7)
      await client.query(
        `INSERT INTO sets (session_id, exercise_id, weight, reps, duration, recorded_at, set_order)
         VALUES ${chunkRows.join(',')}`,
        chunkParams
      )
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
