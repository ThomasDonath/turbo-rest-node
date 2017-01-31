import * as express from "express";
import { RestExceptionBase } from "./rest-exception-base";

/**
 * @class TooManyRows
 * @description Mehr als einen Datensatz zur ID gefunden; HTTP-501
 */
export class TooManyRows extends RestExceptionBase {
    public name: string = "TooManyRows";
    public message: string;

    constructor(private notFoundId: string) {
        super();
        this.message = `Mehr als einen Datensatz mit der ID ${notFoundId} gefunden. Aktualisieren Sie bitte die Ansicht.`;
    };

    public toString() { return (`Exception ${this.name}: ${this.message}`); };

    public giveResponse(res: express.Response): express.Response {
        res.writeHead(501, { "Content-Type": "text/plain" });
        res.write(this.message);
        res.end();
        return (res);
    }
};
