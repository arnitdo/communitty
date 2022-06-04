import {db} from "../utils/db"
import {sendVerificationMail} from "../utils/emailService"
import {sign, verify} from "jsonwebtoken"
import {genSalt, hash} from "bcrypt"
import {Request, Response} from "express";
import {QueryResult} from "pg";

type propertyValidatorType = (property: string) => boolean

function validateEmail(email: string): boolean {
    let emailRegex: RegExp = /^[\w+-.]*@[^.][a-z.-]*\.[a-zA-Z]{2,}$/;
    // See https://regex101.com/r/8COrEJ/2
    if (email.match(emailRegex)) {
        return true;
    }
    return false;
}

function validateUsername(userName: string): boolean {
    let usernameRegex: RegExp = /^[\w-]+$/;
    // Should only allow basic usernames, no special characters
    if (userName.match(usernameRegex)) {
        return true;
    }
    return false;
}

function validatePassword(password: string): boolean {
    let passwordRegex: RegExp = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@_$!%*?&])[\w@$!%*?&]{8,}$/;
    //                            |lowercase|uppercase|numeric|  special char | min 8 chars combined
    // See https://stackoverflow.com/questions/19605150/regex-for-password-must-contain-at-least-eight-characters-at-least-one-number-a
    // Slightly modified to allow underscores as well
    if (password.match(passwordRegex)) {
        return true
    }
    return false
}

function validateFullName(fullName: string): boolean {
    let fullNameRegex: RegExp = /[a-zA-Z]{2,}.*/;
    // Full name must have at least two characters, and anything after that.
    if (fullName.match(fullNameRegex)) {
        return true;
    }
    return false;
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

    const isDuplicateUserMail: boolean = (rows.length != 0);

    return [isDuplicateUserName, isDuplicateUserMail]
}

function validateProperties(properties: object, propertyValidators: propertyValidatorType[]){
    let validProperties: string[] = [],     // List of valid properties
        invalidProperties: string[] = [];   // List of invalid properties
    const propertyNames: string[] = Object.keys(properties) // List of property names
    propertyNames.forEach((propertyName: string, propertyIndex: number) => { // For each property, do
        // @ts-ignore
        const propertyValue: string = properties[propertyName] // Get property value from name
        const propertyValidator: propertyValidatorType = propertyValidators[propertyIndex] // Get corresponding validator
        const validProperty: boolean = propertyValidator(propertyValue) // Get validation result (boolean)
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
                const [isDuplicateUserName, isDuplicateUserMail] = await isDuplicateUser(userName, userMail);
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
                    const userSalt: string = await genSalt(10);
                    const passHash: string = await hash(userPass, userSalt);
                    const verificationToken = generateVerificationToken()
                    await db.query(
                        "INSERT INTO users VALUES ($1, $2, $3, $4, $5, NOW(), DEFAULT);",
                        [userName, userMail, passHash, userSalt, fullName]
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
    if (req.body && req.body.userName && req.body.verificationToken){
        const {userName, verificationToken} = req.body
        await db.query("BEGIN;")
        const {rows} = await db.query(
            "DELETE FROM inactive_users WHERE username = $1 AND verificationtoken = $2 RETURNING *",
            [userName, verificationToken]
        )
        if (rows.length > 0){
            // Activate our user
            await db.query(
                "UPDATE users SET activated = True WHERE username = $1",
                [userName]
            )
            res.status(200).json({
                "actionResult": "SUCCESS"
            })
        } else {
            res.status(200).json({
                "actionResult": "FAILURE"
            })
        }
        await db.query("COMMIT;")
    } else {
        res.status(500).json({
            "actionResult": "ERROR"
        })
        await db.query("ROLLBACK;")
    }
}

async function userLogin(req: Request, res: Response): Promise<void>{
    try {

    } catch (err){
        console.error(err)
        await db.query("ROLLBACK;")
        res.status(500).json({
            "actionResult": "ERROR",
            "validProperties": [],
            "invalidProperties": []
        })
    }
}

export {userSignup, userVerify, userLogin}