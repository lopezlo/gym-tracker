require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
})

async function migrate() {
  const client = await pool.connect()
  try {
    console.log('Running migrations...')

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         SERIAL PRIMARY KEY,
        name       TEXT NOT NULL UNIQUE,
        avatar     TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    console.log('✓ users')

    await client.query(`
      CREATE TABLE IF NOT EXISTS exercises (
        id         SERIAL PRIMARY KEY,
        name       TEXT NOT NULL UNIQUE,
        type       TEXT NOT NULL DEFAULT 'reps' CHECK (type IN ('reps', 'time')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    console.log('✓ exercises')

    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ended_at   TIMESTAMPTZ,
        notes      TEXT,
        edited_at  TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    console.log('✓ sessions')

    await client.query(`
      CREATE TABLE IF NOT EXISTS sets (
        id          SERIAL PRIMARY KEY,
        session_id  INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL REFERENCES exercises(id),
        weight      NUMERIC,
        reps        INTEGER,
        duration    INTEGER,
        set_order   INTEGER NOT NULL DEFAULT 0,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        edited_at   TIMESTAMPTZ,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    console.log('✓ sets')

    // Indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_user_id  ON sessions(user_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_started   ON sessions(started_at DESC)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sets_session_id    ON sets(session_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sets_exercise_id   ON sets(exercise_id)`)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sets_recorded_at   ON sets(recorded_at DESC)`)
    console.log('✓ indexes')

    console.log('\n✅ Migration complete!')
  } catch (e) {
    console.error('Migration failed:', e.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()
