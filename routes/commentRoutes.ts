import {db} from "../utils/db"
import {Router, Request, Response} from "express"
import {getAuthenticatedUser, normalizeObjectKeys, validateCommentId, validatePostId} from "../utils/common";
import * as middleware from "../utils/middleware"

const validCommentTypes = ["ROOT", "REPLY"]

async function getDirectChildComments(commentId: string): Promise<string[]> {
	// returns comment IDs of all direct children of a specific comment
	const {rows} = await db.query(
		"SELECT comment_id FROM comments WHERE comment_reply_parent = $1",
		[commentId]
	)
	const childComments = rows.map((row) => {
		return row.comment_id
	})
	return childComments
}

async function getRecursiveChildComments(commentId: string, currentUser: string | null): Promise<Object> {
	// Returns comment IDs of all children / grand-children / grand-grand.... you get the point
	const directChildren = await getDirectChildComments(commentId)
	const commentTree = await Promise.all(
		directChildren.map(async (childComment) => {

			const {rows} = await db.query(
				"SELECT * FROM comments WHERE comment_id = $1",
				[childComment]
			)

			const commentData = rows[0]

			const normalizedCommentData = normalizeObjectKeys(
				commentData,
				["comment_modified_time"]
			)

			let commentLikeStatus: boolean = false

			if (currentUser != null){
				const {rows} = await db.query(
					"SELECT 1 FROM comment_likes WHERE comment_id = $1 AND username = $2;",
					[childComment, currentUser]
				)

				if (rows.length == 1){
					commentLikeStatus = true
				}
			}

			const packedTreeData = {
				...normalizedCommentData,
				"userLikeStatus": commentLikeStatus,
				"childComments": await getRecursiveChildComments(childComment, currentUser)
			}

			return packedTreeData
		})
	)
	return commentTree
}

