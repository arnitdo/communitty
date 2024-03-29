import {NextFunction, Request, Response, Router} from 'express'
import {rateLimit} from 'express-rate-limit'

import {serve as serveDocs, setup as setupDocs} from 'swagger-ui-express'

import * as swaggerDocument from '../docs/swagger.json';

import {authRouter} from "./authRoutes";
import {postRouter} from "./postRoutes";
import {commentRouter} from "./commentRoutes";
import {userRouter} from "./userRoutes";
import {feedRouter} from "./feedRoutes";

function sendSwaggerDocument(req: Request, res: Response){
	res.status(200).json(swaggerDocument)
}

function apiHeartbeat(req: Request, res: Response){
	// Returns 200 OK for server heartbeat
	res.status(200).json({
		"actionResult": "SUCCESS"
	})
}

function apiNotFound(req: Request, res: Response){
	// That API route does not exist
	res.status(404).json({
		"actionResult": "ERR_NOT_FOUND"
	})
}

const apiRouter = Router()

// Rate limiter for non-GET requests
const actionRateLimiter = rateLimit({
	windowMs: 5 * 60 * 1000, // 5 Minutes
	max: 25, // 25 non-GET requests per IP / 5 minutes
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

apiRouter.use((req: Request, res: Response, next: NextFunction) => {
	// TS might take the Web API Response type definitions
	// So redirect it to express response using e.

	// Disable caching. This ensures our API data is fresh
	res.header("Cache-Control", 'no-cache')
	next()
})

apiRouter.use("/docs/", serveDocs)

apiRouter.use("/auth/", authRouter)			// -> /api/auth/
apiRouter.use("/posts/", postRouter)		// -> /api/posts/
apiRouter.use("/comments/", commentRouter)	// -> /api/comments/
apiRouter.use("/users/", userRouter)		// -> /api/users/
apiRouter.use("/feed/", feedRouter)			// -> /api/feed/

apiRouter.get("/heartbeat/", apiHeartbeat)

// Serve swagger documentation
apiRouter.get("/docs/", setupDocs(swaggerDocument))
apiRouter.get("/docs/swagger.json", sendSwaggerDocument)
apiRouter.all("*", apiNotFound)	// -> All Methods /api/*

export {
	apiRouter
}