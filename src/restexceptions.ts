import * as express from "express";

// TODO
// tslint:disable-next-line:no-namespace
export namespace TdRestExceptions {

    /**
     * @class  TdRestException
     * @description Basisklasse für alle meine Exceptions, stellt sicher, dass es die Methode giveResponse() gibt
     *              damit kann unabhängig von der konkreten Exception der Resonse im Router gebildet werden
     */
    export class TdRestException extends Error {
        public giveResponse(res: express.Response): express.Response {
            return res;
        };
    }

    /**
     * @class RecordNotFound
     * @description Datensatz zur ID nicht gefunden; HTTP-404
     */
    // tslint:disable-next-line:max-classes-per-file
    export class RecordNotFound extends TdRestException {
        public name: string = "RecordNotFoundException";
        public message: string;

        constructor(private notFoundId: string) {
            super();
            this.message = `Keinen Datensatz mit der ID ${notFoundId} gefunden. Aktualisieren Sie bitte die Ansicht.`;
        };

        // tslint:disable-next-line:adjacent-overload-signatures
        public toString() { return (`Exception ${this.name}: ${this.message}`); };

        public giveResponse(res: express.Response): express.Response {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.write(this.message);
            res.end();
            return (res);
        }
    };

    /**
     * @class TooManyRows
     * @description Mehr als einen Datensatz zur ID gefunden; HTTP-501
     */
    // tslint:disable-next-line:max-classes-per-file
    export class TooManyRows extends TdRestException {
        public name: string = "TooManyRows";
        public message: string;

        constructor(private notFoundId: string) {
            super();
            this.message = `Mehr als einen Datensatz mit der ID ${notFoundId} gefunden. Aktualisieren Sie bitte die Ansicht.`;
        };

        // tslint:disable-next-line:adjacent-overload-signatures
        public toString() { return (`Exception ${this.name}: ${this.message}`); };

        public giveResponse(res: express.Response): express.Response {
            res.writeHead(501, { "Content-Type": "text/plain" });
            res.write(this.message);
            res.end();
            return (res);
        }
    };

    /**
     * @class RecordChangedByAnotherUser
     * @description Der Datensatz in der DB hat eine andere Row-Version, als der im Request; HTTP-409
     */
    // tslint:disable-next-line:max-classes-per-file
    export class RecordChangedByAnotherUser extends TdRestException {
        public name: string = "RecordChangedByAnotherUser";
        public message: string;

        constructor(private notFoundId: string, changedAt: Date, changedBy: string) {
            super();
            this.message =
                `Der Datensatz mit der ID ${notFoundId} wurde zwischenzeitlich (${changedAt.toLocaleString()}) durch ${changedBy} geändert. ` +
                `Aktualisieren Sie bitte die Ansicht und wiederholen Sie die Änderung.`;
        };

        // tslint:disable-next-line:adjacent-overload-signatures
        public toString() { return (`Exception ${this.name}: ${this.message}`); };

        public giveResponse(res: express.Response): express.Response {
            res.writeHead(409, { "Content-Type": "text/plain" });
            res.write(this.message);
            res.end();
            return (res);
        }
    };

    /**
     * @class RecordExistsAlready
     * @description Der Datensatz existiert bereits; HTTP-409
     */
    // tslint:disable-next-line:max-classes-per-file
    export class RecordExistsAlready extends TdRestException {
        public name: string = "RecordExistsAlready";
        public message: string;

        constructor(changedAt: Date, changedBy: string) {
            super();
            this.message = `Dieser Datensatz existiert bereits. Eingfügt bzw. zuletzt geändert: ${changedAt.toLocaleString()} durch ${changedBy}.`;
        };

        // tslint:disable-next-line:adjacent-overload-signatures
        public toString() { return (`Exception ${this.name}: ${this.message}`); };

        public giveResponse(res: express.Response): express.Response {
            res.writeHead(409, { "Content-Type": "text/plain" });
            res.write(this.message);
            res.end();
            return (res);
        }
    };

    /**
     * @class NotNullViolated
     * @description Ein Pflicht-Attribut ist leer; HTTP-403
     */
    // tslint:disable-next-line:max-classes-per-file
    export class NotNullViolated extends TdRestException {
        public name: string = "NotNullViolated";
        public message: string;

        constructor(objectName: string) {
            super();
            this.message = `Pflichtangaben in ${objectName} fehlen.`;
        };

        // tslint:disable-next-line:adjacent-overload-signatures
        public toString() { return (`Exception ${this.name}: ${this.message}`); };

        public giveResponse(res: express.Response): express.Response {
            res.writeHead(403, { "Content-Type": "text/plain" });
            res.write(this.message);
            res.end();
            return (res);
        }
    };

    /**
     * @function ServerErrorResponse
     * @description Einen Fehler (Exception) als HTTP-Resonse Internen Serverfehler zurück liefern; HTTP-500
     */
    export function ServerErrorResponse(msg: string, stacktrace: string, res: express.Response): express.Response {
        console.log(`Error-500 Msg:"${msg}" Stack="${stacktrace}"`);

        res.writeHead(500, { "Content-Type": "text/plain" });
        res.write(`Exception ${msg}: ${stacktrace}`);
        res.end();
        return (res);
    }
}
