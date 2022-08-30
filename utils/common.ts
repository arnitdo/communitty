import {Request} from "express";
import {JwtPayload, TokenExpiredError, verify} from "jsonwebtoken";
import {db} from "./db"

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
	if (process.env.NODE_ENV == "development" || process.env.NODE_ENV == undefined) {
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

async function validatePostId(postId: string | null): Promise<boolean> {
	if (postId == null){
		return false
	}
	const numericPostId = parseInt(postId)
	if (Number.isNaN(numericPostId)){
		return false
	}

	const {rows} = await db.query(
		"SELECT 1 FROM posts WHERE post_id = $1",
		[postId]
	)
	if (rows.length == 0){
		return false
	}
	return true
}

async function validateCommentId(commentId: string | null): Promise<boolean> {
	if (commentId == null){
		return false
	}

	const numericCommentId = parseInt(commentId)
	if (Number.isNaN(numericCommentId)){
		return false
	}

	const {rows} = await db.query(
		"SELECT 1 FROM comments WHERE comment_id = $1",
		[numericCommentId]
	)

	if (rows.length == 0){
		return false
	}
	return true
}

function normalizeObjectKeys(obj: any, skipValueKeys?: string[]): any {
	// skipValueKeys: optional array of parameters copy as-is
	// 				  use for compound objects such as dates
	// Converts snake_case_props to camelCaseProps
	const propKeys = Object.keys(obj)
	let clonedObject = Object.create({})
	propKeys.forEach((propKey) => {
		const keyTokens = propKey.split('_')
		const firstToken = keyTokens[0]
		const nextKeyTokens = keyTokens.slice(1) // Get the second token onwards
		const upperKeyTokens = nextKeyTokens.map((keyToken) => {
			keyToken = keyToken.toLowerCase()
			const firstChar = keyToken
				.charAt(0)
				.toUpperCase()
			const restChars = keyToken.slice(1) // Get second character onwards in string
			return firstChar + restChars
		})
		const finalPropKey = firstToken.concat(...upperKeyTokens)
		const currentValue = obj[propKey]
		if (skipValueKeys){
			if (skipValueKeys.indexOf(propKey) != -1){
				clonedObject[finalPropKey] = currentValue
				return
			}
		}
		// copy nulls and undefined values as-are
		if (currentValue == null){
			clonedObject[finalPropKey] = currentValue
			return
		}
		if (typeof currentValue == 'object'){
			// Recursively process nested objects within the main object
			clonedObject[finalPropKey] = normalizeObjectKeys(currentValue)
		} else {
			// Or simply copy the value if it is a primitive type
			clonedObject[finalPropKey] = currentValue
		}
	})
	return clonedObject
}

export {
	baseURL,
	PropertyValidatorType,
	validateAuthToken,
	validateRefreshToken,
	getAuthenticatedUser,
	stripAuthHeader,
	validateProperties,
	validatePostId,
	validateCommentId,
	normalizeObjectKeys
}
