import {db} from '../utils/db'
import {Request, Response, Router} from "express";
import * as middleware from "../utils/middleware";
import {getAuthenticatedUser, hasAuthToken, normalizeObjectKeys} from "../utils/common";

async function redirectToUserProfile(req: Request, res: Response): Promise<void> {
	try {
		const currentAuthUser = getAuthenticatedUser(req)

		const userProfileURL = `/api/users/${currentAuthUser}/profile`

		res.redirect(userProfileURL)
	} catch (err) {
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

		// The authenticated user is following `userName` or not
		let followingUser: boolean = false

		// `userName` is following the authenticated user or not
		let followedByUser: boolean = false
		if (hasAuthToken(req)){
			const requestUser = getAuthenticatedUser(req)
			{
				const {rows} = await db.query(
					"SELECT 1 FROM profile_follows WHERE following_username = $1 AND follower_username = $2;",
					[userName, requestUser]
				)

				if (rows.length == 1) {
					followingUser = true
				}
			}
			// Using some scope trickery to avoid redeclaration
			{
				const {rows}  = await db.query(
					"SELECT 1 FROM profile_follows WHERE following_username = $1 AND follower_username = $2;",
					[requestUser, userName]
					// Note the flipped values
				)

				if (rows.length == 1){
					followedByUser = true
				}
			}
		}

		const userProfileData = rows[0]

		const normalizedUserProfileData = normalizeObjectKeys(userProfileData)

		const finalUserData = {
			// We'll be adding a few helpful hints to other profile data
			...normalizedUserProfileData,
			"followingUser": followingUser,
			"followedByUser": followedByUser,
			"userPosts": `/api/users/${userName}/posts`,
			"userComments": `/api/users/${userName}/comments`,
			"userFollowers": `/api/users/${userName}/followers`,
			"userFollowing": `/api/users/${userName}/following`
		}

		res.status(200).json({
			"actionResult": "SUCCESS",
			"profileData": finalUserData
		})
	} catch (err) {
		console.error(err)
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

async function updateUserProfile(req: Request, res: Response): Promise<void> {
	try {
		// POST /api/users/me
		const currentUser = getAuthenticatedUser(req)
		// Guaranteed with needsBodyParams
		const {profileName, profileDescription} = req.body

		await db.query("BEGIN;")
		await db.query(
			"UPDATE profiles SET profile_name = $1, profile_description = $2 WHERE username = $3;",
			[profileName, profileDescription, currentUser]
		)
		await db.query("COMMIT;")
		res.status(200).json({
			"actionResult": "SUCCESS",
			"updatedProfile": `/api/users/${currentUser}/profile`
		})
	} catch (err){
		console.error(err)
		await db.query("ROLLBACK;")
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

		const userData = rows[0]
		const userAvatarURL = userData.avatar_url

		// And sendoff!
		res.redirect(userAvatarURL)

	} catch (err) {
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
		if (Number.isNaN(parsedPostPage) || parsedPostPage < 1) {
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
				['post_tags', 'post_modified_time']
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
		if (Number.isNaN(parsedCommentPage) || parsedCommentPage < 0) {
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
	} catch (err) {
		console.error(err)
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

async function getUserFollowers(req: Request, res: Response): Promise<void> {
	try {
		const {userName} = req.params
		const followerPage = req.query.followerPage as string || "1"

		const parsedFollowerPage = Number.parseInt(followerPage)
		if (Number.isNaN(parsedFollowerPage) || parsedFollowerPage < 1) {
			res.status(400).json({
				"actionResult": "ERR_INVALID_PROPERTIES",
				"invalidProperties": ["followerPage"]
			})
			return
		}

		const followerPageOffset = ((parsedFollowerPage - 1) * 10)

		const {rows} = await db.query(
			"SELECT follower_username, follow_since FROM profile_follows WHERE following_username = $1 OFFSET $2 LIMIT 10;",
			[userName, followerPageOffset]
		)

		const followerUserData = rows.map((row) => {
			return {
				"userName": row.follower_username,
				"followerSince": row.follow_since
			}
		})

		res.status(200).json({
			"actionResult": "SUCCESS",
			"followerUsers": followerUserData
		})
	} catch (err) {
		console.error(err)
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

async function getFollowingUsers(req: Request, res: Response): Promise<void> {
	try {
		const {userName} = req.params
		const followingPage = req.query.followingPage as string || "1"

		const parsedFollowingPage = Number.parseInt(followingPage)
		if (Number.isNaN(parsedFollowingPage) || parsedFollowingPage < 1) {
			res.status(400).json({
				"actionResult": "ERR_INVALID_PROPERTIES",
				"invalidProperties": ["followingPage"]
			})
			return
		}

		const followingPageOffset = ((parsedFollowingPage - 1) * 10)

		const {rows} = await db.query(
			"SELECT following_username, follow_since FROM profile_follows WHERE follower_username = $1 OFFSET $2 LIMIT 10;",
			[userName, followingPageOffset]
		)

		const followingUserData = rows.map((row) => {
			return {
				"userName": row.following_username,
				"followingSince": row.follow_since
			}
		})

		res.status(200).json({
			"actionResult": "SUCCESS",
			"followingUsers": followingUserData
		})
	} catch (err) {
		console.error(err)
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

async function followUser(req: Request, res: Response): Promise<void> {
	try {
		const {userName} = req.params
		const followerUser = getAuthenticatedUser(req)

		// You can't follow yourself.
		if (userName == followerUser){
			res.status(400).json({
				"actionResult": "ERR_SELF_FOLLOW"
			})
			return
		}

		// Check if already following
		const {rows} = await db.query(
			"SELECT 1 FROM profile_follows WHERE following_username = $1 AND follower_username = $2;",
			[userName, followerUser]
		)

		if (rows.length == 1) {
			res.status(400).json({
				"actionResult": "ERR_ALREADY_FOLLOWED"
			})
			return
		}

		await db.query("BEGIN;")

		// Insert following relationship
		await db.query(
			"INSERT INTO profile_follows VALUES ($1, $2, NOW());",
			[userName, followerUser]
		)

		// Update follower counts
		await db.query(
			"UPDATE profiles SET follower_count = follower_count + 1 WHERE username = $1;",
			[userName]
		)

		// Update following counts
		await db.query(
			"UPDATE profiles SET following_count = following_count + 1 WHERE username = $1;",
			[followerUser]
		)
		await db.query("COMMIT;")
		res.status(200).json({
			"actionResult": "SUCCESS"
		})
	} catch (err) {
		console.error(err)
		await db.query("ROLLBACK;")
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

async function unfollowUser(req: Request, res: Response): Promise<void> {
	try {
		const {userName} = req.params
		const followerUser = getAuthenticatedUser(req)

		if (userName == followerUser){
			res.status(400).json({
				"actionResult": "ERR_SELF_UNFOLLOW"
			})
			return
		}

		const {rows} = await db.query(
			"SELECT 1 FROM profile_follows WHERE following_username = $1 AND follower_username = $2;",
			[userName, followerUser]
		)

		if (rows.length == 0) {
			res.status(400).json({
				"actionResult": "ERR_NOT_FOLLOWED"
			})
			return
		}

		await db.query("BEGIN;")

		await db.query(
			"DELETE FROM profile_follows WHERE following_username = $1 AND follower_username = $2;",
			[userName, followerUser]
		)

		await db.query(
			"UPDATE profiles SET follower_count = follower_count - 1 WHERE username = $1;",
			[userName]
		)

		await db.query(
			"UPDATE profiles SET following_count = following_count - 1 WHERE username = $1;",
			[followerUser]
		)
		await db.query("COMMIT;")

		res.status(200).json({
			"actionResult": "SUCCESS"
		})
	} catch (err) {
		console.error(err)
		await db.query("ROLLBACK;")
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

userRouter.post(
	"/me",
	[
		middleware.needsToken,
		middleware.needsBodyParams("profileName", "profileDescription")
	],
	updateUserProfile
)

userRouter.get(
	"/:userName/profile",
	[
		middleware.optionalToken,
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

userRouter.get(
	"/:userName/followers",
	[
		middleware.needsURLParams("userName"),
		middleware.needsValidUser
	],
	getUserFollowers
)

userRouter.get(
	"/:userName/following",
	[
		middleware.needsURLParams("userName"),
		middleware.needsValidUser
	],
	getFollowingUsers
)

userRouter.post(
	"/:userName/follows",
	[
		middleware.needsToken,
		middleware.needsActivatedUser,
		middleware.needsURLParams("userName"),
		middleware.needsValidUser
	],
	followUser
)

userRouter.delete(
	"/:userName/follows",
	[
		middleware.needsToken,
		middleware.needsActivatedUser,
		middleware.needsURLParams("userName"),
		middleware.needsValidUser
	],
	unfollowUser
)

export {
	userRouter
}