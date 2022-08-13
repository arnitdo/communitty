import {Request, Response} from "express";
import {db} from "./db";
import {validateAuthToken, getAuthenticatedUser, stripAuthHeader} from "./common";

type MiddlewareType = (req: Request, res: Response, next: (...args: any[]) => any) => void

// Middleware for authenticated routes
async function needsToken(req: Request, res: Response, next: () => any): Promise<void> {
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
	return function (req: Request, res: Response, next: (...args: any[]) => void) {
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
	return function (req: Request, res: Response, next: (...args: any[]) => void) {
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
async function needsActivatedUser(req: Request, res: Response, next: () => any): Promise<void> {
	try {
		const currentUser = getAuthenticatedUser(req)
		const {rows} = await db.query(
			"SELECT activated FROM users WHERE username = $1",
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

export {
	needsToken,
	needsBodyParams,
	needsURLParams,
	needsActivatedUser
}