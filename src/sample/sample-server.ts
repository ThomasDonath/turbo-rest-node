import * as loggerLib from "winston";

import { ITurboLogger } from "../i-turbo-logger";
import { RestPersistenceMongo } from "../rest-persistence-mongo";

import { SampleAppController } from "./sample-app-controller";
import { SampleAppRestServer } from "./sample-app-rest-server";

// Logging konfigurieren
let myLogger: ITurboLogger = { svc: null };
myLogger.svc = new (loggerLib.Logger)({
    transports: [
        new (loggerLib.transports.Console)(),
    ],
});
myLogger.svc.level = "debug";

let samplePersistence = new RestPersistenceMongo(true, "sample", myLogger, "dbPerTenant", null);
let sampleController = new SampleAppController(samplePersistence, myLogger);
let sampleServer = new SampleAppRestServer("/", sampleController, myLogger);

sampleServer.main();
