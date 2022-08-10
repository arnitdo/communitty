import * as sendGrid from "@sendgrid/mail"
import {baseURL} from "./common";

const emailService = sendGrid
// @ts-ignore
emailService.setApiKey(process.env.SENDGRID_API_KEY)

async function sendActivationMail(emailRecipient: string, userName: string, activationToken: string): Promise<void> {
	// Creates and sends an activation email from the passed parameters
	// Uses Twilio's SendGrid mail API

	// Encode username
	const urlEncodedUsername: string = encodeURIComponent(userName)
	// encode the activation token, as it contains special chars
	const urlEncodedToken: string = encodeURIComponent(activationToken)
	// Get base URL (In case of dev / prod environments)
	const baseURLString: string = baseURL()
	// Concatenate to form activation URL
	const activationURL: string = baseURLString + "/activate?userName=" + urlEncodedUsername + "&activationToken=" + urlEncodedToken
	// Craft activation email
	const activationMessage: object = {
		to: emailRecipient,
		from: "join.communitty@gmail.com",
		subject: "Activate your Communitty account now!",
		text:
			`Thank you for joining Communitty! There's still one small step left.`  +
			`\n\nClick the link below to activate your account on Communitty.`      +
			`\nAn activated account permits you to post, comment and more!`         +
			`\n\n${activationURL}`
	}
	try {
		// @ts-ignore
		// And sendoff!
		const emailResponse = await emailService.send(activationMessage)
	} catch (err) {
		// Log the error, if any
		console.error(err)
	}
}

export {sendActivationMail}