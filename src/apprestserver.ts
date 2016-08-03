import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as errorHandler from 'errorhandler';

// log Requests/Responses (dev only)
let morgan = require('morgan');

// Debug Output
let debug = require('debug')('AppRestServer');

// Feature Flag, ob  mit Authentifizierung laufen soll
const useAuthentication = true;

/**
 * @class        AppRestServer
 * @description  die Basisklasse für den REST Server, liest Environment für die Konfiguration
 *                 - CONF_LISTEN_PORT       (8080)
 *                 - CONF_MONGO_SERVER_PORT (localhost:27017)
 *                 - NODE_ENV               (development)
 *               Konfig für MongoDB-Athentifizierung ist im Constructor hard-coded (mongoUrl)
 *               wenn Mode = dev, dann werden die Requests und Responses auf die Konsole geschrieben (Morgan Lib)
 */
export class AppRestServer {
    private confListenPort: string;
    private env: string;
    private mongoServerPort: string;
    protected mongoUrl: string;
    protected mongoOptions: string;
    protected isDevelopment: boolean;
    protected thisServer = express();

    constructor() {
        debug ('constructor() entry');

        this.confListenPort = process.env.CONF_LISTEN_PORT || 8080;
        this.mongoServerPort = process.env.CONF_MONGO_SERVER_PORT || 'localhost:27017';
        if (useAuthentication) {
            this.mongoUrl = 'mongodb://schemaOwner:manager28@' + this.mongoServerPort + '/';
            this.mongoOptions = '?authSource=admin';
        } else {
            this.mongoUrl = 'mongodb://' + this.mongoServerPort + '/';
        }
        this.env = process.env.NODE_ENV || 'development';
        this.isDevelopment = (this.env === 'development');

        debug('constructor exit');
    }

    private configServer() {
        debug('configServer() entry');

        this.thisServer.use(bodyParser.json());
        if (this.isDevelopment) { this.thisServer.use(errorHandler()); }

        console.log('using configuration:');
        console.log('port: %d', this.confListenPort);
        console.log('mode: %s', this.env);
        console.log('its development? ' + this.isDevelopment);
        console.log(`MongoDB URL="${this.mongoServerPort}"`);

        this.thisServer.disable('x-powered-by');

        debug ('configServer exit');
    }

    private configMiddleware() {
        debug('configMiddleware() entry');

        if (this.isDevelopment) {
            // alle Requests und Resonses ausgeben
            this.thisServer.use(morgan('dev'));

            // Cross Site Requests erlauben
            this.thisServer.use(function (req, res, next) {
                res.header('Access-Control-Allow-Origin', '*');
                res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
                res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
                next();
            });
        };

        debug('configMiddleware() exit');
    }

    // TODO getAuthentication() ist noch zu implementieren
    /**
     * @function getAuthentication
     * @description Express-Middleware-Handler, um die Authentifizierung und den Mandanten aus dem Request abzuleiten. Wird in den Routern der abgeleiteten Klassen aufgerufen
     */
    protected getAuthentication(req, res, next) {
        debug('getAuthentication() entry');

        req.params.tenant = 'demo';
        debug(`getAuthentication() exit: Tenant="${req.params.tenant}"`);
        next();
    }

    /**
     * @function getDemoTenant
     * @description Express-Middleware-Handler, um den Mandanten für die Test-/Demodaten zu setzen
     */
    protected getDemoTenant(req, res, next) {
        req.params.tenant = 'demo';
        next();
    }

    protected configRoutes() {
        debug('configRoutes(): sollte überladen sein!');
    }

    private listen() {
        debug('listen() entry');

        let serverInstance = this.thisServer.listen(this.confListenPort, () => {
            console.log(`HTTP server listening on port ${serverInstance.address().port} in ${this.thisServer.settings.env}`);
        });

        debug('listen() exit');
    }

    main() {
        debug('main() entry');
        let d = new Date();

        console.log(`${d.toLocaleDateString() + ' ' + d.toLocaleTimeString()} HTTP server starting up...`);

        this.configServer();
        this.configMiddleware();
        this.configRoutes();
        this.listen();

        debug('main() exit');
    }
};
