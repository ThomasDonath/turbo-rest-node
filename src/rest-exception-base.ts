import * as express from 'express';

/**
 * @class  RestExceptionBase
 * @description base for all my exceptions with pre definied giveResponse() to be called inside GenericHandler from RestAppServerBase.
 *              user messages have to be implemented at client side (where all the i18n stuff have to be done already). Here we put all
 *              necassary values into the response body.
 */
export class RestExceptionBase extends Error {
    public name: string;
    public message: string;
    public httpCode: number;
    public additionalProperties: any = {};
    /**
     * @constructor
     * @param inName Name of the Exception
     * @param inInternalMessage Message string to be interpreted by a developer or operator! For the enduser should be built an appropriate message at client side
     * @param inHttpCode HTTP response code for this exception
     */
    constructor(inName: string, inInternalMessage: string, inHttpCode: number) {
        super();
        this.name = inName;
        this.message = inInternalMessage;
        this.httpCode = inHttpCode;
    }
    public giveResponse(res: express.Response): express.Response {
        res.writeHead(this.httpCode, { 'Content-Type': 'application/json' });
        res.write(JSON.stringify({ code: this.httpCode, exceptionName: this.name, internalMessage: this.message, additionalProperties: this.additionalProperties }));
        res.end();
        return (res);
    };
    public toString() { return (`Exception ${this.name}: ${this.message}`); };
}
