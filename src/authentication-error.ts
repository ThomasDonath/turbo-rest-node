import * as express from "express";
import { RestExceptionBase } from "./rest-exception-base";

/**
 * @class AuthenticationError
 * @description Exception: authentication failure; details
 */
export class AuthenticationError extends RestExceptionBase {
    constructor(private errorName: string, errorMessage) {
        super("AuthenticationErrorException",
            `Not able to authenticate (${errorName})`,
            401);
        this.additionalProperties.errorName = errorName;
        this.additionalProperties.errorMessage = errorMessage;
    }
}
