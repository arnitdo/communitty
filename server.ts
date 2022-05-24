import * as express from "express";
import * as path from "path";
import * as clientRoutes from "./routes/clientRoutes";
import * as authRoutes from "./routes/authRoutes"
import {preconfiguredCors} from "./utils/corsPreconfig";
import helmet from "helmet";


// Initialize ExpressJS App
const app = express();

// Configure
app.use(preconfiguredCors)
app.use(helmet())

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
app.post("/api/signup", authRoutes.userSignup)

app.get("*", clientRoutes.serveClient);

// Serve app on production port
// Empty callback as of now
app.listen(process.env.PORT || 8800, () => {})