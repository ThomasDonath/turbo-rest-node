import * as express from "express";

// import { ITestPayload } from "./testpayload";

export interface ITestPayload {
    id: string;
    msg: string;
    data: string;
};

export class TestController {
    private myMessage: string;
    private cnt: number = 0;

    constructor(inMsg: string) {
        this.myMessage = inMsg;
    }

    // Und das ist in der dedizierten Controller-Klasse und hat nix mehr mit dem Express-Server zu tun :)
    public testHandler = (r, getMySelf): Promise<ITestPayload> => {

        return new Promise<ITestPayload>((fulfill, reject) => {
            let v: ITestPayload = { id: "1", msg: getMySelf().getMessage(), data: "no message" };
            fulfill(v);
        });
    }
    public testHandlerP = (r: express.Request, getMySelf): Promise<ITestPayload> => {
        return new Promise<ITestPayload>((fulfill, reject) => {
            // tslint:disable-next-line:no-string-literal
            let v: ITestPayload = { id: "1", msg: getMySelf().getMessage(), data: r.params.id };
            fulfill(v);
        });
    }
    public testHandlerQ = (r: express.Request, getMySelf): Promise<ITestPayload> => {
        return new Promise<ITestPayload>((fulfill, reject) => {
            // tslint:disable-next-line:no-string-literal
            let v: ITestPayload = { id: "1", msg: getMySelf().getMessage(), data: r.query.id };
            fulfill(v);
        });
    }
    private getMessage(): string {
        return this.myMessage + (this.cnt++).toString();
    }
}
