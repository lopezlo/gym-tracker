const express = require('express')
const pool = require('../db')
const router = express.Router()

router.patch('/:id', async (req, res) => {
  try {
    const { rows: [set] } = await pool.query('SELECT * FROM sets WHERE id = $1', [req.params.id])
    if (!set) return res.status(404).json({ error: 'Set not found' })
    const { weight, reps, duration, recorded_at } = req.body
    await pool.query(`
      UPDATE sets SET
        weight      = $1,
        reps        = $2,
        duration    = $3,
        recorded_at = COALESCE($4, recorded_at),
        edited_at   = NOW()
      WHERE id = $5
    `, [weight ?? null, reps ?? null, duration ?? null, recorded_at ?? null, req.params.id])
    const { rows: [result] } = await pool.query(`
      SELECT st.*, e.name AS exercise_name, e.type AS exercise_type
      FROM sets st JOIN exercises e ON e.id = st.exercise_id
      WHERE st.id = $1
    `, [req.params.id])
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
