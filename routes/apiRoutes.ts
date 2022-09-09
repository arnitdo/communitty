import {Request, Response, Router} from 'express'
import {rateLimit} from 'express-rate-limit'

import {serve as serveDocs, setup as setupDocs} from 'swagger-ui-express'

import * as swaggerDocument from '../docs/swagger.json';

import {authRouter} from "./authRoutes";
import {postRouter} from "./postRoutes";
import {commentRouter} from "./commentRoutes";

function sendSwaggerDocument(req: Request, res: Response){
	res.status(200).json(swaggerDocument)
}

function apiHeartbeat(req: Request, res: Response){
	// Returns 200 OK for server heartbeat
	res.sendStatus(200)
}

function apiNotFound(req: Request, res: Response){
	// That API route does not exist
	res.sendStatus(404)
}

const apiRouter = Router()

// Rate limiter for non-GET requests
const actionRateLimiter = rateLimit({
	windowMs: 5 * 60 * 1000, // 5 Minutes
	max: 10, // 10 non-GET requests per IP / 5 minutes
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		"actionResult": "ERR_RATE_LIMITED"
	},
	statusCode: 429,
	skip: (req: Request, res: Response) =>{
		if (req.method == "GET") {
			// Allow GET methods without any rate limiting
			return true
		}
		// However, POST / PUT / DELETE methods must be limited to prevent spam
		return false
	}
})

// Rate limiter for GET requests
const requestRateLimiter = rateLimit({
	windowMs: 5 * 60 * 1000, // 5 Minutes
	max: 100,				 // Allow 100 requests / 5 min
	standardHeaders: true,
	legacyHeaders: false,
	statusCode: 429,
	message: {
		"actionResult": "ERR_RATE_LIMITED"
	},
	skip: (req: Request, res: Response) => {
		if (req.method != "GET") {
			return true
		} else {
			return false
		}
	}
})

const swaggerOptions = {
	swaggerOptions: {
		url: "/api/docs/swagger.json"
	}
}

apiRouter.use(actionRateLimiter)					// Ratelimit all API routes
apiRouter.use(requestRateLimiter)

apiRouter.use("/docs/", serveDocs)

apiRouter.use("/auth/", authRouter)			// -> /api/auth/
apiRouter.use("/posts/", postRouter)		// -> /api/posts/
apiRouter.use("/comments/", commentRouter)	// -> /api/comments/

apiRouter.get("/heartbeat/", apiHeartbeat)

// Serve swagger documentation
apiRouter.get("/docs/", setupDocs(swaggerDocument))
apiRouter.get("/docs/swagger.json", sendSwaggerDocument)
apiRouter.all("*", apiNotFound)	// -> All Methods /api/*

export {
	apiRouter
}