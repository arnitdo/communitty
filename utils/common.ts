import {Request, Response} from "express";
import {verify} from "jsonwebtoken";

type propertyValidatorType = (property: any) => boolean

function validateAuthToken(authToken: string): [boolean, object | null]{
    try {
        const authTokenData = verify(
            authToken,
            // @ts-ignore
            process.env.JWT_SECRET,
            {
                maxAge: "1d"
            }
        )

        if (authTokenData.tokenType == "AUTH") {
            return [true, authTokenData]
        } else {
            return [false, authTokenData]
        }
    } catch (err){
        console.log(err)
        return [false,  null]
    }
}

function validateRefreshToken(refreshToken: string, userName: string): [boolean, object | null]{
    try {
        const authTokenData = verify(
            refreshToken,
            // @ts-ignore
            process.env.JWT_SECRET,
            {
                maxAge: "7d"
            }
        )
        if (authTokenData.userName === userName && authTokenData.tokenType == "REFRESH"){
            return [true, authTokenData]
        } else {
            return [false, authTokenData]
        }
    } catch (err){
        console.log(err)
        return [false,  null]
    }
}


// Middleware for authenticated routes
async function needsToken(req: Request, res: Response, next: () => any): Promise<void>{
    const authHeader = req.header("Authorization")
    if (!authHeader){
        res.status(401).json({
            "actionResult": "NO_AUTH_TOKEN"
        })
    } else {
        const [authTokenValidity, authTokenData] = validateAuthToken(authHeader)
        if (authTokenValidity == false){
            res.status(401).json({
                "actionResult": "AUTH_EXPIRED"
            })
        } else {
            next()
        }
    }
}

export {
    propertyValidatorType,
    validateAuthToken,
    validateRefreshToken,
    needsToken
}
