import * as express from "express";

import { IRestPayloadBase } from "./i-rest-payload-base";
import { ITurboLogger } from "./i-turbo-logger";
import { RestPersistenceAbstract } from "./rest-persistence-abstract";

/*
 * @class RestAppControllerAbstract
 * @description interface to supply needed methods to the base classes
*/
export abstract class RestAppControllerAbstract {
    protected static logger;
    private static indexDefs = [];

    constructor(private persistenceManager: RestPersistenceAbstract, useLogger: ITurboLogger) {
        RestAppControllerAbstract.logger = useLogger;
    }

    public healthCheck(request: express.Request, getControllerFn: () => RestAppControllerAbstract): Promise<IRestPayloadBase> {

        let tenantId: string = request.params.tenant || "0";

        RestAppControllerAbstract.logger.svc.debug(`healthCheck "${tenantId}")`);

        return getControllerFn().persistenceManager.healthCheck(tenantId, () => getControllerFn().persistenceManager);
    }
}
