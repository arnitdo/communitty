import * as path from "path"
import {Request, Response} from "express";

function apiNotFound(req: Request, res: Response){
	res.sendStatus(404)
}

function serveClient(req: Request, res: Response){
	res.status(200).sendFile(
		path.join(__dirname, '../client/build/index.html')
	)
}

export {
	apiNotFound,
	serveClient
}