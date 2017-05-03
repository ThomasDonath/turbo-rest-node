import * as express from 'express';
import { RestExceptionBase } from './rest-exception-base';

/**
 * @class RecordChangedByAnotherUser
 * @description Exception: a record to be changed was modified inbetween by another user - has another row version in the database as in payload
 */
export class RecordChangedByAnotherUser extends RestExceptionBase {
    constructor(private notFoundId: string) {
        super('RecordChangedByAnotherUser',
            `Record with ID ${notFoundId} was changed by another user inbetween. So it has another row version as in payload.
             User should refresh the view and repeat the change.`,
            409);
        this.additionalProperties.id = notFoundId;
    }
}
