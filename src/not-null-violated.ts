import * as express from "express";
import { RestExceptionBase } from "./rest-exception-base";

// TODO mehrsprachig!

/**
 * @class NotNullViolated
 * @description Ein Pflicht-Attribut ist leer; HTTP-403
 */
export class NotNullViolated extends RestExceptionBase {
    public name: string = "NotNullViolated";
    public message: string;

    constructor(objectName: string) {
        super();
        this.message = `Pflichtangaben in ${objectName} fehlen.`;
    };

    public toString() { return (`Exception ${this.name}: ${this.message}`); };

    public giveResponse(res: express.Response): express.Response {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.write(this.message);
        res.end();
        return (res);
    }
};
