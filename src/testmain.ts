// TODO3 für alle DML wenn das Format nicht passt (JSON-Parse Fehler fängt Express ab - Pflichtfelder muss ich selber testen) ebenso, wenn der Body kein JSON sein sollte(?)

import { RestAppServerBase } from "./rest-app-server-base";
import { TdRestExceptions as RestExceptions } from "./restexceptions";

import * as debug from "debug";

// TODO = Parameter für Constructor 
// const URL_PREFIX = "/svcgeschaeftspartner/";

class ThisAppRestServer extends RestAppServerBase {

    private _URL_PREFIX: string;

    // TODO    private controller: AppController;

    constructor(baseUrl: string = "/") {
        super();

        this._URL_PREFIX = baseUrl;
        // TODO        this.controller = new AppController(this.mongoUrl, this.mongoOptions);
    }

    protected configRoutes() {
        debug("configRoutes()");

        // ----------------------------------------------------------
        this.thisServer.get(this._URL_PREFIX, this.getAuthentication, (req, res) => {
            // Query-Parameter: code, name, ort, suche
            debug(`geschaeftspartnerLkp Query: Tenant ID = "${req.params.tenant}"`);
            /*
                        this.controller.findGeschaeftspartnerLkp(req.query.code, req.query.name, req.query.ort, req.query.suche, req.params.tenant)
                            .then((result) => {
                                res.writeHead(200, { "Content-Type": "application/json" });
                                res.write(JSON.stringify(result));
                                res.end();
                            })
                            .catch((err) => {
                                debug(`geschaeftspartnerLkp Query Error="${err.stack}"`);
            
                                res = RestExceptions.ServerErrorResponse(err.message, err.stack, res);
                    });*/
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end();
        });

        // eine URL mit ihrer Methode und ihrem Handler verknüpfen
        this.thisServer.get(this._URL_PREFIX + "test", this.getAuthentication, (i, o) => this.genericHandler(i, o, this.testHandler));

        debug("routes configured");
    }

    // https://visualstudiomagazine.com/articles/2015/09/01/managing-functions-in-typescript.aspx

    // ein beispielhafter URL-Handler, der Boilerplate-Code macht und den richtigen Controller aufruft
    private genericHandler = (req, res, controllerFunction: (req, res) => Promise<string>): void => {
        debug(`geschaeftspartnerLkp Query: Tenant ID = "${req.params.tenant}"`);

        controllerFunction(req, res)
            .then((result) => {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.write("Hallo Held!" + JSON.stringify(req.params));
                res.end();
            });
    }

    // Und das ist in der dedizierten Controller-Klasse und hat nix mehr mit dem Express-Server zu tun :)
    private testHandler = (req, res): Promise<string> => {

        return new Promise<string>((fulfill, reject) => {
            fulfill("Hallo Du Held!");
        });
    }
}

let thisServer = new ThisAppRestServer();

thisServer.main();
