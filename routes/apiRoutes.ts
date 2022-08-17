import {Request, Response, Router} from 'express'
import {rateLimit} from 'express-rate-limit'

import {authRouter} from "./authRoutes";
import {postRouter} from "./postRoutes";

function apiNotFound(req: Request, res: Response){
	// That API route does not exist
	res.sendStatus(404)
}

const apiRouter = Router()

const rateLimiter = rateLimit({
	windowMs: 5 * 60 * 1000, // 5 Minutes
	max: 10, // 100 non-GET requests per IP / 5 minutes
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

apiRouter.use(rateLimiter)

apiRouter.use("/auth/", authRouter)		// -> /api/auth/
apiRouter.use("/posts/", postRouter)	// -> /api/posts/

apiRouter.all("*", apiNotFound)	// -> All Methods /api/*

export {
	apiRouter
}