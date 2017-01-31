import * as express from "express";
import { RestExceptionBase } from "./rest-exception-base";

/**
 * @class RecordChangedByAnotherUser
 * @description Der Datensatz in der DB hat eine andere Row-Version, als der im Request; HTTP-409
 */
export class RecordChangedByAnotherUser extends RestExceptionBase {
    public name: string = "RecordChangedByAnotherUser";
    public message: string;

    constructor(private notFoundId: string) {
        super();
        this.message =
            `Der Datensatz mit der ID ${notFoundId} wurde zwischenzeitlich geändert. ` +
            `Aktualisieren Sie bitte die Ansicht und wiederholen Sie die Änderung.`;
    };

    public toString() { return (`Exception ${this.name}: ${this.message}`); };

    public giveResponse(res: express.Response): express.Response {
        res.writeHead(409, { "Content-Type": "text/plain" });
        res.write(this.message);
        res.end();
        return (res);
    }
};
