
import { RestAppServerBase } from "../rest-app-server-base";
// import { RestPersistenceMongo } from "turbo-rest-node";

import { ITurboLogger } from "../i-turbo-logger";

// import { SampleAppController } from "./sample-app-controller";

const URL_PREFIX = "/svcgeschaeftspartner/";

export class SampleAppRestServer extends RestAppServerBase {

    constructor(myController, useLogger: ITurboLogger) {
        super(myController, useLogger);
    }

    protected configRoutes() {
        RestAppServerBase.logger.svc.debug("configRoutes()");

        // this.addHandlerGet(URL_PREFIX + "myService", this.appController.qbeSomething);

        RestAppServerBase.logger.svc.debug("routes configured");
    }
}
