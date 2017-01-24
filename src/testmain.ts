// TODO3 für alle DML wenn das Format nicht passt (JSON-Parse Fehler fängt Express ab - Pflichtfelder muss ich selber testen) ebenso, wenn der Body kein JSON sein sollte(?)

import * as logger from "winston";

import { RestAppServerBase } from "./rest-app-server-base";
import { RestExceptions as RestExceptions } from "./rest-exceptions";

import { TestController } from "./test-controller";
import { ITestPayload } from "./testpayload";

// TODO = Parameter für Constructor 
// const URL_PREFIX = "/svcgeschaeftspartner/";

class ThisAppRestServer extends RestAppServerBase {

    private _URL_PREFIX: string;
    private myController: TestController;

    constructor(baseUrl: string = "/", controller) {
        super(controller);

        this._URL_PREFIX = baseUrl;
        // TODO        this.controller = new AppController(this.mongoUrl, this.mongoOptions);
        this.myController = controller;
    }

    protected configRoutes() {
        logger.debug("configRoutes()");

        // ----------------------------------------------------------
        this.thisServer.get(this._URL_PREFIX, this.getAuthentication, (req, res) => {
            // Query-Parameter: code, name, ort, suche
            logger.debug(`geschaeftspartnerLkp Query: Tenant ID = "${req.params.tenant}"`);

            res.writeHead(200, { "Content-Type": "application/json" });
            res.end();
        });

        // eine URL mit ihrer Methode und ihrem Handler verknüpfen
        // this.thisServer.get(this._URL_PREFIX + "test", this.getAuthentication, (i, o) => this.genericHandler(i, o, this.testHandler));
        this.addHandlerGet(this._URL_PREFIX + "test", this.myController.testHandler);
        this.addHandlerGet(this._URL_PREFIX + "testp/:id", this.myController.testHandlerP);
        this.addHandlerGet(this._URL_PREFIX + "testq/", this.myController.testHandlerQ);

        logger.debug("routes configured");
    }
}

let thisController = new TestController("blublu");
let thisServer = new ThisAppRestServer("/api/", thisController);

thisServer.main();
// curl http://localhost:8080/api/test; curl http://localhost:8080/api/testp/:id=2809; curl http://localhost:8080/api/testq?id=2808
