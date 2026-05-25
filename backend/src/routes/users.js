const express = require('express')
const pool = require('../db')
const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users ORDER BY name')
    res.json(rows)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', async (req, res) => {
  const { name } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' })
  try {
    const { rows } = await pool.query(
      'INSERT INTO users (name) VALUES ($1) RETURNING *',
      [name.trim()]
    )
    res.status(201).json(rows[0])
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Ya existe ese usuario' })
    res.status(500).json({ error: e.message })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id])
    if (!rows[0]) return res.status(404).json({ error: 'User not found' })
    const { avatar, name } = req.body
    if (name?.trim()) {
      try {
        await pool.query('UPDATE users SET name = $1 WHERE id = $2', [name.trim(), req.params.id])
      } catch (e) {
        if (e.code === '23505') return res.status(409).json({ error: 'Ya existe ese usuario' })
        return res.status(500).json({ error: e.message })
      }
    }
    if (avatar !== undefined) {
      await pool.query('UPDATE users SET avatar = $1 WHERE id = $2', [avatar, req.params.id])
    }
    const { rows: updated } = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id])
    res.json(updated[0])
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/:id/export', async (req, res) => {
  try {
    const { rows: [user] } = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id])
    if (!user) return res.status(404).json({ error: 'User not found' })

    const { rows: sets } = await pool.query(`
      SELECT
        DATE(s.started_at)                       AS fecha,
        TO_CHAR(st.recorded_at, 'HH24:MI')       AS hora,
        e.name                                   AS ejercicio,
        e.type                                   AS tipo,
        st.weight                                AS peso_kg,
        st.reps                                  AS repeticiones,
        st.duration                              AS duracion_seg,
        s.id                                     AS sesion_id,
        s.started_at                             AS inicio_sesion,
        COALESCE(s.ended_at::TEXT, '')           AS fin_sesion
      FROM sets st
      JOIN exercises e ON e.id = st.exercise_id
      JOIN sessions  s ON s.id = st.session_id
      WHERE s.user_id = $1
      ORDER BY st.recorded_at ASC
    `, [req.params.id])

    const COLS = ['fecha','hora','ejercicio','tipo','peso_kg','repeticiones','duracion_seg','sesion_id','inicio_sesion','fin_sesion']
    const escape = (v) => {
      if (v == null || v === '') return ''
      const s = String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines = [COLS.join(','), ...sets.map(row => COLS.map(c => escape(row[c])).join(','))]
    const csv = '﻿' + lines.join('\r\n')
    const filename = `gymlog_${user.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(csv)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
