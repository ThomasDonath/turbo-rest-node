import * as express from 'express';
import { RestExceptionBase } from './rest-exception-base';

/**
 * @class TooManyRows
 * @description Exception: more than one row found for a primary key value (have to be unique)
 */
export class TooManyRows extends RestExceptionBase {
    constructor(private notFoundId: string) {
        super('TooManyRows', `Found more than one row for the given ID ${notFoundId} (unique primary key value). Most often an internal error`, 501);
        this.additionalProperties.id = notFoundId;
    }
}
