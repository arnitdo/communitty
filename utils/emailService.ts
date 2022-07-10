import * as sendGrid from "@sendgrid/mail"
import {baseURL} from "./url"

const emailService = sendGrid
// @ts-ignore
emailService.setApiKey(process.env.SENDGRID_API_KEY)

async function sendVerificationMail(emailRecipient: string, userName: string, verificationToken: string): Promise<void> {
    // Creates and sends a verification email from the passed parameters
    // Uses Twilio's SendGrid mail API

    // Encode username
    const urlEncodedUsername: string = encodeURIComponent(userName)
    // encode the verification token, as it contains special chars
    const urlEncodedToken: string = encodeURIComponent(verificationToken)
    // Get base URL (In case of dev / prod environments)
    const baseURLString: string = baseURL()
    // Concatenate to form verification URL
    const verificationURL: string = baseURLString + "/verify?userName=" + urlEncodedUsername + "&verificationToken=" + urlEncodedToken
    // Craft verification email
    const verificationMessage: object = {
        to: emailRecipient,
        from: "join.communitty@gmail.com",
        subject: "Activate your Communitty account now!",
        text:
            `Thank you for joining Communitty! There's still one small step left.`  +
            `\n\nClick the link below to activate your account on Communitty.`      +
            `\nAn activated account permits you to post, comment and more!`         +
            `\n\n${verificationURL}`
    }
    try {
        // @ts-ignore
        // And sendoff!
        const emailResponse = await emailService.send(verificationMessage)
    } catch (err) {
        // Log the error, if any
        console.error(err)
    }
}

export {sendVerificationMail}