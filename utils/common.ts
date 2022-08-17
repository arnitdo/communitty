import {Request, Response} from "express";
import {JwtPayload, TokenExpiredError, verify} from "jsonwebtoken";

type PropertyValidatorType = (property: any) => boolean

function validateAuthToken(authToken: string): [boolean, JwtPayload | null] {
	let authTokenData: JwtPayload = {}
	try {
		authTokenData = verify(
			authToken,
			// @ts-ignore
			process.env.JWT_SECRET,
			{
				maxAge: "1h"
			}
		)
		if (authTokenData.tokenType == "AUTH") {
			return [true, authTokenData]
		} else {
			return [false, authTokenData]
		}
	} catch (err) {
		console.error(err)
		// Note that jsonwebtoken errs `JsonWebTokenError` on invalid token
		if (err instanceof TokenExpiredError) {
			return [false, authTokenData]
		}
		return [false, null]
	}
}

function validateRefreshToken(refreshToken: string, userName: string): [boolean, JwtPayload | null] {
	let refreshTokenData: JwtPayload = {}
	try {
		refreshTokenData = verify(
			refreshToken,
			// @ts-ignore
			process.env.JWT_SECRET,
			{
				maxAge: "1d"
			}
		)
		if (refreshTokenData.userName === userName && refreshTokenData.tokenType === "REFRESH") {
			return [true, refreshTokenData]
		} else {
			return [false, refreshTokenData]
		}
	} catch (err) {
		console.error(err)
		// Note that jsonwebtoken errs `JsonWebTokenError` on invalid token
		if (err instanceof TokenExpiredError) {
			return [false, refreshTokenData]
		}
		return [false, null]
	}
}

function baseURL(): string {
	if (process.env.NODE_ENV === "development" || process.env.NODE_ENV == undefined) {
		return "http://localhost:8800"
	} else {
		return "https://communitty.herokuapp.com"
	}
}


// Returns the username of the current JWT Authenticated user
// Use this only on routes that use `needsToken` middleware to validate authToken
function getAuthenticatedUser(req: Request): string {
	const authHeader = req.header("Authorization")!
	const authToken = stripAuthHeader(authHeader)
	const [authTokenValidity, authTokenData] = validateAuthToken(authToken)
	// Note that here, authTokenValidity will *always* be `true`
	// The previous middleware (needsToken) will always filter out
	// requests that do not have a valid token
	// Hence, it is safe to ignore the value here
	// Similarly, authTokenData will always be a valid object
	const authUsername = authTokenData!.userName
	return authUsername
}

// Strip the `Bearer ` section of Authorization header
function stripAuthHeader(authHeader: string): string {
	const lowercaseHeader = authHeader.toLowerCase()
	// 'BEARER '
	//  ^^^^^^^ <- 7 characters to remove
	if (lowercaseHeader.startsWith("bearer ")) {
		const strippedHeader = authHeader.slice(7)
		return strippedHeader
	}
	return authHeader
}


function validateProperties(properties: object, propertyValidators: PropertyValidatorType[]) {
	// A generic property validating function
	// Returns two arrays, valid and invalid properties
	let validProperties: string[] = [],     // List of valid properties
		invalidProperties: string[] = []    // List of invalid properties
	const propertyNames = Object.keys(properties) // List of property names
	propertyNames.forEach((propertyName: string, propertyIndex: number) => { // For each property, do
		// @ts-ignore
		const propertyValue = properties[propertyName] // Get property value from name
		const propertyValidator: PropertyValidatorType = propertyValidators[propertyIndex] // Get corresponding validator
		const validProperty = propertyValidator(propertyValue) // Get validation result (boolean)
		if (validProperty) {
			validProperties.push(propertyName) // Mark as valid property
		} else {
			invalidProperties.push(propertyName) // Mark as invalid property
		}
	})
	return [validProperties, invalidProperties]
}

export {
	baseURL,
	PropertyValidatorType,
	validateAuthToken,
	validateRefreshToken,
	getAuthenticatedUser,
	stripAuthHeader,
	validateProperties
}
