import * as express from "express";

/**
 * @class  RestExceptionBase
 * @description Basisklasse für alle meine Exceptions, stellt sicher, dass es die Methode giveResponse() gibt
 *              damit kann unabhängig von der konkreten Exception der Resonse im Router gebildet werden
 */
export class RestExceptionBase extends Error {
    public giveResponse(res: express.Response): express.Response {
        return res;
    };
}
