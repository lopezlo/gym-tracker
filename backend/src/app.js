require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const express = require('express')
const cors    = require('cors')
const pool    = require('./db')

// Migrations
pool.query(`ALTER TABLE exercises ADD COLUMN IF NOT EXISTS category VARCHAR(50)`).catch(() => {})
pool.query(`CREATE TABLE IF NOT EXISTS routines (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  days       INTEGER[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
)`).catch(() => {})
pool.query(`CREATE TABLE IF NOT EXISTS routine_exercises (
  id         SERIAL PRIMARY KEY,
  routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  "order"    INTEGER NOT NULL DEFAULT 0
)`).catch(() => {})
pool.query(`CREATE TABLE IF NOT EXISTS session_plans (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
)`).catch(() => {})
pool.query(`CREATE TABLE IF NOT EXISTS session_plan_exercises (
  id       SERIAL PRIMARY KEY,
  plan_id  INTEGER NOT NULL REFERENCES session_plans(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  "order"  INTEGER NOT NULL DEFAULT 0
)`).catch(() => {})
pool.query(`ALTER TABLE session_plan_exercises ADD COLUMN IF NOT EXISTS sets INTEGER DEFAULT 1`).catch(() => {})
pool.query(`ALTER TABLE session_plan_exercises ADD COLUMN IF NOT EXISTS series JSONB`).catch(() => {})
pool.query(`ALTER TABLE session_plan_exercises ADD COLUMN IF NOT EXISTS weight DECIMAL(6,2)`).catch(() => {})
pool.query(`ALTER TABLE session_plan_exercises ADD COLUMN IF NOT EXISTS reps_min INTEGER`).catch(() => {})
pool.query(`ALTER TABLE session_plan_exercises ADD COLUMN IF NOT EXISTS reps_max INTEGER`).catch(() => {})
pool.query(`ALTER TABLE routine_exercises ADD COLUMN IF NOT EXISTS sets INTEGER DEFAULT 1`).catch(() => {})
pool.query(`ALTER TABLE sets ADD COLUMN IF NOT EXISTS rir SMALLINT`).catch(() => {})

const usersRouter    = require('./routes/users')
const exercisesRouter = require('./routes/exercises')
const sessionsRouter = require('./routes/sessions')
const setsRouter     = require('./routes/sets')
const importRouter   = require('./routes/import')
const routinesRouter = require('./routes/routines')
const plansRouter    = require('./routes/plans')

const app = express()

app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.use('/api/users',     usersRouter)
app.use('/api/exercises', exercisesRouter)
app.use('/api/sessions',  sessionsRouter)
app.use('/api/sets',      setsRouter)
app.use('/api/import',    importRouter)
app.use('/api/routines',  routinesRouter)
app.use('/api/plans',     plansRouter)

module.exports = app
