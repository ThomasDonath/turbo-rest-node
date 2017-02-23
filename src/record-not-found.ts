import * as express from 'express';
import { RestExceptionBase } from './rest-exception-base';

/**
 * @class RecordNotFound
 * @description Exception: there is no record for the given ID.
 */
export class RecordNotFound extends RestExceptionBase {
    constructor(private notFoundId: string) {
        super('RecordNotFoundException',
            `No record with internal ID (Primary Key) ${notFoundId} found. Almost an internal error.`,
            404);
        this.additionalProperties.id = notFoundId;
    }
}
