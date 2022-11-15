import {Request, Response, Router} from 'express';
import {db} from "../utils/db";
import * as middleware from '../utils/middleware'
import {getAuthenticatedUser, hasAuthToken, normalizeObjectKeys} from "../utils/common";
import {QueryResult} from "pg";

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
		let currentUserDiscarded: boolean = false
		let feedFallback: boolean = false

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
				currentUserDiscarded = true
			}
		}

		if (currentUser == null){
			const {rows} = await db.query(
				"SELECT * FROM posts ORDER BY post_modified_time	DESC OFFSET $1 LIMIT 10;",
				[feedPageOffset]
			)

			let randomRecommendedUsers: QueryResult<any>

			let currentDiscardedUser: string | null = null

			if (currentUserDiscarded === true){
				currentDiscardedUser = getAuthenticatedUser(req)
				randomRecommendedUsers = await db.query(
					"SELECT DISTINCT following_username FROM profile_follows WHERE following_username != $1" +
					"ORDER BY following_username DESC LIMIT 5",
					[currentDiscardedUser]
				)
			} else {
				randomRecommendedUsers = await db.query(
					"SELECT DISTINCT following_username FROM profile_follows ORDER BY following_username DESC LIMIT 5"
				)
			}

			if (randomRecommendedUsers.rows.length === 0){
				// On a fresh start, there won't be any users.
				// Start recommending all users
				randomRecommendedUsers = await db.query(
					"SELECT username AS following_username FROM profiles WHERE username != $1 ORDER BY follower_count DESC LIMIT 5",
					[currentDiscardedUser]
				)
			}

			const randomUserRows = randomRecommendedUsers.rows

			const recommendedUserNames = randomUserRows.map((row) => {
				return row.following_username
			})

			const recommendedUserData = await Promise.all(
				recommendedUserNames.map(async (userName) => {
					const {rows} = await db.query(
						"SELECT * FROM profiles WHERE username = $1",
						[userName]
					)

					const userData = rows[0]

					const normalisedUserData = normalizeObjectKeys(userData)

					return normalisedUserData
				})
			)

			const normalizedRows = await Promise.all(
				rows.map(async (row) => {
					const postId = row.post_id

					const userLikeQuery = await db.query(
						"SELECT 1 FROM post_likes WHERE post_id = $1 AND username = $2",
						[postId, currentDiscardedUser]
					)

					let finalPostData: any

					if (userLikeQuery.rows.length === 0){
						finalPostData = {
							...row,
							"user_like_status": false
						}
					} else {
						finalPostData = {
							...row,
							"user_like_status": true
						}
					}

					return normalizeObjectKeys(
						finalPostData,
						['post_tags', 'post_modified_time']
					)
				})
			)

			res.status(200).json({
				"actionResult": "SUCCESS",
				"feedFallback": feedFallback,
				"feedData": normalizedRows,
				"recommendedUsers": recommendedUserData
			})
		} else {
			const {rows} = await db.query(
				`SELECT posts.* FROM posts JOIN profile_follows
					ON posts.post_author = profile_follows.following_username AND profile_follows.follower_username = $1
					ORDER BY posts.post_modified_time DESC OFFSET $2 LIMIT 10;
               `,
				[currentUser, feedPageOffset]
			)

			let recommendedUsers = await db.query(
				`SELECT DISTINCT other_users_follow.following_username AS recommended_user, this_user_follow.follow_since FROM profile_follows other_users_follow JOIN profile_follows this_user_follow
					ON other_users_follow.follower_username = this_user_follow.following_username 
					   AND this_user_follow.follower_username = $1
                       AND other_users_follow.following_username != $1                                          
					ORDER BY this_user_follow.follow_since DESC LIMIT 5;
					`,
				[currentUser]
			)


			if (recommendedUsers.rows.length === 0){
				// In case the followers don't follow anyone, fallback to random recommendations
				recommendedUsers = await db.query(
					`SELECT DISTINCT other_users.username AS recommended_user, follower_count FROM profiles other_users JOIN profile_follows this_user_follows
					ON other_users.username != this_user_follows.following_username
						AND this_user_follows.follower_username = $1
                        AND other_users.username != $1
					ORDER BY follower_count DESC LIMIT 5`,
					[currentUser]
				)
			}

			const recommendedUserRows: any = recommendedUsers.rows

			const recommendedUsernames: string[] = recommendedUserRows.map((row: any): string => {
				return row.recommended_user as string
			})

			const recommendedUserData = await Promise.all(
				recommendedUsernames.map(async (userName) => {
					const {rows} = await db.query(
						"SELECT * FROM profiles WHERE username = $1",
						[userName]
					)

					const userData = rows[0]

					const normalisedUserData = normalizeObjectKeys(userData)

					return normalisedUserData
				})
			)

			if (rows.length != 0){
				const normalizedRows = await Promise.all(
					rows.map(async (row) => {
						const postId = row.post_id

						const userLikeQuery = await db.query(
							"SELECT 1 FROM post_likes WHERE post_id = $1 AND username = $2",
							[postId, currentUser]
						)

						let finalPostData: any

						if (userLikeQuery.rows.length === 0){
							finalPostData = {
								...row,
								"user_like_status": false
							}
						} else {
							finalPostData = {
								...row,
								"user_like_status": true
							}
						}

						return normalizeObjectKeys(
							finalPostData,
							['post_tags', 'post_modified_time']
						)
					})
				)

				res.status(200).json({
					"actionResult": "SUCCESS",
					"feedFallback": feedFallback,
					"feedData": normalizedRows,
					"recommendedUsers": recommendedUserData
				})
			} else {
				// If we are getting no rows,
				// It's a hint that we have exhausted all following user's posts
				// Fallback to posts from non-following users
				// Exclude posts from following users, since they are already viewed
				// We don't want the user to see the same posts a hundred times
				feedFallback = true
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
						['post_tags', 'post_modified_time']
					)
				})

				res.status(200).json({
					"actionResult": "SUCCESS",
					"feedFallback": feedFallback,
					"feedData": normalizedRows,
					"recommendedUsers": recommendedUsernames
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