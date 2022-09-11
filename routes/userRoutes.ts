import {db} from '../utils/db'
import {Request, Response, Router} from "express";
import {needsURLParams} from "../utils/middleware";
import {normalizeObjectKeys} from "../utils/common";

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

const userRouter = Router()

userRouter.get(
	"/:userName/posts",
	[
		needsURLParams("userName")
	],
	getUserPosts
)

export {
	userRouter
}