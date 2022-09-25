import {Request, Response, Router} from 'express';
import {db} from "../utils/db";
import * as middleware from '../utils/middleware'
import {getAuthenticatedUser, hasAuthToken, normalizeObjectKeys} from "../utils/common";

async function getFeed(req: Request, res: Response){
	try {
		const feedPage = req.query.feedPage as string || "1"
		const parsedFeedPage = Number.parseInt(feedPage)
		if (Number.isNaN(parsedFeedPage) || parsedFeedPage < 1){
			res.status(400).json({
				"actionResult": "ERR_INVALID_PROPERTIES",
				"invalidProperties": ["feedPage"]
			})
			return
		}
		const feedPageOffset = ((parsedFeedPage - 1) * 10)

		let currentUser: string | null = null
		if (hasAuthToken(req)){
			currentUser = getAuthenticatedUser(req)

			/* Important: Check if the user is following anyone */
			const {rows} = await db.query(
				"SELECT following_count FROM profiles WHERE username = $1;",
				[currentUser]
			)

			const currentUserData = rows[0]
			const currentUserFollowingCount = currentUserData.following_count

			if (currentUserFollowingCount == 0){
				// If the user isn't following anyone, act like they are a visitor
				currentUser = null
			}
		}

		if (currentUser == null){
			const {rows} = await db.query(
				"SELECT * FROM posts ORDER BY post_modified_time	DESC OFFSET $1 LIMIT 10;",
				[feedPageOffset]
			)

			const normalizedRows = rows.map((row) => {
				return normalizeObjectKeys(
					row,
					['post_modified_time']
				)
			})

			res.status(200).json({
				"actionResult": "SUCCESS",
				"feedData": normalizedRows
			})
		} else {
			const {rows} = await db.query(
				`SELECT posts.* FROM posts JOIN profile_follows
					ON posts.post_author = profile_follows.following_username AND profile_follows.follower_username = $1
					ORDER BY posts.post_modified_time DESC OFFSET $2 LIMIT 10;
               `,
				[currentUser, feedPageOffset]
			)

			if (rows.length != 0){
				const normalizedRows = rows.map((row) => {
					return normalizeObjectKeys(
						row, ['post_modified_time']
					)
				})

				res.status(200).json({
					"actionResult": "SUCCESS",
					"feedData": normalizedRows
				})
			} else {
				// If we are getting no rows,
				// It's a hint that we have exhausted all following user's posts
				// Fallback to posts from non-following users
				// Exclude posts from following users, since they are already viewed
				// We don't want the user to see the same posts a hundred times
				const fallbackPage = req.query.fallbackPage as string || "1"
				const parsedFallbackPage = Number.parseInt(fallbackPage)
				if (Number.isNaN(parsedFallbackPage) || parsedFallbackPage < 1){
					res.status(400).json({
						"actionResult": "ERR_INVALID_PROPERTIES",
						"invalidProperties": ["fallbackPage"]
					})
					return
				}
				const fallbackPageOffset = ((parsedFallbackPage - 1) * 10)

				const {rows} = await db.query(
					`SELECT posts.* FROM posts JOIN profile_follows
						ON posts.post_author != profile_follows.following_username AND profile_follows.follower_username = $1
						ORDER BY posts.post_modified_time DESC OFFSET $2 LIMIT 10;
					`,
					[currentUser, fallbackPageOffset]
				)

				const normalizedRows = rows.map((row) => {
					return normalizeObjectKeys(
						row,
						['post_modified_time']
					)
				})

				res.status(200).json({
					"actionResult": "FALLBACK_SUCCESS",
					"feedData": normalizedRows
				})
			}
		}
	} catch (err){
		console.error(err)
		res.status(500).json({
			"actionResult": "ERR_INTERNAL_ERROR"
		})
	}
}

const feedRouter = Router()

feedRouter.get(
	"/",
	[
		middleware.optionalToken
	],
	getFeed
)

export {
	feedRouter
}