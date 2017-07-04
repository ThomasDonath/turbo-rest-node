import * as bodyParser from 'body-parser';
import * as errorHandler from 'errorhandler';
import * as express from 'express';
import * as jwt from 'jsonwebtoken';
import * as reqlogger from 'morgan';

import { AuthenticationError } from './authentication-error';
import { IJwtToken } from './i-jwt-token';
import { IRestPayloadBase } from './i-rest-payload-base';
import { ITurboLogger } from './i-turbo-logger';
import { RestAppControllerAbstract } from './rest-app-controller-abstract';
import { RestExceptionBase } from './rest-exception-base';

/**
 * @class RestAppServerBase
 * @description Base Class for my Node.js Express server. resonsible for
 *              * get configuration from the environment:
 *                 - CONF_LISTEN_PORT       (8080)
 *                 - NODE_ENV               (development)
 *                 - CONF_SECRET_KEY        Secret String or public key to verify JWT in headers.x-auth-token
 *                 - optional CONF_LOG_LEVEL Log Level, if not set then DEBUG in development, INFO in production
 *              * handling all the HTTP request/response stuff, so we can use a controller with pure JSON in/output
 *              * does logging
 *              * if DEV mode and no CONF_SECRET_KEY, then no authentication (user = test, tenant = test-tenant), if PROD then Error
 */
export class RestAppServerBase {
  protected static secretKey: string;
  protected static logger: ITurboLogger;

  /**
   * @function ServerErrorResponse
   * @description return an error message and stacktrace as HTTP-500 response
   */
  protected static ServerErrorResponse(msg: string, stacktrace: string, res: express.Response): express.Response {
    RestAppServerBase.logger.svc.error(`Error-500 Msg:"${msg}" Stack="${stacktrace}"`);

    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.write(`Exception ${msg}: ${stacktrace}`);
    res.end();
    return (res);
  }

  protected thisServer: express.Application;

  private isDevelopment: boolean;
  private confListenPort: string;
  private APP_ENV: string;

  /**
   * @constructor
   * @description inject a controller and logger
   */
  constructor(protected URL_PREFIX: string, protected appController: RestAppControllerAbstract, useLogger: ITurboLogger) {
    RestAppServerBase.logger = useLogger;
    RestAppServerBase.logger.svc.debug('constructor() entry');

    this.thisServer = express();

    this.confListenPort = process.env.CONF_LISTEN_PORT || '8080';

    if ((!process.env.APP_ENV) || ((process.env.APP_ENV !== 'development') && (process.env.APP_ENV !== 'production'))) {
      throw new Error('APP_ENV not set. Cant start in unspecified environment - use "development" or "production"!');
    }
    this.APP_ENV = process.env.APP_ENV;
    this.isDevelopment = (this.APP_ENV === 'development');

    if (process.env.CONF_LOG_LEVEL) {
      RestAppServerBase.logger.svc.level = process.env.CONF_LOG_LEVEL;
    } else {
      if (this.isDevelopment) {
        RestAppServerBase.logger.svc.level = 'debug';
      } else {
        RestAppServerBase.logger.svc.level = 'info';
      }
    }

    RestAppServerBase.secretKey = process.env.CONF_SECRET_KEY;
    if (!RestAppServerBase.secretKey) {
      if (this.isDevelopment) {
        RestAppServerBase.logger.svc.warn('Development Mode without authentication');
      } else {
        RestAppServerBase.logger.svc.error('Production Mode without authentication');
        throw new Error('authentication required for Production Mode, no key found');
      }
    }

    RestAppServerBase.logger.svc.debug('constructor exit');
  }

  /**
   * @function main
   * @description has to be called as entrypoint from Node.js to run the server instance
   */
  public main() {
    RestAppServerBase.logger.svc.debug('main() entry');

    RestAppServerBase.logger.svc.info(`${new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString()} HTTP server starting up...`);
    RestAppServerBase.logger.svc.info(`Image built at ${process.env.IMAGE_BUILD_DATE} commit# ${process.env.IMAGE_COMMIT_REF_SHA} image tag ${process.env.IMAGE_TAG}`);

    this.configServer();
    this.configMiddleware();
    this.configHealthCheckRoute();
    this.configRoutes();
    this.listen();

    RestAppServerBase.logger.svc.debug('main() exit');
  }

