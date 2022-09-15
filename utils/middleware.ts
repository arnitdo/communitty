import {Request, Response, NextFunction} from "express";
import {db} from "./db";
import {
	validateAuthToken,
	getAuthenticatedUser,
	stripAuthHeader,
	validatePostId,
	validateCommentId,
	validateUsername
} from "./common";

type MiddlewareType = (req: Request, res: Response, next: NextFunction) => void

// Middleware for authenticated routes
async function needsToken(req: Request, res: Response, next: NextFunction): Promise<void> {
	const authHeader = req.header("Authorization")

	if (!authHeader) {
		res.status(401).json({
			"actionResult": "ERR_NO_TOKEN"
		})
	} else {
		const authToken = stripAuthHeader(authHeader)
		const [authTokenValidity, authTokenData] = validateAuthToken(authToken)
		if (authTokenValidity == false) {
			if (authTokenData == null) {
				// Auth token is invalid
				res.status(401).json({
					"actionResult": "ERR_INVALID_TOKEN"
				})
			} else {
				res.status(401).json({
					"actionResult": "ERR_AUTH_EXPIRED"
				})
			}
		} else {
			next()
		}
	}
}

// Middleware to accept requests that have all the required parameters.
// Reject requests that do not have all listed body params
function needsBodyParams(...requiredParams: string[]): MiddlewareType {
	// Dynamically generates a middleware function that verifies
	// if all required body params are provided in the request body
	return function (req: Request, res: Response, next: NextFunction) {
		if (req.body) {
			const requestParams: string[] = Object.keys(req.body);
			let missingProperties: string[] = [];
			for (const requiredParam of requiredParams) {
				if (requestParams.indexOf(requiredParam) == -1) {
					missingProperties.push(requiredParam);
				}
			}
			if (missingProperties.length > 0) {
				res.status(400).json({
					"actionResult": "ERR_MISSING_BODY_PARAMS",
					"missingProperties": missingProperties
				})
			} else {
				next();
			}
		} else {
			res.status(400).json({
				"actionResult": "ERR_MISSING_BODY_PARAMS",
				"missingProperties": requiredParams
			})
		}
	}
}

function needsURLParams(...requiredParams: string[]): MiddlewareType {
	return function (req: Request, res: Response, next: NextFunction) {
		if (req.params){
			const URLParams: string[] = Object.keys(req.params)
			let missingProperties: string[] = [];
			for (const requiredParam of requiredParams) {
				if (URLParams.indexOf(requiredParam) == -1 || req.params[requiredParam] == null){
					missingProperties.push(requiredParam)
				}
			}
			if (missingProperties.length > 0){
				res.status(400).json({
					"actionResult": "ERR_MISSING_URL_PARAMS",
					"missingProperties": missingProperties
				})
			} else {
				next();
			}
		} else {
			res.status(400).json({
				"actionResult": "ERR_MISSING_URL_PARAMS",
				"missingProperties": requiredParams
			})
		}
	}
}

// Ensures that the current user has activated `true` in database
// Use this middleware *after* the needsToken middleware
async function needsActivatedUser(req: Request, res: Response, next: NextFunction): Promise<void> {
	try {
		const currentUser = getAuthenticatedUser(req)
		const {rows} = await db.query(
			"SELECT activated FROM accounts WHERE username = $1",
			[currentUser]
		)
		if (rows.length == 0){
			res.status(401).json({
				"actionResult": "ERR_INVALID_TOKEN"
			})
		} else {
			const currentUserData = rows[0]
			const currentUserActivated = currentUserData.activated
			if (currentUserActivated == true){
				next()
			} else {
				res.status(401).json({
					"actionResult": "ERR_INACTIVE_USER"
				})
			}
		}
	} catch (err) {
		console.error(err);
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

async function needsValidPost(req: Request, res: Response, next: NextFunction): Promise<void> {
	// Use needsURLParams("postId") *before* this
	const {postId} = req.params
	const isValidPostId = await validatePostId(postId)
	if (isValidPostId == false) {
		res.status(404).json({
			"actionResult": "ERR_INVALID_PROPERTIES",
			"invalidProperties": ["postId"]
		})
		return
	}
	next()
}

async function needsValidComment(req: Request, res: Response, next: NextFunction): Promise<void> {
	// Use needsURLParams("commentId") *before* this
	const {commentId} = req.params
	const isValidCommentId = await validateCommentId(commentId)
	if (isValidCommentId == false) {
		res.status(404).json({
			"actionResult": "ERR_INVALID_PROPERTIES",
			"invalidProperties": ["commentId"]
		})
		return
	}
	next()
}

async function needsValidUser(req: Request, res: Response, next: NextFunction): Promise<void> {
	// Use needsURLParams("userName") before this

	const {userName} = req.params
	const isValidUser = await validateUsername(userName)

	if (isValidUser == false){
		res.status(404).json({
			"actionResult": "ERR_INVALID_PROPERTIES",
			"invalidProperties": ["userName"]
		})
		return
	}
	next()
}
async function needsPostAuthor(req: Request, res: Response, next: NextFunction): Promise<void> {
	// Use *after* needsValidPost middleware
	const {postId} = req.params

	const currentUser = getAuthenticatedUser(req)

	const {rows} = await db.query(
		"SELECT post_author FROM posts WHERE post_id = $1",
		[postId]
	)

	const postAuthor = rows[0].post_author

	if (postAuthor != currentUser){
		// You can't manage someone else's posts!
		res.status(400).json({
			"actionResult": "ERR_INSUFFICIENT_PERMS"
		})
		return
	}

	next()
}

async function needsCommentAuthor(req: Request, res: Response, next: NextFunction): Promise<void> {
	/*
		Use after *needsValidPost* middleware
		And 	  *needsValidComment* middleware
	 */
	const {commentId} = req.params

	const currentUser = getAuthenticatedUser(req)

	const {rows} = await db.query(
		"SELECT comment_author FROM comments WHERE comment_id = $1",
		[commentId]
	)

	const commentAuthor = rows[0].comment_author

	if (commentAuthor != currentUser){
		// You can't manage someone else's posts!
		res.status(400).json({
			"actionResult": "ERR_INSUFFICIENT_PERMS"
		})
		return
	}

	next()
}

export {
	needsToken,
	needsBodyParams,
	needsURLParams,
	needsActivatedUser,
	needsValidPost,
	needsValidComment,
	needsValidUser,
	needsPostAuthor,
	needsCommentAuthor
}