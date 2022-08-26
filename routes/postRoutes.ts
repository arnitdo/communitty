import {db} from '../utils/db'
import {Request, Response, Router} from 'express'
import {getAuthenticatedUser, normalizeObjectKeys, PropertyValidatorType, validateProperties} from "../utils/common"
import * as url from 'node:url'
import * as middleware from "../utils/middleware"

// IMPORTANT: Comment router is managed through the post router
import {commentRouter} from "./commentRoutes";

type PostType = "TEXT_POST"	| "LINK_POST" 	| "IMAGE_POST"	| "VIDEO_POST"
type SortType = "SORT_TOP"	| "SORT_HOT"	| "SORT_NEW"

const validPostTypes: PostType[] = ["TEXT_POST", "LINK_POST", "IMAGE_POST", "VIDEO_POST"]
const validSortTypes: SortType[] = ["SORT_TOP", "SORT_HOT", "SORT_NEW"]

type PostSearchParamType = {
	sortType: SortType,							// Sort Type : Hot, New or Top							Default: Hot
	postType: PostType | "ALL_POSTS",			// Post Type : Text, Link, Image or Video, or all posts	Default: All
	searchQuery: string | null | undefined,		// Search Query : null (all posts) or specific keywords	Default: null
	searchPage: number							// Paginated Search Results : Pages of 10 posts			Default: 1 (Posts 1 to 10)
}

const defaultSearchParams: PostSearchParamType = {
	sortType: "SORT_HOT",
	postType: "ALL_POSTS",
	searchQuery: null,
	searchPage: 1
}

async function searchPosts(searchParams: PostSearchParamType): Promise<string[]>{
	// This assumes that parameter validation has been carried out by the caller
	// In this case, the caller will be our route handler
	const {sortType, postType, searchQuery, searchPage} = searchParams
	let searchClauses: string[] = []
	let baseQuery = "SELECT post_id FROM posts" // Only select post IDs, not entire post data.
	let queryParams: any[] = [];

	if (searchQuery != null){
		let searchTags = getTagsFromString(searchQuery)
		searchClauses.push(" AND (")
		searchTags.forEach((searchTag, idx) => {
			searchClauses.push(" $" + (idx + 1) + " = ANY(post_tags) OR")
			queryParams.push(searchTag)
		})
		searchClauses.push(" FALSE)") // Boolean algebra, A || False -> A
	}

	if (postType != "ALL_POSTS"){
		const paramLength = queryParams.length
		const nextParamIndex = paramLength + 1
		searchClauses.push(" AND post_type LIKE $" + nextParamIndex)
		queryParams.push(postType)
	}

	if (sortType == "SORT_HOT"){
		searchClauses.push(
			" AND (NOW() - post_modified_date) < INTERVAL '1 day'" // Hot posts = posts < 1 day old
		)
	}

	if (sortType == "SORT_NEW"){
		searchClauses.push(
			" ORDER BY post_modified_date DESC"
		)
	}

	if (sortType == "SORT_TOP"){
		searchClauses.push(
			" ORDER BY post_like_count DESC"
		)
	}

	const pageOffset = ((searchPage - 1) * 10) // Using pages of 10 posts each

	if (searchClauses.length > 0) {
		baseQuery += " WHERE TRUE" // Boolean algebra, TRUE && A -> A
		searchClauses.forEach((searchClause) => {
			baseQuery += searchClause
		})
	}

	baseQuery += " OFFSET " + pageOffset + " LIMIT 10";

	const {rows} = await db.query(baseQuery, queryParams)

	const resultPostIds = rows.map((row) => {
		return row.post_id
	})

	return resultPostIds
}

const separatorRegex = /(\.|\s|,|_|-|;|:|!|\?)/gi

