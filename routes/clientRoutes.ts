import * as path from "path"
import {Request, Response} from "express";

export function serveClient(req: Request, res: Response){
    res.sendFile(
        path.join(__dirname, '../client/build/index.html')
    );
}