import * as express from "express";
import { RestExceptionBase } from "./rest-exception-base";

/**
 * @class RecordNotFound
 * @description Datensatz zur ID nicht gefunden; HTTP-404
 */
export class RecordNotFound extends RestExceptionBase {
    public name: string = "RecordNotFoundException";
    public message: string;

    constructor(private notFoundId: string) {
        super();
        // TODO: für QBE anderen Text
        this.message = `Keinen Datensatz mit der ID ${notFoundId} gefunden. Aktualisieren Sie bitte die Ansicht.`;
    };

    public toString() { return (`Exception ${this.name}: ${this.message}`); };

    public giveResponse(res: express.Response): express.Response {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.write(this.message);
        res.end();
        return (res);
    }
};
