import {db} from '../utils/db'
import {Request, Response, Router} from 'express'
import {getAuthenticatedUser} from "../utils/common"
import * as url from 'node:url'
import * as middleware from "../utils/middleware"

type PostType = "TEXT_POST" | "LINK_POST" | "IMAGE_POST" | "VIDEO_POST"

const validPostTypes: PostType[] = ["TEXT_POST", "LINK_POST", "IMAGE_POST", "VIDEO_POST"]

const separatorRegex = /(\.|\s|,|_|-|;|:|!|\?)/gi

function getRandomTagsFromTitle(postTitle: string): string[] {
	let tags: Set<string> = new Set<string>();
	postTitle = postTitle.trim()

	// Remove all punctuation marks and other special characters
	const strippedPostTitle = postTitle.replace(separatorRegex, ' ')
	let titleWords: string[] = strippedPostTitle.split(' ')
	titleWords.forEach((titleWord: string, wordIndex: number) => {
		titleWords[wordIndex] = titleWord
			.toLowerCase()
			.trim()
	})

	titleWords = titleWords.filter((titleWord: string) => {
		if (titleWord == "") {
			return false
		}
		return true
	})

	if (titleWords.length < 4) {
		return titleWords
	}

	while (tags.size < 4) {
		const randomWordIndex = Math.floor(Math.random() * titleWords.length)
		const randomWord = titleWords.at(randomWordIndex)!
		tags.add(randomWord)
	}

	const tagList = [...tags]
	return tagList
}

