import * as bodyParser from "body-parser";
import * as errorHandler from "errorhandler";
import * as express from "express";
import * as reqlogger from "morgan";
import * as logger from "winston";

import { IRestPayloadBase } from "./rest-payload-base";
import { TdRestExceptions as RestExceptions } from "./restexceptions";

// Feature Flag, ob  mit Authentifizierung laufen soll
const useAuthentication = true;

/**
 * @class        BaseAppRestServer
 * @description  die Basisklasse für den REST Server, liest Environment für die Konfiguration
 *                 - CONF_LISTEN_PORT       (8080)
 *                 - CONF_MONGO_SERVER_PORT (localhost:27017)
 *                 - NODE_ENV               (development)
 *               Konfig für MongoDB-Athentifizierung ist im Constructor hard-coded (mongoUrl)
 *               wenn Mode = dev, dann werden die Requests und Responses auf die Konsole geschrieben (Morgan Lib)
 */
export class RestAppServerBase {
    protected thisServer: express.Application;

    private mongoUrl: string;
    private mongoOptions: string;
    private mongoServerPort: string;
    private isDevelopment: boolean;
    private confListenPort: string;
    private env: string;

    constructor() {
        logger.debug("constructor() entry");

        this.thisServer = express();

        this.confListenPort = process.env.CONF_LISTEN_PORT || 8080;
        this.mongoServerPort = process.env.CONF_MONGO_SERVER_PORT || "localhost:27017";
        if (useAuthentication) {
            this.mongoUrl = "mongodb://schemaOwner:manager28@" + this.mongoServerPort + "/";
            this.mongoOptions = "?authSource=admin";
        } else {
            this.mongoUrl = "mongodb://" + this.mongoServerPort + "/";
        }
        this.env = process.env.NODE_ENV || "development";
        this.isDevelopment = (this.env === "development");

        logger.debug("constructor exit");
    }

    public main() {
        logger.debug("main() entry");

        console.log(`${new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString()} HTTP server starting up...`);

        this.configServer();
        this.configMiddleware();
        this.configRoutes();
        this.listen();

        logger.debug("main() exit");
    }

    // TODO getAuthentication() ist noch zu implementieren
    /**
     * @function getAuthentication
     * @description Express-Middleware-Handler, um die Authentifizierung und den Mandanten aus dem Request abzuleiten. Wird in den Routern der abgeleiteten Klassen aufgerufen
     */
    protected getAuthentication(req, res, next) {
        logger.debug("getAuthentication() entry");

        req.params.tenant = "demo";
        logger.debug(`getAuthentication() exit: Tenant="${req.params.tenant}"`);
        next();
    }

    /**
     * @function getDemoTenant
     * @description Express-Middleware-Handler, um den Mandanten für die Test-/Demodaten zu setzen
     */
    protected getDemoTenant(req, res, next) {
        req.params.tenant = "demo";
        next();
    }

    // eine URL mit ihrer Methode und ihrem Handler verknüpfen
    protected addHandlerGet(inUrl: string, inMethodeRef: (params: any, query: any) => Promise<IRestPayloadBase>) {
        this.thisServer.get(inUrl, this.getAuthentication, (req, res) => this.genericHandler(req, res, inMethodeRef));
    }

    protected configRoutes() {
        logger.debug("configRoutes(): sollte überladen sein!");
    }

    private configServer() {
        logger.debug("configServer() entry");

        this.thisServer.use(bodyParser.json());
        if (this.isDevelopment) { this.thisServer.use(errorHandler()); }

        console.log("using configuration:");
        console.log("port: %d", this.confListenPort);
        console.log("mode: %s", this.env);
        console.log("its development? " + this.isDevelopment);
        console.log(`MongoDB URL="${this.mongoServerPort}"`);

        this.thisServer.disable("x-powered-by");

        logger.debug("configServer exit");
    }

    private configMiddleware() {
        logger.debug("configMiddleware() entry");

        if (this.isDevelopment) {
            // alle Requests und Resonses ausgeben
            this.thisServer.use(reqlogger("dev"));

            // Cross Site Requests erlauben
            this.thisServer.use((req, res, next) => {
                res.header("Access-Control-Allow-Origin", "*");
                res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
                res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
                next();
            });
        }
        logger.debug("configMiddleware() exit");
    }

    // generischer URL-Handler, der die Controller-Methode nach HTTP umsetzt
    private genericHandler = (req, res, controllerFunction: (params: any, query: any) => Promise<IRestPayloadBase>): void => {
        // TODO: Parameter bzw. Query Parameter extrahieren und an die Controller-Methode übergeben
        controllerFunction(req.params, req.query)
            .then((result) => {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.write(JSON.stringify(result));
                res.end();
            })
            .catch((err) => {
                logger.error(`Error="${err.stack}"`);

                res = RestExceptions.ServerErrorResponse(err.message, err.stack, res);

            });
    }

    private listen() {
        logger.debug("listen() entry");

        let serverInstance = this.thisServer.listen(this.confListenPort, () => {
            console.log(`HTTP server listening on port ${serverInstance.address().port} in ${this.thisServer.settings.env}`);
        });

        logger.debug("listen() exit");
    }
};
