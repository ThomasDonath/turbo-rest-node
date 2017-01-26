import * as bodyParser from "body-parser";
import * as errorHandler from "errorhandler";
import * as express from "express";
import * as reqlogger from "morgan";

import { RestExceptions as RestExceptions } from "./rest-exceptions";
import { IRestPayloadBase } from "./rest-payload-base.interface";
import { ITurboLogger } from "./turbo-logger.interface";

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
    protected static logger: ITurboLogger;

    // Feature Flag, ob  mit Authentifizierung laufen soll
    protected useAuthentication = true;
    protected thisServer: express.Application;

    private isDevelopment: boolean;
    private confListenPort: string;
    private env: string;

    constructor(protected appController, useLogger: ITurboLogger, doUseAuthentication: boolean = true) {
        RestAppServerBase.logger = useLogger;
        RestAppServerBase.logger.svc.debug("constructor() entry");

        this.thisServer = express();

        this.confListenPort = process.env.CONF_LISTEN_PORT || 8080;

        this.env = process.env.NODE_ENV || "development";
        this.isDevelopment = (this.env === "development");

        RestAppServerBase.logger.svc.debug("constructor exit");
    }

    public main() {
        RestAppServerBase.logger.svc.debug("main() entry");

        RestAppServerBase.logger.svc.info(`${new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString()} HTTP server starting up...`);

        this.configServer();
        this.configMiddleware();
        this.configRoutes();
        this.listen();

        RestAppServerBase.logger.svc.debug("main() exit");
    }

    // TODO getAuthentication() ist noch zu implementieren
    /**
     * @function getAuthentication
     * @description Express-Middleware-Handler, um die Authentifizierung und den Mandanten aus dem Request abzuleiten. Wird in den Routern der abgeleiteten Klassen aufgerufen
     */
    protected getAuthentication(req: express.Request, res: express.Response, next) {
        RestAppServerBase.logger.svc.debug("getAuthentication() entry");

        req.params.tenant = "demo";
        RestAppServerBase.logger.svc.debug(`getAuthentication() exit: Tenant="${req.params.tenant}"`);

        next();
    }

    /**
     * @function getDemoTenant
     * @description Express-Middleware-Handler, um den Mandanten für die Test-/Demodaten zu setzen
     */
    protected getDemoTenant(req: express.Request, res: express.Response, next) {
        req.params.tenant = "demo";
        next();
    }

    // eine URL mit ihrer Methode und ihrem Handler verknüpfen
    protected addHandlerGet(inUrl: string, inMethodeRef: (req: express.Request, controllerFn) => Promise<IRestPayloadBase>) {
        this.thisServer.get(inUrl, this.getAuthentication, (req: express.Request, res: express.Response) => {
            this.genericHandler(req, res, inMethodeRef, () => this.appController, 200);
        });
    }
    protected addHandlerPut(inUrl: string, inMethodeRef: (req: express.Request, controllerFn) => Promise<IRestPayloadBase>) {
        this.thisServer.put(inUrl, this.getAuthentication, (req, res) => {
            this.genericHandler(req, res, inMethodeRef, () => this.appController, 200);
        });
    }
    protected addHandlerPost(inUrl: string, inMethodeRef: (req: express.Request, controllerFn) => Promise<IRestPayloadBase>) {
        this.thisServer.post(inUrl, this.getAuthentication, (req: express.Request, res: express.Response) => {
            this.genericHandler(req, res, inMethodeRef, () => this.appController, 201);
        });
    }
    protected addHandlerDelete(inUrl: string, inMethodeRef: (req: express.Request, controllerFn) => Promise<IRestPayloadBase>) {
        this.thisServer.delete(inUrl, this.getAuthentication, (req: express.Request, res: express.Response) => {
            this.genericHandler(req, res, inMethodeRef, () => this.appController, 200);
        });
    }

    protected configRoutes() {
        RestAppServerBase.logger.svc.warn("configRoutes(): sollte überladen sein!");
    }

    private configServer() {
        RestAppServerBase.logger.svc.debug("configServer() entry");

        this.thisServer.use(bodyParser.json());
        if (this.isDevelopment) { this.thisServer.use(errorHandler()); }

        RestAppServerBase.logger.svc.info("using configuration:");
        RestAppServerBase.logger.svc.info("port: %d", this.confListenPort);
        RestAppServerBase.logger.svc.info("mode: %s", this.env);
        RestAppServerBase.logger.svc.info("its development? " + this.isDevelopment);

        this.thisServer.disable("x-powered-by");

        RestAppServerBase.logger.svc.debug("configServer exit");
    }

    private configMiddleware() {
        RestAppServerBase.logger.svc.debug("configMiddleware() entry");

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
        RestAppServerBase.logger.svc.debug("configMiddleware() exit");
    }

    // generischer URL-Handler, der die Controller-Methode nach HTTP umsetzt
    private genericHandler = (
        req: express.Request,
        res: express.Response,
        controllerFunction: (req: express.Request, getControllerFn) => Promise<IRestPayloadBase>,
        getControllerFn,
        successCode: number): void => {
        RestAppServerBase.logger.svc.debug("genericHandler entry");

        controllerFunction(req, getControllerFn)
            .then((result) => {
                res.writeHead(successCode, { "Content-Type": "application/json" });
                res.write(JSON.stringify(result));
                res.end();
                RestAppServerBase.logger.svc.debug("genericHandler exit");
            })
            .catch((err) => {
                RestAppServerBase.logger.svc.error(`Error="${err.stack}"`);
                if (err instanceof RestExceptions.TdRestException) {
                    res = err.giveResponse(res);
                } else {
                    res = RestExceptions.ServerErrorResponse(err.message, err.stack, res);

                }
            });
    }

    private listen() {
        RestAppServerBase.logger.svc.debug("listen() entry");

        let serverInstance = this.thisServer.listen(this.confListenPort, () => {
            console.log(`HTTP server listening on port ${serverInstance.address().port} in ${this.thisServer.settings.env}`);
        });

        RestAppServerBase.logger.svc.debug("listen() exit");
    }
};
