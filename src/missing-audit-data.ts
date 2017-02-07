import * as express from "express";

import { RestExceptionBase } from "./rest-exception-base";

/**
 * @class MissingAuditData
 * @description Exeption: Each Payload have to have an Audit Object to support locking and auditing. Here came a request without or with empty audit object.
 */
export class MissingAuditData extends RestExceptionBase {

    constructor() {
        super("MissingAuditData", "Internal error: request without audit data", 500);
    };
};
