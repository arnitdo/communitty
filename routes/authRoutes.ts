import {db} from "../utils/db"
import {sendActivationMail, sendPasswordResetMail} from "../utils/emailService"
import {sign} from "jsonwebtoken"
import {hash, compare} from "bcrypt"
import {Router, Request, Response} from "express"
import {PropertyValidatorType, validateProperties, validateAuthToken, validateRefreshToken} from "../utils/common"
import * as middleware from "../utils/middleware";
import * as crypto from "crypto";

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

function generateAuthAndRefreshTokens(userName: string): [string, string] {
	const signedAuthToken = sign(
		{
			userName: userName,
			tokenType: "AUTH"
		},
		// @ts-ignore
		process.env.JWT_SECRET,
		{
			expiresIn: "1h",
			algorithm: "HS256"
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
			expiresIn: "1d",
			algorithm: "HS256"
		}
	)

	return [signedAuthToken, signedRefreshToken]
}


async function isDuplicateUser(userName: string, userMail: string): Promise<boolean[]> {
	// Returns true for respective property if user already exists with same username or email
	// Else returns [false, false]
	let {rows} = await db.query(
		"SELECT 1 FROM accounts WHERE username = $1",
		[userName]
	)
	const isDuplicateUserName: boolean = (rows.length == 1);

	({rows} = await db.query(
		"SELECT * FROM accounts WHERE email = $1",
		[userMail]
	))

	const isDuplicateUserMail: boolean = (rows.length == 1)

	return [isDuplicateUserName, isDuplicateUserMail]
}

function generateActivationToken(userName: string): string{
	// Returns SHA-256 hash of username
	const activationToken = crypto
		.createHash("sha256")
		.update(userName)
		.digest("hex")
	return activationToken
}

function generatePasswordResetToken(userName: string): string {
	const now = new Date()
	// Make the token unique using the current timestamp appended to the username
	const resetTokenData = `${userName}.${now.toString()}`
	const passwordResetToken = crypto
		.createHash("sha256")
		.update(resetTokenData)
		.digest("hex")
	return passwordResetToken
}

async function userSignup(req: Request, res: Response): Promise<void> {
	try {
		let {userName, userMail, userPass, fullName} = req.body // Get required request parameters
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
			userMail = userMail.toLowerCase()
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
				const activationToken = generateActivationToken(userName)
				await db.query("BEGIN;") // Begin DB Transaction
				await db.query(
					"INSERT INTO accounts VALUES ($1, $2, $3, NOW(), DEFAULT);",
					[userName, userMail, passHash]
				)
				await db.query(
					"INSERT INTO inactive_accounts VALUES ($1, $2);",
					[userName, activationToken]
				)

				const hashedMail = crypto
					.createHash("sha256")
					.update(userMail)
					.digest("hex")

				const avatarURL = `https://www.gravatar.com/avatar/${hashedMail}?d=retro&f=y`

				const autogenProfileDescription = `Hi! I'm ${fullName}! Nice to meet you on Communitty!`

				await db.query(
					"INSERT INTO profiles VALUES ($1, $2, $3, $4, DEFAULT);",
					[userName, fullName, autogenProfileDescription, avatarURL]
				)

				// Send verification mail
				await sendActivationMail(userMail, userName, activationToken)
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
		let {userName, activationToken} = req.body

		const userNameBasedToken = generateActivationToken(userName)

		// Since activation tokens are SHA-256 hashes of the username
		// The hash of the param username and the activation token must match
		if (userNameBasedToken !== activationToken){
			res.status(400).json({
				"actionResult": "ERR_INVALID_PROPERTIES",
				"invalidProperties": ["userName", "activationToken"]
			})
		}

		await db.query("BEGIN;")
		await db.query(
			"UPDATE accounts SET activated = TRUE WHERE username = $1;",
			[userName]
		)

		await db.query(
			"UPDATE profiles SET account_activated = TRUE WHERE username = $1;",
			[userName]
		)

		await db.query(
			"DELETE FROM inactive_accounts WHERE username = $1;",
			[userName]
		)
		await db.query("COMMIT;")
		res.status(200).json({
			"actionResult": "SUCCESS"
		})
	} catch (err) {
		console.error(err)
		await db.query("ROLLBACK;")
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR",
		})
	}
}

