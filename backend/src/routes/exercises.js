const express = require('express')
const pool = require('../db')
const router = express.Router()

router.get('/', async (req, res) => {
  const { user_id } = req.query
  try {
    if (user_id) {
      const { rows } = await pool.query(`
        SELECT e.*, COUNT(s.id) as use_count
        FROM exercises e
        LEFT JOIN sets s ON s.exercise_id = e.id
        LEFT JOIN sessions sess ON s.session_id = sess.id AND sess.user_id = $1
        GROUP BY e.id
        ORDER BY use_count DESC, e.name ASC
      `, [user_id])
      res.json(rows)
    } else {
      const { rows } = await pool.query('SELECT *, 0 as use_count FROM exercises ORDER BY name')
      res.json(rows)
    }
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', async (req, res) => {
  const { name, type = 'reps', category = null } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' })
  if (!['reps', 'time'].includes(type)) return res.status(400).json({ error: 'type must be reps or time' })
  try {
    const { rows } = await pool.query(
      'INSERT INTO exercises (name, type, category) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), type, category ?? null]
    )
    res.status(201).json(rows[0])
  } catch (e) {
    if (e.code === '23505') {
      const { rows } = await pool.query(
        'SELECT * FROM exercises WHERE LOWER(name) = LOWER($1)',
        [name.trim()]
      )
      return res.status(200).json(rows[0])
    }
    res.status(500).json({ error: e.message })
  }
})

router.patch('/:id', async (req, res) => {
  const { category } = req.body
  try {
    const { rows: [ex] } = await pool.query(
      'UPDATE exercises SET category = $1 WHERE id = $2 RETURNING *',
      [category ?? null, req.params.id]
    )
    if (!ex) return res.status(404).json({ error: 'Exercise not found' })
    res.json(ex)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/:id/last-set', async (req, res) => {
  const { user_id } = req.query
  if (!user_id) return res.status(400).json({ error: 'user_id required' })
  try {
    const { rows } = await pool.query(`
      SELECT st.* FROM sets st
      JOIN sessions s ON s.id = st.session_id
      WHERE st.exercise_id = $1 AND s.user_id = $2
      ORDER BY st.recorded_at DESC LIMIT 1
    `, [req.params.id, user_id])
    res.json(rows[0] || null)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
