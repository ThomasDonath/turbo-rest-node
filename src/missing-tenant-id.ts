import * as express from 'express';

import { RestExceptionBase } from './rest-exception-base';

/**
 * @class MissingTenantId
 * @description Exception: Each request have to name a tenant ID
 */
export class MissingTenantId extends RestExceptionBase {

    constructor() {
        super('MissingTenantId', 'Internal error: request without tenant ID', 500);
    };
};