async function userLogin(req: Request, res: Response): Promise<void> {
	try {
		const {userName, userPass} = req.body
		const {rows} = await db.query(
			"SELECT username, password FROM accounts WHERE username = $1",
			[userName]
		)

		if (rows.length == 0) {
			res.status(400).json({
				"actionResult": "ERR_INVALID_PROPERTIES",
				"invalidProperties": ["userName"]
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
			res.status(400).json({
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
		const {refreshToken} = req.body

		const [refreshTokenValidity, refreshTokenData] = validateRefreshToken(refreshToken)

		if (refreshTokenData == null) {
			res.status(400).json({
				"actionResult": "ERR_INVALID_PROPERTIES",
				"invalidProperties": ["refreshToken"]
			})
			return
		}

		// @ts-ignore
		const tokenUserName = refreshTokenData.userName

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

async function forgotPassword(req: Request, res: Response): Promise<void> {
	// Sends a URL to reset the password of the given user
	try {
		const {userMail} = req.body // Guaranteed with needsBodyParams

		const {rows} = await db.query(
			"SELECT username FROM accounts WHERE email = $1;",
			[userMail]
		)

		if (rows.length == 0){
			res.status(400).json({
				"actionResult": "ERR_INVALID_PROPERTIES",
				"invalidProperties": ["userMail"]
			})
		} else {
			const userName = rows[0].username
			const resetToken = generatePasswordResetToken(userName)
			const validUpto = new Date()
			// Reset validity is only upto 15 minutes from issue
			validUpto.setMinutes(
				validUpto.getMinutes() + 15
			) // Date will automatically adjust hour/day/month/year overflows

			await db.query("BEGIN")

			// Delete previous password reset attempts
			await db.query(
				"DELETE FROM password_reset_tokens WHERE username = $1",
				[userName]
			)

			await db.query(
				"INSERT INTO password_reset_tokens VALUES ($1, $2, $3);",
				[userName, resetToken, validUpto]
			)

			await sendPasswordResetMail(userMail, userName, resetToken)
			await db.query("COMMIT")
			res.status(200).json({
				"actionResult": "SUCCESS"
			})
		}
	} catch (err){
		await db.query("ROLLBACK;")
		console.error(err)
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

async function resetPassword(req: Request, res: Response): Promise<void> {
	try {
		const {userName, resetToken, newPassword} = req.body

		const {rows} = await db.query(
			"SELECT valid_upto FROM password_reset_tokens WHERE username = $1 AND reset_token = $2",
			[userName, resetToken]
		)

		if (rows.length == 0){
			res.status(400).json({
				"actionResult": "ERR_INVALID_PROPERTIES",
				"invalidProperties": ["userName", "resetToken"]
			})
		} else {
			const validUpto = rows[0].valid_upto
			const validUptoDateTime = new Date(validUpto)
			const validUptoTS = validUptoDateTime.getTime()
			const nowTS = Date.now()
			if (nowTS > validUptoTS){
				res.status(400).json({
					"actionResult": "ERR_INVALID_PROPERTIES",
					"invalidProperties": ["resetToken"]
				})
			} else {
				const isValidPassword = validatePassword(newPassword)
				if (isValidPassword == false){
					res.status(400).json({
						"actionResult": "ERR_INVALID_PROPERTIES",
						"invalidProperties": ["newPassword"]
					})
					return
				}

				const hashedPassword = await hash(newPassword, 10)

				await db.query("BEGIN")
				await db.query(
					"UPDATE accounts SET password = $1 WHERE username = $2;",
					[hashedPassword, userName]
				)

				// Delete all password reset attempts
				await db.query(
					"DELETE FROM password_reset_tokens WHERE username = $1;",
					[userName]
				)
				await db.query("COMMIT")
				res.status(200).json({
					"actionResult": "SUCCESS"
				})
			}
		}
	} catch (err){
		await db.query("ROLLBACK;")
		console.error(err)
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

const authRouter = Router()

authRouter.post(
	"/signup",
	middleware.needsBodyParams("userName", "userMail", "userPass", "fullName"),
	userSignup
)
authRouter.post(
	"/activate",
	middleware.needsBodyParams("userName", "activationToken"),
	userActivate
)
authRouter.post(
	"/login",
	middleware.needsBodyParams("userName", "userPass"),
	userLogin
)

authRouter.post(
	"/token_refresh",
	middleware.needsBodyParams("refreshToken"),
	userTokenRefresh
)

authRouter.post(
	"/forgot_password",
	middleware.needsBodyParams("userMail"),
	forgotPassword
)

authRouter.post(
	"/reset_password",
	middleware.needsBodyParams("userName", "resetToken", "newPassword"),
	resetPassword
)

export {
	authRouter
}