async function createPost(req: Request, res: Response): Promise<void> {
	try {
		await db.query("BEGIN;")
		let {postTitle, postBody} = req.body;
		// Get the post's author from the current authenticated user's token
		const postAuthor = getAuthenticatedUser(req)
		const postType: PostType = req.body.postType || "TEXT_POST"

		if (validPostTypes.indexOf(postType) == -1){
			res.status(400).json({
				"actionResult": "ERR_INVALID_PROPERTIES",
				"invalidProperties": ["postType"]
			})
			return
		}

		if (postType != "TEXT_POST") {
			try {
				// Note that the post body must be a valid URL in case of
				// Link, Image or Video posts
				// URL.constructor() errs when an invalid URL is provided
				const bodyURL = new url.URL(postBody)

				// We'll make a test call to the URL. A 404 will result in the post being discarded
				const linkResponse = await fetch(postBody)
				if (!linkResponse.ok) {
					res.status(400).json({
						"actionResult": "ERR_INVALID_PROPERTIES",
						"invalidProperties": ["postBody"]
					})
					return
				}
			} catch (err) {
				if (err instanceof TypeError) {
					res.status(400).json({
						"actionResult": "ERR_INVALID_PROPERTIES",
						"invalidProperties": ["postBody"]
					})
					return
				}
				// Pass it down to the overall handler
				throw err
			}
		}
		let postTags: string[] = [];
		let requestTags: string | null | undefined = req.body.postTags
		if (requestTags != null) {
			postTags = requestTags
							.trim()
							.split(separatorRegex)
							.slice(0, 4)
		} else {
			postTags = getRandomTagsFromTitle(postTitle)
		}
		const {rows} = await db.query(
			// post_id DEFAULT SERIAL | post_date_created NOW() | post_like_count DEFAULT 0 | edited DEFAULT FALSE
			"INSERT INTO posts VALUES (DEFAULT, $1, $2, $3, $4, $5, NOW(), DEFAULT, DEFAULT) RETURNING post_id;",
			[postAuthor, postType, postTitle, postBody, postTags]
		)
		// Get the id of the newly created post
		// Send it back to the client so that it can redirect it to the created post.
		const newPostId = rows[0].post_id
		await db.query("COMMIT;")
		res.status(200).json({
			"actionResult": "SUCCESS",
			"postId": newPostId
		})
	} catch (err) {
		console.error(err)
		await db.query("ROLLBACK;")
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

async function getPost(req: Request, res: Response): Promise<void> {

	// PostId will be passed as URL Param
	// Route /posts/:postId/
	try {
		const {postId} = req.params
		const numericPostId = parseInt(postId)
		if (Number.isNaN(numericPostId)) {
			res.status(400).json({
				"actionResult": "ERR_INVALID_PROPERTIES",
				"invalidProperties": ["postId"]
			})
			return
		}
		const {rows} = await db.query(
			"SELECT * FROM posts WHERE post_id = $1",
			[postId]
		)
		if (rows.length == 0) {
			// No post exists with that ID
			res.sendStatus(404)
		} else {
			const postData = rows[0]
			res.status(200).json({
				"actionResult": "SUCCESS",
				"postData": postData
			})
		}
	} catch (err) {
		console.error(err)
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

async function updatePost(req: Request, res: Response): Promise<void> {
	// PostId will be passed as URL Param
	// Route /posts/:postId/delete/
	try {
		await db.query("BEGIN;")
		const {postId} = req.params // postId will be validated by `needsPostAuthor` middleware
		const {postTitle, postBody} = req.body

		const postType: PostType = req.body.postType || "TEXT_POST"

		if (validPostTypes.indexOf(postType) == -1){
			res.status(400).json({
				"actionResult": "ERR_INVALID_PROPERTIES",
				"invalidProperties": ["postType"]
			})
			return
		}

		if (postType != "TEXT_POST") {
			try {
				// Note that the post body must be a valid URL in case of
				// Link, Image or Video posts
				// URL.constructor() errs when an invalid URL is provided
				const bodyURL = new url.URL(postBody)

				// We'll make a test call to the URL. A 404 will result in the post being discarded
				const linkResponse = await fetch(postBody)
				if (!linkResponse.ok) {
					res.status(400).json({
						"actionResult": "ERR_INVALID_PROPERTIES",
						"invalidProperties": ["postBody"]
					})
					return
				}
			} catch (err) {
				if (err instanceof TypeError) {
					res.status(400).json({
						"actionResult": "ERR_INVALID_PROPERTIES",
						"invalidProperties": ["postBody"]
					})
					return
				}
				// Pass it down to the overall handler
				throw err
			}
		}
		let postTags: string[] = [];
		let requestTags: string | null | undefined = req.body.postTags
		if (requestTags != null) {
			postTags = requestTags
				.trim()
				.split(separatorRegex)
				.slice(0, 4)
		} else {
			postTags = getRandomTagsFromTitle(postTitle)
		}

		// Update DB post content
		await db.query(
			"UPDATE posts " +
			"SET post_title = $1, " +
			"post_body = $2, " +
			"post_tags = $3, " +
			"post_modified_date = NOW(), " +
			"edited = TRUE " +
			"WHERE post_id = $4;",
			[postTitle, postBody, postTags, postId]
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

async function deletePost(req: Request, res: Response): Promise<void> {
	try {
		await db.query("BEGIN;")
		const {postId} = req.params
		/*
			User validity (i.e. post author = request maker) will be verified by needsPostAuthor middleware
			Post validity (i.e. correct post ID) will be verified by needsPostAuthor middleware (too!)
		 */

		await db.query(
			"DELETE FROM posts WHERE post_id = $1;",
			[postId]
		)

		// Delete related comments too!
		await db.query(
			"DELETE FROM comments WHERE comment_parent_post = $1;",
			[postId]
		)

		res.status(200).json({
			"actionResult": "SUCCESS"
		})
	} catch (err){
		console.error(err);
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

const postRouter = Router()

postRouter.post(
	"/",
	[
		middleware.needsToken,
		middleware.needsActivatedUser,
		middleware.needsBodyParams("postTitle", "postBody") // "postTags" and "postType" is optional here!
	],
	createPost
)

postRouter.get(
	"/:postId/",
	middleware.needsURLParams("postId"),
	getPost
)

postRouter.put(
	"/:postId/",
	[
		middleware.needsToken,
		middleware.needsURLParams("postId"),
		middleware.needsPostAuthor,
		middleware.needsBodyParams("postTitle", "postBody") // See above ^
	],
	updatePost
)

postRouter.delete(
	"/:postId/",
	[
		middleware.needsToken,
		middleware.needsURLParams("postId"),
		middleware.needsPostAuthor
	],
	deletePost
)

export {
	postRouter
}