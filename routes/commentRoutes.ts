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

async function getRecursiveChildComments(commentId: string): Promise<Object> {
	// Returns comment IDs of all children / grand-children / grand-grand.... you get the point
	const directChildren = await getDirectChildComments(commentId)
	const commentTree = await Promise.all(
		directChildren.map(async (childComment) => {
			return {
				"commentId": childComment,
				"children": await getRecursiveChildComments(childComment)
			}
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
			"INSERT INTO comments VALUES (DEFAULT, $1, $2, $3, $4, DEFAULT, $5) RETURNING comment_id",
			[commentAuthor, postId, commentType, commentBody, commentParent]
		)

		// Return the newly created comment's id to the client
		const newCommentId = rows[0].comment_id

		await db.query("COMMIT;")
		res.status(200).json({
			"actionResult": "SUCCESS",
			"postId": postId,
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
	// Returns a tree like structure of all comments (comment ids) on a post
	// Useful format for frontend clients to parse and display comment trees
	try {
		// Use with needsValidPost middleware
		const {postId} = req.params
		const {rows} = await db.query(
			"SELECT comment_id FROM comments WHERE comment_parent_post = $1 AND comment_type = 'ROOT'",
			[postId]
		)
		const childComments = rows.map((row) => {
			return row.comment_id
		})
		// Promise.all() returns Promise<T[]>
		const childCommentTree = await Promise.all(
			// Array.map(async (param) => T) returns Promise<T>[]
			childComments.map(async (childComment) => {
				return {
					"commentId": childComment,
					"children": await getRecursiveChildComments(childComment)
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
		if (rows.length == 0){
			res.status(404).json({
				"actionResult": "ERR_INVALID_PROPERTIES",
				"invalidProperties": ["commentId"]
			})
			return
		}
		const commentData = rows[0]
		const normalizedCommentData = normalizeObjectKeys(commentData)
		res.status(200).json({
			"actionResult": "SUCCESS",
			"commentData": normalizedCommentData
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
 * 		-  GET /:
 * 			- Returns comment tree on specific post
 * 		- POST /:
 * 			- Creates a comment on specific post
 *	- /api/comments/
 * 		- GET /:commentId/:
 * 			- Returns the comment data of specific comment
 * 		- POST /:
 * 			- Creates a comment with the specified postId as the parent post
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
		middleware.needsValidComment
	],
	getComment
)

export {
	commentRouter
}