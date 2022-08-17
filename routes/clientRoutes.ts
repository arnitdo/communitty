import * as path from "path"
import {Router, Request, Response} from "express";

function serveClient(req: Request, res: Response){
	res.status(200).sendFile(
		path.join(__dirname, '../client/build/index.html')
	)
}

const clientRouter = Router()

// Serve client on all routes
// Note that client-sided errors (such as invalid URLs) will be
// handled by react-router. We don't need to specify any specific error routes
clientRouter.get("*", serveClient)

export {
	clientRouter
}