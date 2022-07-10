import {db} from "../utils/db"
import {sendVerificationMail} from "../utils/emailService"
import {sign, verify} from "jsonwebtoken"
import {hash, compare} from "bcrypt"
import {Request, Response} from "express"
import {propertyValidatorType, validateAuthToken, validateRefreshToken} from "../utils/common"

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
function generateAuthAndRefreshTokens(userName: string): [object, object]{
    const signedAuthToken = sign(
        {
            userName: userName,
            tokenType: "AUTH"
        },
        // @ts-ignore
        process.env.JWT_SECRET,
        {
            expiresIn: "1d"
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
            expiresIn: "7d"
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

function validateProperties(properties: object, propertyValidators: propertyValidatorType[]){
    // A generic property validating function
    // Returns two arrays, valid and invalid properties
    let validProperties: string[] = [],     // List of valid properties
        invalidProperties: string[] = []    // List of invalid properties
    const propertyNames = Object.keys(properties) // List of property names
    propertyNames.forEach((propertyName: string, propertyIndex: number) => { // For each property, do
        // @ts-ignore
        const propertyValue = properties[propertyName] // Get property value from name
        const propertyValidator: propertyValidatorType = propertyValidators[propertyIndex] // Get corresponding validator
        const validProperty = propertyValidator(propertyValue) // Get validation result (boolean)
        if (validProperty) {
            validProperties.push(propertyName) // Mark as valid property
        } else {
            invalidProperties.push(propertyName) // Mark as invalid property
        }
    })
    return [validProperties, invalidProperties]
}

function generateVerificationToken(){
    // Length of token to generate
    const tokenLength = 64
    let verificationToken = ""
    // Set of characters to generate token from
    const charSet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
    for (let idx = 0; idx < tokenLength; idx++){
        let randomIndex = Math.floor(
            Math.random() * (charSet.length - 1)
        )
        verificationToken += charSet[randomIndex]
    }
    return verificationToken
}

async function userSignup(req: Request, res: Response): Promise<void> {
    try {
        if (req.body && req.body.userName && req.body.userMail && req.body.userPass && req.body.fullName) { // Check if all parameters are passed
            const {userName, userMail, userPass, fullName} = req.body // Get required request parameters
            const requestProperties: object = {     // Key-Value map of property name : property value
                userName: userName,
                userMail: userMail,
                userPass: userPass,
                fullName: fullName
            }
            const propertyValidators: propertyValidatorType[] = [   // List of property validator functions
                validateUsername, validateEmail, validatePassword, validateFullName
            ]
            // Get valid and invalid properties
            const [validProperties, invalidProperties] = validateProperties(requestProperties, propertyValidators)
            if (invalidProperties.length > 0) {
                // If there are some invalid properties, respond with 400
                res.status(400).json(
                    {
                        "actionResult": "FAILURE",
                        "validProperties": validProperties,      // Send valid and invalid properties
                        "invalidProperties": invalidProperties,
                        "duplicateProperties" : []
                    }
                )
            } else {
                await db.query("BEGIN;") // Begin DB Transaction
                const [isDuplicateUserName, isDuplicateUserMail] = await isDuplicateUser(userName, userMail)
                if (isDuplicateUserName || isDuplicateUserMail){
                    let duplicateProperties: string[] = []
                    if (isDuplicateUserName){
                        duplicateProperties.push("userName")
                    }
                    if (isDuplicateUserMail){
                        duplicateProperties.push("userMail")
                    }
                    res.status(400).json({
                        "actionResult": "DUPLICATE",
                        "validProperties" : validProperties,
                        "invalidProperties": invalidProperties,
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
                    await sendVerificationMail(userMail, userName, verificationToken)
                    await db.query("COMMIT;")      // Commit transaction to db
                    res.status(200).json({
                        "actionResult": "SUCCESS",                // Notify of success
                        "validProperties": validProperties,      // Send valid and invalid properties
                        "invalidProperties": invalidProperties,
                        "duplicateProperties": []
                    })
                }
            }
        } else {
            res.status(400).json(
                {
                    "actionResult": "FAILURE",
                    "validProperties": [],
                    "invalidProperties": ["userName", "userMail", "userPass", "fullName"],
                    "duplicateProperties" : []
                }
            )
        }
    } catch (err) {
        console.error(err)
        await db.query("ROLLBACK;")
        res.status(500).json({
            "actionResult": "ERROR",
            "validProperties": [],
            "invalidProperties": [],
            "duplicateProperties": []
        })
    }
}

async function userVerify(req: Request, res: Response): Promise<void>{
    try {
        if (req.body && req.body.userName && req.body.verificationToken) {
            const {userName, verificationToken} = req.body
            await db.query("BEGIN;")
            const {rows} = await db.query(
                "DELETE FROM inactive_users WHERE username = $1 AND verificationtoken = $2 RETURNING *",
                [userName, verificationToken]
            )
            if (rows.length > 0) {
                // Activate our user
                await db.query(
                    "UPDATE users SET activated = True WHERE username = $1",
                    [userName]
                )
                res.status(200).json({
                    "actionResult": "SUCCESS",
                    "validProperties": ["userName", "verificationToken"],
                    "invalidProperties": []
                })
            } else {
                res.status(400).json({
                    "actionResult": "FAILURE",
                    "validProperties": [],
                    "invalidProperties": ["userName", "verificationToken"]
                })
            }
            await db.query("COMMIT;")
        } else {
            res.status(400).json({
                "actionResult": "FAILURE",
                "validProperties": [],
                "invalidProperties": ["userName", "verificationToken"]
            })
        }
    } catch (err){
        console.error(err)
        res.status(500).json({
            "actionResult": "ERROR",
            "validProperties": [],
            "invalidProperties": []
        })
        await db.query("ROLLBACK;")
    }
}

async function userLogin(req: Request, res: Response): Promise<void>{
    try {
        if (req.body && req.body.userName && req.body.userPass){
            const {userName, userPass} = req.body
            const {rows} = await db.query(
                "SELECT username, password FROM users WHERE username = $1",
                [userName]
            )

            if (rows.length == 0){
                res.status(400).json({
                    "actionResult": "FAILURE",
                    "validProperties": [],
                    "invalidProperties": ["userName", "userPass"],
                    "authToken": null
                })
            }

            const {username, password} = rows[0]

            const passwordMatch = await compare(userPass, password)

            if (passwordMatch == true){

                const [signedAuthToken, signedRefreshToken] = generateAuthAndRefreshTokens(username)

                res.status(200).json({
                    "actionResult": "SUCCESS",
                    "validProperties": ["userName", "userPass"],
                    "invalidProperties": [],
                    "authToken": signedAuthToken,
                    "refreshToken": signedRefreshToken
                })
            } else {
                res.status(200).json({
                    "actionResult": "FAILURE",
                    "validProperties": ["userName"],
                    "invalidProperties": ["userPass"],
                    "authToken": null,
                    "refreshToken": null
                })
            }
        } else {
            res.status(400).json({
                "actionResult": "FAILURE",
                "validProperties": [],
                "invalidProperties": ["userName", "userPass"],
                "authToken": null,
                "refreshToken": null
            })
        }
    } catch (err){
        console.error(err)
        res.status(500).json({
            "actionResult": "ERROR",
            "validProperties": [],
            "invalidProperties": [],
            "authToken" : null,
            "refreshToken": null
        })
    }
}

async function userTokenRefresh(req: Request, res: Response): Promise<void>{
    try {
        if (req.body && req.body.authToken && req.body.refreshToken && req.body.authToken != req.body.refreshToken){
            const {authToken, refreshToken} = req.body
            const [authTokenValidity, authTokenData] = validateAuthToken(authToken)

            if (authTokenData == null){
                res.status(400).json({
                    "actionResult": "FAILURE",
                    "validProperties": [],
                    "invalidProperties": ["authToken"],
                    "authToken": null,
                    "refreshToken": null
                })

                return
            }

            // @ts-ignore
            const tokenUserName = authTokenData.userName

            const [refreshTokenValidity, refreshTokenData] = validateRefreshToken(refreshToken, tokenUserName)

            if (refreshTokenData == null){
                res.status(400).json({
                    "actionResult": "FAILURE",
                    "validProperties": [],
                    "invalidProperties": ["refreshToken"],
                    "authToken": null,
                    "refreshToken": null
                })
            }

            if  (refreshTokenValidity == true){
                const [newAuthToken, newRefreshToken] = generateAuthAndRefreshTokens(tokenUserName)

                res.status(200).json({
                    "actionResult": "SUCCESS",
                    "validProperties": ["authToken", "refreshToken"],
                    "invalidProperties": [],
                    "authToken": newAuthToken,
                    "refreshToken": newRefreshToken
                })
            } else {
                res.status(200).json({
                    "actionResult": "REFRESH_EXPIRED",
                    "validProperties": ["authToken", "refreshToken"],
                    "invalidProperties": [],
                    "authToken": null,
                    "refreshToken": null
                })
            }

        } else {
            res.status(400).json({
                "actionResult": "FAILURE",
                "validProperties": [],
                "invalidProperties": ["authToken", "refreshToken"],
                "authToken": null,
                "refreshToken": null
            })
        }
    } catch (err){
        console.error(err);
        res.status(500).json({
            "actionResult": "ERROR",
            "validProperties": [],
            "invalidProperties": [],
            "authToken" : null,
            "refreshToken": null
        })
    }
}

export {userSignup, userVerify, userLogin, userTokenRefresh}