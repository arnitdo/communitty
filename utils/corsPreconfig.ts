import * as cors from "cors"

let originWhitelist: string[]

// Only allow local requests in case of development environment
if (process.env.NODE_ENV === "development"){
    originWhitelist = ["http://localhost"]
} else {
    // Only allow requests from the same origin in case of production environment
    // Yes, this can be spoofed, and it's not the only security method
    // Consider it one of many.
    originWhitelist = ["https://communitty.herokuapp.com"]
}

const corsOptions: object = {
    origin: originWhitelist
}

const preconfiguredCors = cors(corsOptions)

export {preconfiguredCors}