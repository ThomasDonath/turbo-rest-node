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

## How to set up for development

* git clone
* prepare tsconfig "../tsconfig-global-node.json" with your prefered settings or copy my "./tsconfig-global-node.td.json"
* npm install
* make xyz (yes, sorry: I've used the good old make - see the make targets in it)

* a small smoke test can be started with npm test or make test. You have to have a MongoDB at localhost:27017 with a user schemaOwner and password manager28
* to debug you may use the logger and/or do export DEBUG=* or whatever else (will be print out debug messages from node/express)

## Open Tasks

* Test für die Kombinationen: noLock | markDeleted; siehe: <https://ian_lin.gitbooks.io/javascript-testing/content/chapter6.html> als Testsuite ausführen(?)
* Formatierung Logger (Timestamp + Quelle, Re)quest-ID (ECID), Per-Request-Logging, Log Level zur Laufzeit setzen?
* Authentifizierung: Die Middleware wird bereits aufgerufen, muss aber noch ausprogrammiert werden. Ziel ist, ein JWT vom Client zu kriegen, dieses zu verifizieren und daraus den Mandanten abzuleiten.
* echten Usernamen (aus Authentifizierung) in den AuditRecord schreiben (RestPersistenceAbstract.getAuditData)
* für alle DML wenn das Format nicht passt (JSON-Parse Fehler fängt Express ab - Pflichtfelder muss ich selber testen) ebenso, wenn der Body kein JSON sein sollte(?)
* Security: check/add Helmet, Express-validation See <https://github.com/KunalKapadia/express-mongoose-es6-rest-api?utm_source=microserviceweekly.com&utm_medium=email>
* *später*
* Das "Connection holen" in eine Funktion auslagern; diese Funktion könnte Connections je Mandant vorhalten (FIFO-Array(10))
* Löschen: => neue Methode queryAll (als "Papierkorb" im UI) und PapierkorbLeeren()
* Logging als Aspekt