  /**
   * @function getAuthentication
   * @description Express middleware handler to get user, authentication and tenant from the request
   */
  protected getAuthentication(req: express.Request, res: express.Response, next) {
    RestAppServerBase.logger.svc.debug('getAuthentication() entry');

    try {
      // https://www.npmjs.com/package/jsonwebtoken
      if (!RestAppServerBase.secretKey) {
        req.params.user = 'test';
        req.params.tenant = 'test-tenant';
      } else {
        let jwtt: IJwtToken;

        try {
          const headerString: string = req.headers.authorization as string;
          const bearerHeader: string | string[] = headerString.split(' ');
          if (typeof bearerHeader !== 'undefined') {
            const bearer = bearerHeader;
            jwtt = jwt.verify(bearer[1], RestAppServerBase.secretKey) as IJwtToken;
          } else {
            throw new Error('cant login without token');
          }
        } catch (e) {
          throw new AuthenticationError(e.name, e.message);
        }

        req.params.user = jwtt.username;
        req.params.tenant = jwtt.tenant;
      }
      RestAppServerBase.logger.svc.debug(`getAuthentication() exit: Tenant="${req.params.tenant}"`);

      next();

    } catch (err) {
      RestAppServerBase.logger.svc.error(`Error="${err.stack}"`);
      if (err instanceof RestExceptionBase) {
        res = err.giveResponse(res);
      } else {
        res = RestAppServerBase.ServerErrorResponse(err.message, err.stack, res);
      }
    }
  }

  /**
   * @function addHandlerGet
   * @description map an URL with verb GET to a method from the injected application controller
   * @param inUrl URL to be mapped
   * @param inMethodRef reference to method from application controller with the given signature (request and a reference to the application controller instance)
   */
  protected addHandlerGet(inUrl: string, inMethodRef: (req: express.Request, controllerFn) => Promise<IRestPayloadBase>) {
    this.thisServer.get(inUrl, this.getAuthentication, (req: express.Request, res: express.Response) => {
      this.genericHandler(req, res, inMethodRef, () => this.appController, 200);
    });
  }
  /**
   * @function addHandlerGetInsecure
   * @description map an URL with verb GET to a method from the injected application controller - without authentication
   * @param inUrl URL to be mapped
   * @param inMethodRef reference to method from application controller with the given signature (request and a reference to the application controller instance)
   */
  protected addHandlerGetInsecure(inUrl: string, inMethodRef: (req: express.Request, controllerFn) => Promise<IRestPayloadBase>) {
    this.thisServer.get(inUrl, (req: express.Request, res: express.Response) => {
      this.genericHandler(req, res, inMethodRef, () => this.appController, 200);
    });
  }
  /**
   * @function addHandlerPut
   * @description map an URL with verb PUT to a method from the injected application controller
   * @param inUrl URL to be mapped
   * @param inMethodRef reference to method from application controller with the given signature (request and a reference to the application controller instance)
   */
  protected addHandlerPut(inUrl: string, inMethodRef: (req: express.Request, controllerFn) => Promise<IRestPayloadBase>) {
    this.thisServer.put(inUrl, this.getAuthentication, (req, res) => {
      this.genericHandler(req, res, inMethodRef, () => this.appController, 200);
    });
  }
  /**
   * @function addHandlerPutInsecure
   * @description map an URL with verb PUT to a method from the injected application controller - without authentication
   * @param inUrl URL to be mapped
   * @param inMethodRef reference to method from application controller with the given signature (request and a reference to the application controller instance)
   */
  protected addHandlerPutInsecure(inUrl: string, inMethodRef: (req: express.Request, controllerFn) => Promise<IRestPayloadBase>) {
    this.thisServer.put(inUrl, (req, res) => {
      this.genericHandler(req, res, inMethodRef, () => this.appController, 200);
    });
  }
  /**
   * @function addHandlerPost
   * @description map an URL with verb POST to a method from the injected application controller
   * @param inUrl URL to be mapped
   * @param inMethodRef reference to method from application controller with the given signature (request and a reference to the application controller instance)
   */
  protected addHandlerPost(inUrl: string, inMethodRef: (req: express.Request, controllerFn) => Promise<IRestPayloadBase>) {
    this.thisServer.post(inUrl, this.getAuthentication, (req: express.Request, res: express.Response) => {
      this.genericHandler(req, res, inMethodRef, () => this.appController, 201);
    });
  }
  /**
   * @function addHandlerPostInsecure
   * @description map an URL with verb POST to a method from the injected application controller - without authentication
   * @param inUrl URL to be mapped
   * @param inMethodRef reference to method from application controller with the given signature (request and a reference to the application controller instance)
   */
  protected addHandlerPostInsecure(inUrl: string, inMethodRef: (req: express.Request, controllerFn) => Promise<IRestPayloadBase>) {
    this.thisServer.post(inUrl, (req: express.Request, res: express.Response) => {
      this.genericHandler(req, res, inMethodRef, () => this.appController, 201);
    });
  }
  /**
   * @function addHandlerDelete
   * @description map an URL with verb DELET to a method from the injected application controller
   * @param inUrl URL to be mapped
   * @param inMethodRef reference to method from application controller with the given signature (request and a reference to the application controller instance)
   */
  protected addHandlerDelete(inUrl: string, inMethodRef: (req: express.Request, controllerFn) => Promise<boolean>) {
    this.thisServer.delete(inUrl, this.getAuthentication, (req: express.Request, res: express.Response) => {
      this.genericHandler(req, res, inMethodRef, () => this.appController, 200);
    });
  }
  /**
   * @function addHandlerDeleteInsecure
   * @description map an URL with verb DELET to a method from the injected application controller - without authentication
   * @param inUrl URL to be mapped
   * @param inMethodRef reference to method from application controller with the given signature (request and a reference to the application controller instance)
   */
  protected addHandlerDeleteInsecure(inUrl: string, inMethodRef: (req: express.Request, controllerFn) => Promise<boolean>) {
    this.thisServer.delete(inUrl, (req: express.Request, res: express.Response) => {
      this.genericHandler(req, res, inMethodRef, () => this.appController, 200);
    });
  }
  /**
   * @function configRoutes
   * @description an (abstract) method to be filled out in the overloading class with calls to addHandlerXYZ, will be called during configuration of the server instance
   */
  protected configRoutes() {
    RestAppServerBase.logger.svc.warn('configRoutes(): !!! should be overloaded !!!');
  }
  /**
   * @function configHealthCheckRoute
   * @description fix configured route host:port/ping/ for health checks, should be test server, controller and persistence; default methods do this
   */
  protected configHealthCheckRoute() {
    this.addHandlerGetInsecure(this.URL_PREFIX + 'ping/', this.appController.healthCheck);
  }

