import * as path from "path"
import {Request, Response} from "express";

function serveClient(req: Request, res: Response){
    res.status(200).sendFile(
        path.join(__dirname, '../client/build/index.html')
    )
}

export {serveClient}