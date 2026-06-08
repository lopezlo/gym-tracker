const router = require('express').Router()
const pool   = require('../db')

// Derive series array from old flat columns (backward compat)
function deriveSeries(ex) {
  if (ex.series) return ex.series
  if (!ex.sets && !ex.weight && !ex.reps_min) return null
  const template = { weight: ex.weight ?? null, reps_min: ex.reps_min ?? null, reps_max: ex.reps_max ?? null, rir: null }
  return Array.from({ length: ex.sets || 1 }, () => ({ ...template }))
}

// GET /api/plans?user_id=X
router.get('/', async (req, res) => {
  const { user_id } = req.query
  if (!user_id) return res.status(400).json({ error: 'user_id required' })
  try {
    const { rows: [plan] } = await pool.query(
      'SELECT * FROM session_plans WHERE user_id = $1',
      [user_id]
    )
    if (!plan) return res.status(404).json({ error: 'No plan' })
    const { rows: exercises } = await pool.query(
      `SELECT e.id, e.name, e.type,
              spe.sets, spe.weight, spe.reps_min, spe.reps_max, spe.series
       FROM session_plan_exercises spe
       JOIN exercises e ON e.id = spe.exercise_id
       WHERE spe.plan_id = $1
       ORDER BY spe.order`,
      [plan.id]
    )
    // Normalise: always return series array
    exercises.forEach(ex => {
      ex.series = deriveSeries(ex)
    })
    plan.exercises = exercises
    res.json(plan)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// PUT /api/plans  (upsert — one plan per user)
router.put('/', async (req, res) => {
  const { user_id, exercises = [] } = req.body
  if (!user_id) return res.status(400).json({ error: 'user_id required' })
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: [plan] } = await client.query(
      `INSERT INTO session_plans (user_id) VALUES ($1)
       ON CONFLICT (user_id) DO UPDATE SET created_at = NOW()
       RETURNING *`,
      [user_id]
    )
    await client.query('DELETE FROM session_plan_exercises WHERE plan_id = $1', [plan.id])
    for (let i = 0; i < exercises.length; i++) {
      const ex = exercises[i]
      const seriesArr = ex.series ?? null
      const firstS    = seriesArr?.[0]
      await client.query(
        `INSERT INTO session_plan_exercises
           (plan_id, exercise_id, "order", sets, weight, reps_min, reps_max, series)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          plan.id,
          ex.id,
          i,
          seriesArr?.length ?? ex.sets ?? 1,
          firstS?.weight    ?? ex.weight   ?? null,
          firstS?.reps_min  ?? ex.reps_min ?? null,
          firstS?.reps_max  ?? ex.reps_max ?? null,
          seriesArr ? JSON.stringify(seriesArr) : null,
        ]
      )
    }
    await client.query('COMMIT')
    plan.exercises = exercises
    res.json(plan)
  } catch (e) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: e.message })
  } finally { client.release() }
})

// DELETE /api/plans?user_id=X
router.delete('/', async (req, res) => {
  const { user_id } = req.query
  if (!user_id) return res.status(400).json({ error: 'user_id required' })
  try {
    await pool.query('DELETE FROM session_plans WHERE user_id = $1', [user_id])
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
