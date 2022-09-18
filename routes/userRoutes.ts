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
			res.status(404).json({
				"actionResult": "ERR_USER_NOT_FOUND"
			})
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

async function redirectToUserAvatar(req: Request, res: Response): Promise<void> {
	try {
		// Validated by needsURLParams
		const {userName} = req.params

		const {rows} = await db.query(
			"SELECT avatar_url FROM profiles WHERE username = $1;",
			[userName]
		)

		if (rows.length == 0){
			// If the user doesn't exist, we could maybe redirect it to the default user avatar too?
			// Open to contributions
			// We'll send a 404 as of now
			res.status(404).json({
				"actionResult": "ERR_USER_NOT_FOUND"
			})
			return
		}

		const userData = rows[0]
		const userAvatarURL = userData.avatar_url

		// And sendoff!
		res.redirect(userAvatarURL)

	} catch (err){
		console.error(err)
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

async function getUserPosts(req: Request, res: Response): Promise<void> {
	try {
		// Validated by needsURLParams
		const {userName} = req.params
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


async function getUserFollows(req: Request, res: Response): Promise<void> {
	try {
		const {userName} = req.params
		const followPage = req.query.followPage as string || "1"

		const parsedFollowPage = Number.parseInt(followPage)
		if (Number.isNaN(parsedFollowPage)){
			res.status(400).json({
				"actionResult": "ERR_INVALID_PROPERTIES",
				"invalidProperties": ["followPage"]
			})
		}
	} catch (err){
		console.error(err)
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

async function followUser(req: Request, res: Response): Promise<void> {
	try {

	} catch (err){
		console.error(err)
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

async function unfollowUser(req: Request, res: Response): Promise<void> {
	try {
		const {userName} = req.params
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
		middleware.needsURLParams("userName"),
		middleware.needsValidUser
	],
	getUserProfile
)

userRouter.get(
	"/:userName/avatar",
	[
		middleware.needsURLParams("userName"),
		middleware.needsValidUser
	],
	redirectToUserAvatar
)

userRouter.get(
	"/:userName/posts",
	[
		middleware.needsURLParams("userName"),
		middleware.needsValidUser
	],
	getUserPosts
)

userRouter.get(
	"/:userName/comments",
	[
		middleware.needsURLParams("userName"),
		middleware.needsValidUser
	],
	getUserComments
)

export {
	userRouter
}