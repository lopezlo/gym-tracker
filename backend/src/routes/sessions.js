const express = require('express')
const pool = require('../db')
const router = express.Router()

// Stats — must come before /:id to avoid route conflict
router.get('/stats/:userId', async (req, res) => {
  const { userId } = req.params
  try {
    const { rows: calendarData } = await pool.query(`
      SELECT
        DATE(started_at)                                                        AS date,
        COUNT(*)                                                                AS session_count,
        SUM(CASE WHEN ended_at IS NOT NULL
          THEN EXTRACT(EPOCH FROM (ended_at - started_at))::INTEGER / 60
          ELSE 0 END)                                                           AS total_minutes
      FROM sessions
      WHERE user_id = $1 AND started_at >= NOW() - INTERVAL '13 months'
      GROUP BY DATE(started_at)
      ORDER BY date ASC
    `, [userId])

    const { rows: exerciseProgress } = await pool.query(`
      SELECT
        st.id,
        DATE(st.recorded_at)  AS date,
        st.recorded_at,
        e.id                  AS exercise_id,
        e.name                AS exercise_name,
        e.type                AS exercise_type,
        st.weight,
        st.reps,
        st.duration,
        s.id                  AS session_id
      FROM sets st
      JOIN exercises e ON e.id = st.exercise_id
      JOIN sessions  s ON s.id = st.session_id
      WHERE s.user_id = $1
      ORDER BY st.recorded_at ASC
    `, [userId])

    res.json({ calendarData, exerciseProgress })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/', async (req, res) => {
  const { user_id, limit = 50, active } = req.query
  if (!user_id) return res.status(400).json({ error: 'user_id required' })
  try {
    let query = `
      SELECT s.*,
        COUNT(DISTINCT st.id)          AS set_count,
        COUNT(DISTINCT st.exercise_id) AS exercise_count
      FROM sessions s
      LEFT JOIN sets st ON st.session_id = s.id
      WHERE s.user_id = $1
    `
    const params = [user_id]
    if (active === 'true') query += ' AND s.ended_at IS NULL'
    query += ` GROUP BY s.id ORDER BY s.started_at DESC LIMIT $${params.length + 1}`
    params.push(Number(limit))
    const { rows } = await pool.query(query, params)
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/:id', async (req, res) => {
  try {
    const { rows: [session] } = await pool.query(
      'SELECT * FROM sessions WHERE id = $1', [req.params.id]
    )
    if (!session) return res.status(404).json({ error: 'Session not found' })
    const { rows: sets } = await pool.query(`
      SELECT st.*, e.name AS exercise_name, e.type AS exercise_type
      FROM sets st
      JOIN exercises e ON e.id = st.exercise_id
      WHERE st.session_id = $1
      ORDER BY st.set_order ASC, st.recorded_at ASC
    `, [req.params.id])
    res.json({ ...session, sets })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', async (req, res) => {
  const { user_id } = req.body
  if (!user_id) return res.status(400).json({ error: 'user_id required' })
  try {
    const { rows: [session] } = await pool.query(
      'INSERT INTO sessions (user_id) VALUES ($1) RETURNING *',
      [user_id]
    )
    res.status(201).json({ ...session, sets: [] })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/:id/end', async (req, res) => {
  const { notes } = req.body
  try {
    const { rows: [session] } = await pool.query(
      'UPDATE sessions SET ended_at = NOW(), notes = COALESCE($1, notes) WHERE id = $2 RETURNING *',
      [notes || null, req.params.id]
    )
    res.json(session)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/:id/sets', async (req, res) => {
  const { exercise_id, weight, reps, duration } = req.body
  if (!exercise_id) return res.status(400).json({ error: 'exercise_id required' })
  try {
    const { rows: [{ max_order }] } = await pool.query(
      'SELECT COALESCE(MAX(set_order), 0) AS max_order FROM sets WHERE session_id = $1',
      [req.params.id]
    )
    const { rows: [set] } = await pool.query(`
      INSERT INTO sets (session_id, exercise_id, weight, reps, duration, set_order)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [req.params.id, exercise_id, weight ?? null, reps ?? null, duration ?? null, Number(max_order) + 1])

    const { rows: [result] } = await pool.query(`
      SELECT st.*, e.name AS exercise_name, e.type AS exercise_type
      FROM sets st JOIN exercises e ON e.id = st.exercise_id
      WHERE st.id = $1
    `, [set.id])
    res.status(201).json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:sessionId/sets/:setId', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM sets WHERE id = $1 AND session_id = $2',
      [req.params.setId, req.params.sessionId]
    )
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.patch('/:id', async (req, res) => {
  try {
    const { rows: [session] } = await pool.query(
      'SELECT * FROM sessions WHERE id = $1', [req.params.id]
    )
    if (!session) return res.status(404).json({ error: 'Session not found' })
    const { started_at, ended_at } = req.body
    const { rows: [updated] } = await pool.query(`
      UPDATE sessions SET
        started_at = COALESCE($1, started_at),
        ended_at   = COALESCE($2, ended_at),
        edited_at  = NOW()
      WHERE id = $3 RETURNING *
    `, [started_at ?? null, ended_at ?? null, req.params.id])
    res.json(updated)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM sessions WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
