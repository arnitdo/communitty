import {Request, Response} from "express";
import {JwtPayload, TokenExpiredError, verify} from "jsonwebtoken";
import {db} from "./db";

type propertyValidatorType = (property: any) => boolean

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
function needsBodyParams(...requiredParams: string[]): (req: Request, res: Response, next: () => void) => void {
    // Dynamically generates a middleware function that verifies
    // if all required body params are provided in the request body
    return function (req: Request, res: Response, next: () => void) {
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
                    "actionResult": "ERR_MISSING_PROPERTIES",
                    "missingProperties": missingProperties
                })
            } else {
                next();
            }
        }
    }
}

// Ensures that the current user has activated `true` in database
// Use this middleware *after* the needsToken middleware
async function needsVerifiedUser(req: Request, res: Response, next: () => any): Promise<void> {
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
    baseURL,
    propertyValidatorType,
    validateAuthToken,
    validateRefreshToken,
    getAuthenticatedUser,
    needsToken,
    needsBodyParams,
    needsVerifiedUser
}
