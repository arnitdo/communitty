import * as path from "path"
import {Request, Response} from "express";

export function serveClient(req: Request, res: Response){
    res.status(200).sendFile(
        path.join(__dirname, '../client/build/index.html')
    );
}