  private configServer() {

    RestAppServerBase.logger.svc.debug('configServer() entry');

    this.thisServer.use(bodyParser.json());
    if (this.isDevelopment) { this.thisServer.use(errorHandler()); }

    RestAppServerBase.logger.svc.info('using configuration:');
    RestAppServerBase.logger.svc.info('port: %d', this.confListenPort);
    RestAppServerBase.logger.svc.info('mode: %s', this.APP_ENV);
    RestAppServerBase.logger.svc.info('its development? ' + this.isDevelopment);
    RestAppServerBase.logger.svc.info('log level: %s', RestAppServerBase.logger.svc.level);

    this.thisServer.disable('x-powered-by');

    function exitHandler(name: string) {
      RestAppServerBase.logger.svc.info(`got signal SIGINT or SIGTERM... shutdown...`);
      process.exit(0);
      return;
    }
    process.on('SIGINT', exitHandler.bind('SIGINT'));
    process.on('SIGTERM', exitHandler.bind('SIGTERM'));

    RestAppServerBase.logger.svc.debug('configServer exit');
  }

  private configMiddleware() {
    RestAppServerBase.logger.svc.debug('configMiddleware() entry');

    if (this.isDevelopment) {
      // write all requests and responses to log (Morgan Library)
      this.thisServer.use(reqlogger('dev'));
    }

    // Allow Cross Site Requests
    this.thisServer.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      next();
    });
    RestAppServerBase.logger.svc.debug('configMiddleware() exit');
  }

  /*
   * @function genericHandler
   * @description wrap the handling/transformation and error handling for HTTP from/to JSON and call the mapped method
   * from application controller. It was mapped in configRoutes with a call to addHandlerXYZ.
  */
  private genericHandler = (
    req: express.Request,
    res: express.Response,
    controllerFunction: (req: express.Request, getControllerFn) => Promise<any>,
    getControllerFn,
    successCode: number): void => {
    RestAppServerBase.logger.svc.debug('genericHandler entry');

    controllerFunction(req, getControllerFn)
      .then((result) => {
        res.writeHead(successCode, { 'Content-Type': 'application/json' });
        res.write(JSON.stringify(result));
        res.end();
        RestAppServerBase.logger.svc.debug('genericHandler exit');
      })
      .catch((err) => {
        RestAppServerBase.logger.svc.error(`Error="${err.stack}"`);
        if (err instanceof RestExceptionBase) {
          res = err.giveResponse(res);
        } else {
          res = RestAppServerBase.ServerErrorResponse(err.message, err.stack, res);

        }
      });
  }

  private listen() {
    RestAppServerBase.logger.svc.debug('listen() entry');

    const serverInstance = this.thisServer.listen(this.confListenPort, () => {
      RestAppServerBase.logger.svc.info(`HTTP server listening on port ${serverInstance.address().port} in ${this.thisServer.settings.env}`);
    });

    RestAppServerBase.logger.svc.debug('listen() exit');
  }
}
