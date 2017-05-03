import * as express from 'express';

import { RestExceptionBase } from './rest-exception-base';

/**
 * @class NotNullViolated
 * @description Exception: a mandatory property is empty in payload
 */
export class NotNullViolated extends RestExceptionBase {

    constructor(objectName: string) {
        super('NotNullViolated', `at least one mandatory property for ${objectName} is empty or not given`, 403);
        this.additionalProperties.objectName = objectName;
    }
}
