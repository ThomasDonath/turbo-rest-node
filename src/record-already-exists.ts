import * as express from 'express';
import { RestExceptionBase } from './rest-exception-base';

/**
 * @class RecordExistsAlready
 * @description Exception: a record with the value for primary or unique key do exists already
 */
export class RecordExistsAlready extends RestExceptionBase {
    constructor(inChangedAt: Date, inChangedBy: string) {
        super('RecordExistsAlready', `A record with the same primary or unique key value already exists. Inserted or last change at ${inChangedAt.toLocaleString()} by ${inChangedBy}.`, 409);
        this.additionalProperties.changedAt = inChangedAt;
        this.additionalProperties.changedby = inChangedBy;
    }
}
