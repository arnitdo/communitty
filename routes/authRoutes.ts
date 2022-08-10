import {db} from "../utils/db"
import {sendActivationMail} from "../utils/emailService"
import {sign, verify} from "jsonwebtoken"
import {hash, compare} from "bcrypt"
import {Request, Response} from "express"
import {PropertyValidatorType, validateAuthToken, validateRefreshToken} from "../utils/common"

function validateEmail(email: string): boolean {
    let emailRegex: RegExp = /^[\w+-.]*@[^.][a-z.-]*\.[a-zA-Z]{2,}$/
    // See https://regex101.com/r/8COrEJ/2
    if (email.match(emailRegex)) {
        return true
    }
    return false
}

function validateUsername(userName: string): boolean {
    let usernameRegex: RegExp = /^[\w_-]{5,}$/
    // Should only allow basic usernames, no special characters
    if (userName.match(usernameRegex)) {
        return true
    }
    return false
}

function validatePassword(password: string): boolean {
    let passwordRegex: RegExp = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@_$!%*?&])[\w@$!%*?&]{8,}$/
    //                            |lowercase|uppercase|numeric|  special char | min 8 chars combined
    // See https://stackoverflow.com/questions/19605150/regex-for-password-must-contain-at-least-eight-characters-at-least-one-number-a
    // Slightly modified to allow underscores as well
    if (password.match(passwordRegex)) {
        return true
    }
    return false
}

function validateFullName(fullName: string): boolean {
    let fullNameRegex: RegExp = /[a-zA-Z]{2,}.*/
    // Full name must have at least two characters, and anything after that.
    if (fullName.match(fullNameRegex)) {
        return true
    }
    return false
}

function generateAuthAndRefreshTokens(userName: string): [object, object] {
    const signedAuthToken = sign(
        {
            userName: userName,
            tokenType: "AUTH"
        },
        // @ts-ignore
        process.env.JWT_SECRET,
        {
            expiresIn: "1h"
        }
    )

    const signedRefreshToken = sign(
        {
            userName: userName,
            tokenType: "REFRESH"
        },
        // @ts-ignore
        process.env.JWT_SECRET,
        {
            expiresIn: "1d"
        }
    )

    return [signedAuthToken, signedRefreshToken]
}