async function createComment(req: Request, res: Response) {
	try {
		// POST /api/posts/:postId/comments
		// postId will be validated by needsValidPost middleware
		// OR
		// POST /api/comments
		// postId will be provided in request body
		let {postId} = req.params
		if (postId == null){
			postId = req.body.postId
			const isValidPostId = await validatePostId(postId)
			if (isValidPostId == false){
				res.status(400).json({
					"actionResult": "ERR_INVALID_PROPERTIES",
					"invalidProperties": ["postId"]
				})
			}
			return
		}

		const numericPostId = Number.parseInt(postId)

		let {commentBody, commentType, commentParent} = req.body
		if (commentType == null) {
			commentType = "ROOT"
			commentParent = null
		}
		if (validCommentTypes.indexOf(commentType) == -1) {
			res.status(400).json({
				"actionResult": "ERR_INVALID_PROPERTIES",
				"invalidProperties": ["commentType"]
			})
			return
		}
		if (commentType == "REPLY") {
			if (commentParent == null) {
				res.status(400).json({
					"actionResult": "ERR_INVALID_PROPERTIES",
					"invalidProperties": ["commentParent"]
				})
				return
			}
			const isValidParent = await validateCommentId(commentParent)
			if (isValidParent == false) {
				res.status(400).json({
					"actionResult": "ERR_INVALID_PROPERTIES",
					"invalidProperties": ["commentParent"]
				})
				return
			}
		}

		const commentAuthor = getAuthenticatedUser(req)

		await db.query("BEGIN;")
		const {rows} = await db.query(
			"INSERT INTO comments VALUES (DEFAULT, $1, $2, $3, $4, DEFAULT, $5, 0, NOW(), DEFAULT) RETURNING comment_id",
			[commentAuthor, numericPostId, commentType, commentBody, commentParent]
		)

		if (commentType == "REPLY" && commentParent != null){
			// We know that the parent comment will be valid due to validation above
			await db.query(
				"UPDATE comments SET comment_reply_count = comment_reply_count + 1 WHERE comment_id = $1;",
				[commentParent]
			)
		}

		await db.query(
			"UPDATE posts SET post_comment_count = post_comment_count + 1 WHERE post_id = $1;",
			[numericPostId]
		)

		// Return the newly created comment's id to the client
		const newCommentId = rows[0].comment_id

		await db.query("COMMIT;")
		res.status(200).json({
			"actionResult": "SUCCESS",
			"postId": numericPostId,
			"commentId": newCommentId
		})
	} catch (err){
		console.error(err)
		await db.query("ROLLBACK;")
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

async function getPostComments(req: Request, res: Response): Promise<void> {
	// GET /api/posts/:postId/comments
	// Returns a tree like structure of all comments on a post
	// Useful format for frontend clients to parse and display comment trees
	try {
		// Use with needsValidPost middleware
		const {postId} = req.params

		const commentPage = req.query.commentPage as string || "1"

		const parsedCommentPage = Number.parseInt(commentPage)

		if (Number.isNaN(parsedCommentPage) || parsedCommentPage < 1){
			res.status(400).json({
				"actionResult": "ERR_INVALID_PROPERTIES",
				"invalidProperties": ["commentPage"]
			})
			return
		}

		const commentPageOffset = ((parsedCommentPage - 1) * 10)

		const {rows} = await db.query(
			"SELECT * FROM comments WHERE comment_parent_post = $1 AND comment_type = 'ROOT' OFFSET $2 LIMIT 10;",
			[postId, commentPageOffset]
		)

		let currentUser: string | null = null

		if (req.header("Authorization")){
			currentUser = getAuthenticatedUser(req)
		}


		const childCommentTree = await Promise.all(
			rows.map(async (commentData) => {
				const commentId = commentData.comment_id
				const commentTree = await getRecursiveChildComments(commentId, currentUser)

				const normalizedCommentData = normalizeObjectKeys(
					commentData,
					["comment_modified_time"]
				)

				let commentLikeStatus: boolean = false

				if (currentUser != null){
					const {rows} = await db.query(
						"SELECT 1 FROM comment_likes WHERE comment_id = $1 AND username = $2;",
						[commentId, currentUser]
					)

					if (rows.length == 1){
						commentLikeStatus = true
					}
				}

				return {
					...normalizedCommentData,
					"userLikeStatus": commentLikeStatus,
					"childComments": commentTree
				}
			})
		)

		res.status(200).json({
			"actionResult": "SUCCESS",
			"postComments": childCommentTree
		})
	} catch (err){
		console.error(err)
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

async function getComment(req: Request, res: Response): Promise<void> {
	try {
		// Use with needsURLParams middleware
		// As well as needsValidComment middleware
		const {commentId} = req.params
		const postId = req.params.postId
		if (postId){
			// If a post id is passed as URL param, ensure that the comment is in the post tree
			const {rows} = await db.query(
				"SELECT 1 FROM comments WHERE comment_id = $1 AND comment_parent_post = $2",
				[commentId, postId]
			)
			if (rows.length == 0){
				res.status(400).json({
					"actionResult": "ERR_INVALID_PROPERTIES",
					"invalidProperties": ["postId", "commentId"]
				})
				return
			}
			// Comment is in post tree, continue fetching
		}
		const {rows} = await db.query(
			"SELECT * FROM comments WHERE comment_id = $1",
			[commentId]
		)

		let currentUser: string | null = null
		let commentLikeStatus: boolean = false

		if (req.header("Authorization")){
			currentUser = getAuthenticatedUser(req)

			const {rows} = await db.query(
				"SELECT 1 FROM comment_likes WHERE comment_id = $1 AND username = $2;",
				[commentId, currentUser]
			)

			if (rows.length == 1){
				commentLikeStatus = true
			}
		}

		const childComments = await getDirectChildComments(commentId)
		const commentData = rows[0]
		const normalizedCommentData = normalizeObjectKeys(
			commentData,
			["comment_modified_time"]
		)

		const finalCommentData = {
			...normalizedCommentData,
			"userLikeStatus": commentLikeStatus,
			"childComments": childComments
		}

		res.status(200).json({
			"actionResult": "SUCCESS",
			"commentData": finalCommentData
		})
	} catch (err){
		console.error(err)
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

async function getCommentTree(req: Request, res: Response): Promise<void> {
	// GET /api/comments/:commentId/tree
	// Returns a tree like structure of the given commentId
	try {
		const {commentId} = req.params

		const postId = req.params.postId
		if (postId){
			// If a post id is passed as URL param, ensure that the comment is in the post tree
			const {rows} = await db.query(
				"SELECT 1 FROM comments WHERE comment_id = $1 AND comment_parent_post = $2",
				[commentId, postId]
			)
			if (rows.length == 0){
				res.status(400).json({
					"actionResult": "ERR_INVALID_PROPERTIES",
					"invalidProperties": ["postId", "commentId"]
				})
				return
			}
			// Comment is in post tree, continue fetching
		}

		const {rows} = await db.query(
			"SELECT * FROM comments WHERE comment_id = $1;",
			[commentId]
		)
		const commentData = rows[0]

		let currentUser: string | null = null
		let commentLikeStatus: boolean = false

		if (req.header("Authorization")) {
			currentUser = getAuthenticatedUser(req)

			const {rows} = await db.query(
				"SELECT 1 FROM comment_likes WHERE comment_id = $1 AND username = $2;",
				[commentId, currentUser]
			)

			if (rows.length == 1){
				commentLikeStatus = true
			}
		}

		const normalizedCommentData = normalizeObjectKeys(
			commentData,
			['comment_modified_time']
		)

		const finalCommentData = {
			...normalizedCommentData,
			"userLikeStatus": commentLikeStatus,
			"childComments": await getRecursiveChildComments(commentId, currentUser)
		}

		res.status(200).json({
			"actionResult": "SUCCESS",
			"commentData": finalCommentData
		})

	} catch (err){
		console.error(err)
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

async function updateComment(req: Request, res: Response): Promise<void> {
	try {
		// Use this with the following middlewares -
		// needsValidComment, needsCommentAuthor
		const {commentId} = req.params		// These parameters are guaranteed with middleware
		const {commentBody} = req.body

		const {postId} = req.params			// :postId may not exist
		if (postId){
			// Validate the comment & comment parent match if postId is parent
			const {rows} = await db.query(
				"SELECT 1 FROM comments WHERE comment_id = $1 AND comment_parent_post = $2",
				[commentId, postId]
			)

			if (rows.length == 0){
				res.status(400).json({
					"actionResult": "ERR_INVALID_PROPERTIES",
					"invalidProperties": ["commentId", "postId"]
				})

				return
			}
		}

		await db.query("BEGIN;")
		await db.query(
			"UPDATE comments " +
			"SET comment_body = $1, " +
			"comment_modified_time = NOW(), " +
			"comment_edited = TRUE " +
			"WHERE comment_id = $2;",
			[commentBody, commentId]
		)
		await db.query("COMMIT;")
		res.status(200).json({
			"actionResult": "SUCCESS"
		})
	} catch (err){
		console.error(err)
		await db.query("ROLLBACK;")
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

async function getCommentLikes(req: Request, res: Response): Promise<void> {
	try {
		const {commentId} = req.params
		const postId = req.params.postId

		if (postId){
			// Validate the comment & comment parent match if postId is parent
			const {rows} = await db.query(
				"SELECT 1 FROM comments WHERE comment_id = $1 AND comment_parent_post = $2",
				[commentId, postId]
			)

			if (rows.length == 0){
				res.status(400).json({
					"actionResult": "ERR_INVALID_PROPERTIES",
					"invalidProperties": ["commentId", "postId"]
				})

				return
			}
		}

		const likePage = req.query.likePage as string || "1"

		const parsedLikePage = Number.parseInt(likePage)
		if (Number.isNaN(parsedLikePage) || parsedLikePage < 1){
			res.status(400).json({
				"actionResult": "ERR_INVALID_PROPERTIES",
				"invalidProperties": ["likePage"]
			})
			return
		}

		const pageOffset = ((parsedLikePage - 1) * 10)

		const {rows} = await db.query(
			"SELECT username FROM comment_likes WHERE comment_id = $1 OFFSET $2 LIMIT 10;",
			[commentId, pageOffset]
		)

		const likedUsers = rows.map((row) => {
			return row.username
		})

		res.status(200).json({
			"actionResult": "SUCCESS",
			"likedUsers": likedUsers
		})

	} catch (err) {
		console.error(err)
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

async function likeComment(req: Request, res: Response): Promise<void> {
	try {
		const {commentId} = req.params
		const currentUser = getAuthenticatedUser(req)

		// Check if the current user has already liked the comment
		const {rows} = await db.query(
			"SELECT 1 FROM comment_likes WHERE comment_id = $1 AND username = $2;",
			[commentId, currentUser]
		)

		if (rows.length > 0){
			// The user has already liked the post
			// This type of request will most likely come from programmed clients
			// And not frontends
			res.status(400).json({
				"actionResult": "ERR_ALREADY_LIKED"
			})
			return
		}

		await db.query("BEGIN;")
		await db.query(
			"UPDATE comments SET comment_like_count = comment_like_count + 1 WHERE comment_id = $1;",
			[commentId]
		)
		await db.query(
			"INSERT INTO comment_likes VALUES ($1, $2);",
			[commentId, currentUser]
		)
		await db.query("COMMIT;")

		res.status(200).json({
			"actionResult": "SUCCESS"
		})
	} catch (err){
		console.error(err)
		await db.query("ROLLBACK;")
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

async function dislikeComment(req: Request, res: Response): Promise<void> {
	try {
		const {commentId} = req.params
		const currentUser = getAuthenticatedUser(req)

		// Check if the current user has already liked the comment
		const {rows} = await db.query(
			"SELECT 1 FROM comment_likes WHERE comment_id = $1 AND username = $2;",
			[commentId, currentUser]
		)

		if (rows.length == 0){
			// The user hasn't liked the comment
			res.status(400).json({
				"actionResult": "ERR_NOT_LIKED"
			})
			return
		}

		await db.query("BEGIN;")
		await db.query(
			"UPDATE comments SET comment_like_count = comment_like_count - 1 WHERE comment_id = $1;",
			[commentId]
		)
		await db.query(
			"DELETE FROM comment_likes WHERE comment_id = $1 AND username = $2;",
			[commentId, currentUser]
		)
		await db.query("COMMIT;")

		res.status(200).json({
			"actionResult": "SUCCESS"
		})
	} catch (err){
		console.error(err)
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

// See -
// https://stackoverflow.com/questions/32140273/nested-routes-in-express-where-a-parent-route-includes-a-param
// {mergeParams: true} allows parent routers to pass URLParams to child routers
const commentRouter = Router({
	mergeParams: true
})

/* Note that the commentRouter is mounted on two paths,
 *	- /api/posts/:postId/comments/
 * 		- GET /:
 * 			- Returns comment tree on specific post
 * 		- GET /:commentId/:
 * 			- Verifies the parent validity of the post and returns the comment data of the specific comment
 * 		- POST /:
 * 			- Creates a comment on specific post + verifies parent post validity
 * 		- PUT /:commentId/:
 * 			- Updates the specific comment
 * 		- POST /:commentId/likes:
 * 			- Likes the specific comment
 * 		- DELETE /:commentId/likes:
 * 			- Dislikes the specific comment
 *	- /api/comments/
 * 		- GET /:
 * 			- Errors due to incorrect route (see above)
 * 		- GET /:commentId/:
 * 			- Returns the comment data of specific comment
 * 		- POST /:
 * 			- Creates a comment with the specified postId (body param) as the parent post
 * 		- PUT /:commentId/:
 * 			- Updates the specific comment
 * 		- POST /:commentId/likes:
 * 			- Likes the specific comment
 * 		- DELETE /:commentId/likes:
 * 			- Dislikes the specific comment
 */

commentRouter.post(
	"/",
	[
		middleware.needsToken,
		middleware.needsActivatedUser,
		middleware.needsBodyParams("commentBody")	// commentParent and commentType are optional
	],
	createComment
)

commentRouter.get(
	"/",
	getPostComments
)

commentRouter.get(
	"/:commentId/",
	[
		middleware.needsURLParams("commentId"),
		middleware.needsValidComment,
		middleware.optionalToken
	],
	getComment
)

commentRouter.get(
	"/:commentId/tree",
	[
		middleware.needsURLParams("commentId"),
		middleware.needsValidComment,
		middleware.optionalToken
	],
	getCommentTree
)

commentRouter.put(
	"/:commentId/",
	[
		middleware.needsToken,
		middleware.needsURLParams("commentId"),
		middleware.needsValidComment,
		middleware.needsCommentAuthor,
		middleware.needsBodyParams("commentBody")
	],
	updateComment
)

commentRouter.get(
	"/:commentId/likes",
	[
		middleware.needsURLParams("commentId"),
		middleware.needsValidComment
	],
	getCommentLikes
)

commentRouter.post(
	"/:commentId/likes",
	[
		middleware.needsToken,
		middleware.needsURLParams("commentId"),
		middleware.needsValidComment
	],
	likeComment
)

commentRouter.delete(
	"/:commentId/likes",
	[
		middleware.needsToken,
		middleware.needsURLParams("commentId"),
		middleware.needsValidComment
	],
	dislikeComment
)

export {
	commentRouter
}