import {db} from '../utils/db'
import {Request, Response, Router} from "express";
import * as middleware from "../utils/middleware";
import {getAuthenticatedUser, normalizeObjectKeys} from "../utils/common";

async function redirectToUserProfile(req: Request, res: Response): Promise<void> {
	try {
		const currentAuthUser = getAuthenticatedUser(req)

		const userProfileURL = `/api/users/${currentAuthUser}/profile`

		res.redirect(userProfileURL)
	} catch (err){
		console.error(err)
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

async function getUserProfile(req: Request, res: Response): Promise<void> {
	try {
		// userName is guaranteed with needsURLParams middleware
		const {userName} = req.params

		const {rows} = await db.query(
			"SELECT * FROM profiles WHERE username = $1;",
			[userName]
		)

		if (rows.length == 0){
			// No user exists with that username
			res.sendStatus(404)
			return
		}

		const userProfileData = rows[0]

		const normalizedUserProfileData = normalizeObjectKeys(userProfileData)

		const finalUserData = {
			// We'll be adding a few helpful hints to other profile data
			...normalizedUserProfileData,
			"userPosts": `/api/users/${userName}/posts`,
			"userComments": `/api/users/${userName}/comments`
		}

		res.status(200).json({
			"actionResult": "SUCCESS",
			"profileData": finalUserData
		})
	} catch (err){
		console.error(err)
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

async function getUserPosts(req: Request, res: Response): Promise<void> {
	try {
		const userName = req.params.userName
		const postPage = req.query.postPage as string || "1"
		const parsedPostPage = Number.parseInt(postPage)
		if (Number.isNaN(parsedPostPage) || parsedPostPage < 1){
			res.status(400).json({
				"actionResult": "ERR_INVALID_PROPERTIES",
				"invalidProperties": ["postPage"]
			})
			return
		}

		const pageOffset = ((parsedPostPage - 1) * 10)

		const {rows} = await db.query(
			"SELECT * FROM posts WHERE post_author = $1 ORDER BY post_modified_time DESC LIMIT 10 OFFSET $2;",
			[userName, pageOffset]
		)

		const normalizedRows = rows.map((row) => {
			return normalizeObjectKeys(
				row,
				['post_modified_time']
			)
		})

		res.status(200).json({
			"actionResult": "SUCCESS",
			"userPosts": normalizedRows
		})
	} catch (err) {
		console.error(err)
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

async function getUserComments(req: Request, res: Response): Promise<void> {
	try {
		// req.params.userName is guaranteed with needsURLParams middleware
		const {userName} = req.params
		const commentPage = req.query.commentPage as string || "1"
		const parsedCommentPage = Number.parseInt(commentPage)
		if (Number.isNaN(parsedCommentPage) || parsedCommentPage < 0){
			res.status(400).json({
				"actionResult": "ERR_INVALID_PROPERTIES",
				"invalidProperties": ["commentPage"]
			})
			return
		}

		const pageOffset = ((parsedCommentPage - 1) * 10)

		const {rows} = await db.query(
			"SELECT * FROM comments WHERE comment_author = $1 ORDER BY comment_modified_time DESC LIMIT 10 OFFSET $2;",
			[userName, pageOffset]
		)

		const normalizedRows = rows.map((row) => {
			return normalizeObjectKeys(
				row,
				['comment_modified_time']
			)
		})

		res.status(200).json({
			"actionResult": "SUCCESS",
			"userComments": normalizedRows
		})
	} catch (err){
		console.error(err)
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}


const userRouter = Router()

// Redirects to the profile of the currently authenticated user
// Since we are passing the auth token in the header, we can also use
// GET methods to obtain the required data
userRouter.get(
	"/me",
	[
		middleware.needsToken
	],
	redirectToUserProfile
)

userRouter.get(
	"/:userName/profile",
	[
		middleware.needsURLParams("userName")
	],
	getUserProfile
)

userRouter.get(
	"/:userName/posts",
	[
		middleware.needsURLParams("userName")
	],
	getUserPosts
)

userRouter.get(
	"/:userName/comments",
	[
		middleware.needsURLParams("userName")
	],
	getUserComments
)

export {
	userRouter
}