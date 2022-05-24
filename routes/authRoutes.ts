import * as path from "path";
import {db} from "../utils/db"
import {sign, verify} from "jsonwebtoken"
import {genSaltSync, hasSync} from "bcrypt"
import {Request, Response} from "express";

type propertyValidatorType = (property: string) => boolean

function validateEmail(email: string): boolean {
    let emailRegex: RegExp = /^[\w+-.]*@[^.][a-z.-]*\.[a-zA-Z]{2,}$/;
    // See https://regex101.com/r/8COrEJ/2
    if (email.match(emailRegex)){
        return true;
    }
    return false;
}

function validateUsername(username: string): boolean {
    let usernameRegex: RegExp = /^[\w-]$/;
    // Should only allow basic usernames, no special characters
    if (username.match(usernameRegex)){
        return true;
    }
    return false;
}

function validatePassword(password: string): boolean {
    let passwordRegex: RegExp = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@_$!%*?&])[\w@$!%*?&]{8,}$/;
    //                            |lowercase|uppercase|numeric|  special char | min 8 chars combined
    // See https://stackoverflow.com/questions/19605150/regex-for-password-must-contain-at-least-eight-characters-at-least-one-number-a
    // Slightly modified to allow underscores as well
    if (password.match(passwordRegex)){
        return true
    }
    return false
}

function validateFullName(name: string): boolean {
    let fullNameRegex: RegExp = /[a-zA-Z]{2,}.*/;
    // Full name must have at least two characters, and anything after that.
    if (name.match(fullNameRegex)){
        return true;
    }
    return false;
}

function userSignup(req: Request, res: Response): void {
    try {
        db.query("BEGIN;").then() // Begin DB Transaction
        const {userName, userMail, userPass, fullName} = req.body // Get required request parameters
        if (userName && userMail && userPass && fullName){ // Check if any are invalid
            let validProperties: string[] = [],     // List of valid properties
                invalidProperties: string[] = [];   // List of invalid properties
            const requestProperties: object = {     // Key-Value map of property name : property value
                userName: userName,
                userMail: userMail,
                userPass: userPass,
                fullName: fullName
            }
            const propertyValidators: propertyValidatorType[] = [   // List of property validator functions
                validateUsername, validateEmail, validatePassword, validateFullName
            ]
            const propertyNames: string[] = Object.keys(requestProperties) // List of property names
            propertyNames.forEach((propertyName, propertyIndex) => { // For each property, do
                const propertyValue: string = requestProperties[propertyName] // Get property value from name
                const propertyValidator: propertyValidatorType = propertyValidators[propertyIndex] // Get corresponding validator
                const validProperty: boolean = propertyValidator(propertyValue) // Get validation result (boolean)
                if (validProperty){
                    validProperties.push(propertyName) // Mark as valid property
                } else {
                    invalidProperties.push(propertyName) // Mark as invalid property
                }
            })
            if (invalidProperties.length > 0){
                res.status(400).json(
                    {
                        validProperties : validProperties,      // Send valid and invalid properties
                        invalidProperties : invalidProperties
                    }
                )
            } else {
                const passSalt = genSaltSync(10);
                const passHash = hasSync(userPass, passSalt)
                db.query(
                    "INSERT INTO users VALUES ($1, $2, $3, $4, $5, DEFAULT);",
                    [userName, userMail, passHash, passSalt, fullName]
                )
            }
        } else {
            res.status(400).json(
                {
                    validProperties : [],
                    invalidProperties : ["userName", "userMail", "userPass", "fullName"]
                }
            )
        }
    } catch (err) {
        db.query("ROLLBACK;").then()
    }
}

export {userSignup}