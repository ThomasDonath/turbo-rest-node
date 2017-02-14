import { ITurboLogger } from "../i-turbo-logger";
import { RestAppServerBase } from "../rest-app-server-base";

import { SampleAppController } from "./sample-app-controller";

export class SampleAppRestServer extends RestAppServerBase {

    protected configRoutes() {
        RestAppServerBase.logger.svc.debug("configRoutes()");

        // this.addHandlerGet(URL_PREFIX + "myService", this.appController.qbeSomething);

        RestAppServerBase.logger.svc.debug("routes configured");
    }
}
