const pg = require("pg")

if (process.env.NODE_ENV === "development"){
    // Configure environment in case of local deployments, using .env
    const env = require("dotenv")
    env.config()
} else {
    // Do nothing, fetch environment variables from preconfigured deployment environment (e.g Heroku)
}

// Initialize and configure db
// Using node-postgres (i.e) pg for PSQL connection
const db = new pg.Pool({
    connectionString : process.env.DATABASE_URL
})

// Finally, export database connection as default export
module.exports = db