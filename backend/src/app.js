require('dotenv').config({ path: require('path').join(__dirname, '../.env') })

const express = require('express')
const cors    = require('cors')
const pool    = require('./db')

// Safe migration: add category column to exercises if not present
pool.query(`ALTER TABLE exercises ADD COLUMN IF NOT EXISTS category VARCHAR(50)`).catch(() => {})

const usersRouter    = require('./routes/users')
const exercisesRouter = require('./routes/exercises')
const sessionsRouter = require('./routes/sessions')
const setsRouter     = require('./routes/sets')
const importRouter   = require('./routes/import')

const app = express()

app.use(cors())
app.use(express.json({ limit: '2mb' }))

app.use('/api/users',     usersRouter)
app.use('/api/exercises', exercisesRouter)
app.use('/api/sessions',  sessionsRouter)
app.use('/api/sets',      setsRouter)
app.use('/api/import',    importRouter)

module.exports = app
