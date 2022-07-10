import * as express from "express"
import * as path from "path"
import * as clientRoutes from "./routes/clientRoutes"
import * as authRoutes from "./routes/authRoutes"
import {preconfiguredCors} from "./utils/corsPreconfig"
import helmet from "helmet"

// Initialize ExpressJS App
const app = express()

// Configure
app.use(preconfiguredCors)
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
app.post("/api/user_signup", authRoutes.userSignup)
app.post("/api/user_verify", authRoutes.userVerify)
app.post("/api/user_login", authRoutes.userLogin)
app.post("/api/token_refresh", authRoutes.userTokenRefresh)
app.get("*", clientRoutes.serveClient)

// Serve app on production port
// Empty callback as of now
app.listen(process.env.PORT || 8800, () => {
    console.log("Communitty backend server is up and running!")
})