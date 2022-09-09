import * as pg from "pg"
import * as dotenv from "dotenv"

if (process.env.NODE_ENV == "development" || process.env.NODE_ENV == undefined){
	dotenv.config()
	// Configure environment in case of local deployments, using .env
} else {
	// Do nothing, fetch environment variables from preconfigured deployment environment (e.g Heroku)
}

// Initialize and configure db
// Using node-postgres (i.e) pg for PSQL connection
const db: pg.Client = new pg.Client({
	connectionString: process.env.DATABASE_URL
});

try {
	(async () => {
		await db.connect();
	})()
} catch (err) {
	console.error("Error connecting to database : ", err)
	process.exit(0)
}

// Finally, export database connection
export {db}