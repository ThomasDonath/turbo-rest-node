# Turbo-Rest: base for all REST servers in my private project

available at npm: <https://www.npmjs.com/package/turbo-rest-node>

## What I want to get

I want to use a MEAN stack (MongoDB, Express, Node.js + Angular) in a container environment. There was a lot of boilerplate text to write and so I started this module.

So I want to implement:

* a Node.js instance configured with environment variables and a standard setup
* access to MongoDB with optimistic logging and some generic stuff (auditing). I know Mongoose, but there is much to much to write and I want to get a real schemaless implemantation
* an application controller without the need to have to deal with the HTTP stuff
* a health check through all layers
* standardized error handling
* less to write
* all to write as TypeScript

## How it's implemented

There are some prepared exceptions - all derived from RestExceptionBase as it allows a simpler handling inside the route handlers and standardized messages and error codes.

My RestAppServerBase Class prepares the application (read environment for port and so on) and particulary delivers a generic Request Handler. Here is all the biolderplate text to handle a HTTP request. The application logic will be done in the injected application controller. Beside this is a standard URL for a healthcheck. I've prepared an express middleware to do authentication - it's not implemented yet.

For the persistenence layer is there the base class RestPersistenceAbstract with some standard interfaces and the prepared health check. It should be database-agnostic but is driven by my MongoDB implementation. Besides this it reads some configuration from environment. The onlye implemnantion for this I've done is RestPersistenceMongo which implements it.

To put the application logic into it, there is RestAppControllerBase. In particulary to have a method for my health check but also to have a defined type to refence to.

Thanks for the input into my generic handler to: <https://visualstudiomagazine.com/articles/2015/09/01/managing-functions-in-typescript.aspx>

## How to Use

Put in your package.json and see ./sample/* where is

* sample-app-rest-server.ts derives an instance for a Node.js server. Here are only the routes and their handlers to configure. Use this.addHandlerXYZ for that.
* sample-app-controller.ts put here your handler methodes in (a better example will be written)
* sample.server.ts configering the persistence manager and application controller and inject them

### Authentication

Protected method getAuthentication implements authentication with JWT (secret string, no key) for every handler expect the xxxxInsecure's. JWT token will be defined in IJwtToken with username and tenant property.
If authenticated successfully then we set params.user & params.tenant for use in further handlers.

You may use a public key instead, however you have to put the secret string or key in env CONF_SECRET_KEY.

If no key given, in development mode we set user=test and tenant=test-tenant. But in production mode we dont start.

## How to set up for development

* git clone
* prepare tsconfig "../tsconfig-global-node.json" with your prefered settings or copy my "./tsconfig-global-node.td.json"
* npm install
* make xyz (yes, sorry: I've used the good old make - see the make targets in it)

* a small smoke test can be started with npm test or make test. You have to have a MongoDB at localhost:27017 with a user schemaOwner and password manager28
* to debug you may use the logger and/or do export DEBUG=* or whatever else (will be print out debug messages from node/express)

## Open Tasks

* Test
  * with DB
  * request (body) is no JSON, is incompatibel to IRestPayloadBase
  * all combinations of
    * noLock
    * markDeleted
    * DB per tenant or all tenants in one DB
  * see: <https://ian_lin.gitbooks.io/javascript-testing/content/chapter6.html> do it as testsuite(s)?
* security:
  * check/add Helmet, Express validation [Example](https://github.com/KunalKapadia/express-mongoose-es6-rest-api)
  * authentification: middleware is prepared and will be called already, but set only static tenant = Demo. Have to read a JWT from request, verify that; get tenant from JWT or from request and autorize this tenant
  * write user name into audit record (RestPersistenceAbstract.getAuditData)
* no any's
* *later on*
* connection pooling: reuse an opened connection, if database per tenant then reuse per tenant (FIFO array?)
* New doQbeBin() (used as "view recycle bin" in UI) and  emptyBin()
* Logging
  * implement as aspect
  * per-request-logging and/or set log level online (winston: logger.transports.console.level = new-level)
  * add correlation id (cid):
    * all calls behind the http request are unique assigned to the request? no - in simple CRUD logic only
    * many calls to different REST servers may belong to one client call? yes
    * ==> cid has to come from the request, if null so we calculate one and give it to any subsequent call as parameter or is there a better solution?