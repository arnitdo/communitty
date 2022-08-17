import * as express from "express"
import * as path from "path"
import * as cors from "cors"
import helmet from "helmet"

import * as middleware from "./utils/middleware"
import {db} from "./utils/db";

import * as clientRoutes from "./routes/clientRoutes"
import * as authRoutes from "./routes/authRoutes"
import * as postRoutes from "./routes/postRoutes"

// Initialize ExpressJS App
const app = express()

// Configure
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

// TODO : Expand for all routes

// Serve client on all routes
// Client side routing will be handled by react-router
app.post(
	"/api/auth/user_signup",
	middleware.needsBodyParams("userName", "userMail", "userPass", "fullName"),
	authRoutes.userSignup
)
app.post(
	"/api/auth/user_activate",
	middleware.needsBodyParams("userName", "activationToken"),
	authRoutes.userActivate
)
app.post(
	"/api/auth/user_login",
	middleware.needsBodyParams("userName",  "userPass"),
	authRoutes.userLogin
)

app.post(
	"/api/auth/token_refresh",
	middleware.needsBodyParams("authToken", "refreshToken"),
	authRoutes.userTokenRefresh
)

app.post(
	"/api/posts/new",
	[
		middleware.needsToken,
		middleware.needsActivatedUser,
		middleware.needsBodyParams("postTitle", "postBody") // "postTags" and "postType" is optional here!
	],
	postRoutes.createPost
)

app.get(
	"/api/posts/:postId/",
	middleware.needsURLParams("postId"),
	postRoutes.getPost
)

app.put(
	"/api/posts/:postId/",
	[
		middleware.needsToken,
		middleware.needsURLParams("postId"),
		middleware.needsPostAuthor,
		middleware.needsBodyParams("postTitle", "postBody") // See above ^
	],
	postRoutes.updatePost
)

app.delete(
	"/api/posts/:postId/",
	[
		middleware.needsToken,
		middleware.needsURLParams("postId"),
		middleware.needsPostAuthor
	],
	postRoutes.deletePost
)

app.get("/api/*", clientRoutes.apiNotFound)

app.get("*", clientRoutes.serveClient)

// Serve app on production port
// Empty callback as of now
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