async function isDuplicateUser(userName: string, userMail: string): Promise<boolean[]> {
    // Returns true for respective property if user already exists with same username or email
    // Else returns [false, false]
    let {rows} = await db.query(
        "SELECT * FROM users WHERE username = $1",
        [userName]
    )
    const isDuplicateUserName: boolean = (rows.length != 0);

    ({rows} = await db.query(
        "SELECT * FROM users WHERE email = $1",
        [userMail]
    ))

    const isDuplicateUserMail: boolean = (rows.length != 0)

    return [isDuplicateUserName, isDuplicateUserMail]
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

function generateVerificationToken() {
    // Length of token to generate
    const tokenLength = 64
    let verificationToken = ""
    // Set of characters to generate token from
    const charSet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
    for (let idx = 0; idx < tokenLength; idx++) {
        let randomIndex = Math.floor(
            Math.random() * (charSet.length - 1)
        )
        verificationToken += charSet[randomIndex]
    }
    return verificationToken
}

async function userSignup(req: Request, res: Response): Promise<void> {
    try {
        const {userName, userMail, userPass, fullName} = req.body // Get required request parameters
        const requestProperties: object = {     // Key-Value map of property name : property value
            userName,
            userMail,
            userPass,
            fullName
        }
        const propertyValidators: PropertyValidatorType[] = [   // List of property validator functions
            validateUsername, validateEmail, validatePassword, validateFullName
        ]
        // Get valid and invalid properties
        const [validProperties, invalidProperties] = validateProperties(requestProperties, propertyValidators)
        if (invalidProperties.length > 0) {
            // If there are some invalid properties, respond with 400
            res.status(400).json(
                {
                    "actionResult": "ERR_INVALID_PROPERTIES", // Send valid and invalid properties
                    "invalidProperties": invalidProperties
                }
            )
        } else {
            await db.query("BEGIN;") // Begin DB Transaction
            const [isDuplicateUserName, isDuplicateUserMail] = await isDuplicateUser(userName, userMail)
            if (isDuplicateUserName || isDuplicateUserMail) {
                let duplicateProperties: string[] = []
                if (isDuplicateUserName) {
                    duplicateProperties.push("userName")
                }
                if (isDuplicateUserMail) {
                    duplicateProperties.push("userMail")
                }
                res.status(400).json({
                    "actionResult": "ERR_DUPLICATE_PROPERTIES",
                    "duplicateProperties": duplicateProperties
                })
            } else {
                const passHash: string = await hash(userPass, 10)
                const verificationToken = generateVerificationToken()
                await db.query(
                    "INSERT INTO users VALUES ($1, $2, $3, $4, NOW(), DEFAULT);",
                    [userName, userMail, passHash, fullName]
                )
                await db.query(
                    "INSERT INTO inactive_users VALUES ($1, $2);",
                    [userName, verificationToken]
                )
                // Send verification mail
                await sendActivationMail(userMail, userName, verificationToken)
                await db.query("COMMIT;")      // Commit transaction to db
                res.status(200).json({
                    "actionResult": "SUCCESS"                 // Notify of success
                })
            }
        }
    } catch (err) {
        console.error(err)
        await db.query("ROLLBACK;")
        res.status(500).json({
            "actionResult": "ERR_INTERNAL_ERROR"
        })
    }
}

async function userActivate(req: Request, res: Response): Promise<void> {
    try {
        const {userName, activationToken} = req.body
        await db.query("BEGIN;")
        const {rows} = await db.query(
            "DELETE FROM inactive_users WHERE username = $1 AND activationToken = $2 RETURNING *",
            [userName, activationToken]
        )
        if (rows.length > 0) {
            // Activate our user
            await db.query(
                "UPDATE users SET activated = True WHERE username = $1",
                [userName]
            )
            res.status(200).json({
                "actionResult": "SUCCESS"
            })
        } else {
            res.status(400).json({
                "actionResult": "ERR_INVALID_PROPERTIES",
                "invalidProperties": ["userName", "activationToken"]
            })
        }
        await db.query("COMMIT;")
    } catch (err) {
        console.error(err)
        res.status(500).json({
            "actionResult": "ERR_INTERNAL_ERROR",
        })
        await db.query("ROLLBACK;")
    }
}

async function userLogin(req: Request, res: Response): Promise<void> {
    try {
        const {userName, userPass} = req.body
        const {rows} = await db.query(
            "SELECT username, password FROM users WHERE username = $1 LIMIT 1",
            [userName]
        )

        if (rows.length == 0) {
            res.status(400).json({
                "actionResult": "ERR_INVALID_PROPERTIES",
                "invalidProperties": ["userName", "userPass"]
            })
            return
        }

        const {username, password} = rows[0]

        const passwordMatch = await compare(userPass, password)

        if (passwordMatch == true) {

            const [signedAuthToken, signedRefreshToken] = generateAuthAndRefreshTokens(username)

            res.status(200).json({
                "actionResult": "SUCCESS",
                "authToken": signedAuthToken,
                "refreshToken": signedRefreshToken
            })
        } else {
            res.status(200).json({
                "actionResult": "ERR_INVALID_PROPERTIES",
                "invalidProperties": ["userPass"],
            })
        }
    } catch (err) {
        console.error(err)
        res.status(500).json({
            "actionResult": "ERR_INTERNAL_ERROR"
        })
    }
}

async function userTokenRefresh(req: Request, res: Response): Promise<void> {
    try {
        const {authToken, refreshToken} = req.body
        const [authTokenValidity, authTokenData] = validateAuthToken(authToken)

        if (authTokenData == null) {
            res.status(400).json({
                "actionResult": "ERR_INVALID_PROPERTIES",
                "invalidProperties": ["authToken"],
            })
            return
        }

        // @ts-ignore
        const tokenUserName = authTokenData.userName

        const [refreshTokenValidity, refreshTokenData] = validateRefreshToken(refreshToken, tokenUserName)

        if (refreshTokenData == null) {
            res.status(400).json({
                "actionResult": "ERR_INVALID_PROPERTIES",
                "invalidProperties": ["refreshToken"]
            })
        }

        if (refreshTokenValidity == true) {
            const [newAuthToken, newRefreshToken] = generateAuthAndRefreshTokens(tokenUserName)

            res.status(200).json({
                "actionResult": "SUCCESS",
                "authToken": newAuthToken,
                "refreshToken": newRefreshToken
            })
        } else {
            // Isn't exactly an error, the client will simply have to relogin
            // Hence status 200. A completely invalid refresh token will still return 400
            res.status(200).json({
                "actionResult": "REFRESH_EXPIRED",
            })
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({
            "actionResult": "ERR_INTERNAL_ERROR"
        })
    }
}

export {
    userSignup,
    userActivate,
    userLogin,
    userTokenRefresh
}