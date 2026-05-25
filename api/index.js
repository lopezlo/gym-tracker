// Vercel serverless entry point — re-exports the Express app
const app = require('../backend/src/app')
module.exports = app
