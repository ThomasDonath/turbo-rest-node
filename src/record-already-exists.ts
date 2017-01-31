import * as express from "express";
import { RestExceptionBase } from "./rest-exception-base";

/**
 * @class RecordExistsAlready
 * @description Der Datensatz existiert bereits; HTTP-409
 */
export class RecordExistsAlready extends RestExceptionBase {
    public name: string = "RecordExistsAlready";
    public message: string;

    constructor(changedAt: Date, changedBy: string) {
        super();
        this.message = `Dieser Datensatz existiert bereits. Eingfügt bzw. zuletzt geändert: ${changedAt.toLocaleString()} durch ${changedBy}.`;
    };

    public toString() { return (`Exception ${this.name}: ${this.message}`); };

    public giveResponse(res: express.Response): express.Response {
        res.writeHead(409, { "Content-Type": "text/plain" });
        res.write(this.message);
        res.end();
        return (res);
    }
};
