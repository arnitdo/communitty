import * as express from "express"
import * as path from "path"
import * as cors from "cors"
import helmet from "helmet"

import {db} from "./utils/db";

import {apiRouter} from "./routes/apiRoutes";
import {clientRouter} from "./routes/clientRoutes";

// Initialize ExpressJS App
const app = express()

// Configure
app.set("etag", false) // Disable etag-based caching

// PaaS proxies requests, required for express-rate-limit middleware
app.set("trust proxy", true)


app.use(cors())
app.use(helmet())
app.use(express.urlencoded({
	extended: true
}))
app.use(express.json())

// Serve react build files (production build, `react-scripts build`)
// Always keep this on top, static files must be searched through first by the server
app.use(
	express.static(
		path.join(__dirname, 'client/build/')
	)
)

// Use the API router here
app.use("/api/", apiRouter)

// Use the client router to serve client files
app.use(clientRouter)
// Serve app on production port

const appServer = app.listen(process.env.PORT || 8800, () => {
	console.log("Communitty backend server is up and running!")
})

// Many IDEs / Ctrl-Cs send SIGINT to processes
process.on("SIGINT", () => {
	appServer.close()
})

// Heroku sends SIGTERM to processes
process.on("SIGTERM", () => {
	appServer.close()
})

appServer.on('close', async () => {
	await db.end()
	console.log("Stopping communitty backend server")
})