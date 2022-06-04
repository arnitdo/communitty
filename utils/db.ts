import * as pg from "pg";
import * as dotenv from "dotenv";

if (process.env.NODE_ENV == "development"){
    dotenv.config()
    // Configure environment in case of local deployments, using .env
} else {
    // Do nothing, fetch environment variables from preconfigured deployment environment (e.g Heroku)
}

// Initialize and configure db
// Using node-postgres (i.e) pg for PSQL connection
const db: pg.Pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
})

// Finally, export database connection as default export
export {db}