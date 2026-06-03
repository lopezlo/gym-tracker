const router = require('express').Router()
const pool   = require('../db')

// GET /api/routines?user_id=X
router.get('/', async (req, res) => {
  const { user_id } = req.query
  if (!user_id) return res.status(400).json({ error: 'user_id required' })
  try {
    const { rows: routines } = await pool.query(
      'SELECT * FROM routines WHERE user_id = $1 ORDER BY created_at ASC',
      [user_id]
    )
    for (const r of routines) {
      const { rows } = await pool.query(
        `SELECT e.id, e.name, e.type
         FROM routine_exercises re
         JOIN exercises e ON e.id = re.exercise_id
         WHERE re.routine_id = $1
         ORDER BY re.order`,
        [r.id]
      )
      r.exercises = rows
    }
    res.json(routines)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// POST /api/routines
router.post('/', async (req, res) => {
  const { user_id, name, days = [], exercises = [] } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: [r] } = await client.query(
      'INSERT INTO routines (user_id, name, days) VALUES ($1, $2, $3) RETURNING *',
      [user_id, name, days]
    )
    for (let i = 0; i < exercises.length; i++) {
      await client.query(
        'INSERT INTO routine_exercises (routine_id, exercise_id, "order") VALUES ($1, $2, $3)',
        [r.id, exercises[i].id, i]
      )
    }
    await client.query('COMMIT')
    r.exercises = exercises
    res.json(r)
  } catch (e) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: e.message })
  } finally { client.release() }
})

// PUT /api/routines/:id
router.put('/:id', async (req, res) => {
  const { name, days, exercises = [] } = req.body
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: [r] } = await client.query(
      'UPDATE routines SET name = $1, days = $2 WHERE id = $3 RETURNING *',
      [name, days, req.params.id]
    )
    if (!r) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }) }
    await client.query('DELETE FROM routine_exercises WHERE routine_id = $1', [r.id])
    for (let i = 0; i < exercises.length; i++) {
      await client.query(
        'INSERT INTO routine_exercises (routine_id, exercise_id, "order") VALUES ($1, $2, $3)',
        [r.id, exercises[i].id, i]
      )
    }
    await client.query('COMMIT')
    r.exercises = exercises
    res.json(r)
  } catch (e) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: e.message })
  } finally { client.release() }
})

// DELETE /api/routines/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM routines WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