function getTagsFromString(tagString: string): string[] {
	let tags: Set<string> = new Set<string>();
	tagString = tagString.trim()

	// Remove all punctuation marks and other special characters
	const strippedTagString = tagString.replace(separatorRegex, ' ')
	let tagWords: string[] = strippedTagString.split(' ')
	tagWords.forEach((tagWord: string, wordIndex: number) => {
		tagWords[wordIndex] = tagWord
			.toLowerCase()
			.trim()
	})

	tagWords = tagWords.filter((tagWord: string) => {
		if (tagWord == "") {
			return false
		}
		return true
	})

	if (tagWords.length < 4) {
		return tagWords
	}

	while (tags.size < 4) {
		const randomWordIndex = Math.floor((Math.random() * tagWords.length) % tagWords.length)
		const randomWord = tagWords.at(randomWordIndex)!
		tags.add(randomWord)
	}

	const tagList = [...tags]
	return tagList
}

function validateSortType(sortType: SortType | null | undefined): boolean {
	if (sortType == null || sortType.trim() != ""){
		return true
	} else if (validSortTypes.indexOf(sortType) == -1){
		return false
	}
	return true
}

function validatePostType(postType: PostType | "ALL_POSTS" | null | undefined): boolean {
	if (postType == null || postType.trim() != "" || postType == "ALL_POSTS"){
		return true
	} else if (validPostTypes.indexOf(postType) == -1){
		return false
	}
	return true
}

function validateSearchQuery(searchQuery: string | null | undefined): boolean {
	if (searchQuery == null || searchQuery.trim() != ""){
		return true
	}
	return false
}

function validateSearchPage(searchPage: any): boolean {
	if (searchPage == null){
		return true
	} else {
		searchPage = parseInt(searchPage)
		if (Number.isNaN(searchPage) || searchPage < 1){
			// Search pages can either be null or 1-inf
			// A number > post count will return no rows anyway (with OFFSET)
			return false
		}
		return true
	}
}

async function createPost(req: Request, res: Response): Promise<void> {
	try {
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
			postTags = getTagsFromString(postTitle)
		}
		await db.query("BEGIN;")
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
		const {rows} = await db.query(
			"SELECT * FROM posts WHERE post_id = $1",
			[postId]
		)
		if (rows.length == 0) {
			// No post exists with that ID
			res.sendStatus(404)
		} else {
			const postData = rows[0]
			const normalizedPostData = normalizeObjectKeys(postData, ["post_modified_date"])
			res.status(200).json({
				"actionResult": "SUCCESS",
				"postData": normalizedPostData
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
			postTags = getTagsFromString(postTitle)
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
			Post validity (i.e. correct post ID) will be verified by needsValidPost middleware
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
		await db.query("COMMIT;")
		res.status(200).json({
			"actionResult": "SUCCESS"
		})
	} catch (err){
		console.error(err);
		await db.query("ROLLBACK;")
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

async function getPosts(req: Request, res: Response): Promise<void> {
	// Retrieves a set of posts based on query params
	try {// @ts-ignore
		const {sortType, postType, searchQuery, searchPage}: string = req.query
		const receivedSearchParams = {
			sortType, postType, searchQuery, searchPage
		}
		const searchParamValidators: PropertyValidatorType[] = [
			validateSortType, validatePostType, validateSearchQuery, validateSearchPage
		]

		const [validProperties, invalidProperties] = validateProperties(receivedSearchParams, searchParamValidators)
		if (invalidProperties.length > 0) {
			// If there are some invalid search properties, respond with 400
			res.status(400).json(
				{
					"actionResult": "ERR_INVALID_PROPERTIES",
					"invalidProperties": invalidProperties
				}
			)
			return
		}

		const finalSearchParams: PostSearchParamType = {
			"postType": postType || defaultSearchParams.postType,
			"sortType": sortType || defaultSearchParams.sortType,
			"searchQuery": searchQuery || defaultSearchParams.searchQuery,
			"searchPage": searchPage || defaultSearchParams.searchPage
		}

		const returnedPosts = await searchPosts(finalSearchParams)

		res.status(200).json({
			"actionResult": "SUCCESS",
			"post_ids": returnedPosts
		})
	} catch (err){
		console.error(err)
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

const postRouter = Router()

postRouter.get(
	"/",
	getPosts
)

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
		middleware.needsValidPost,
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
		middleware.needsValidPost,
		middleware.needsPostAuthor
	],
	deletePost
)

postRouter.use(
	"/:postId/comments/",
	[
		middleware.needsURLParams("postId"),
		middleware.needsValidPost
	],
	commentRouter
)

export {
	postRouter
}