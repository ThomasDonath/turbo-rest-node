import { ITestPayload } from "./testpayload";

export class TestController {
    // Und das ist in der dedizierten Controller-Klasse und hat nix mehr mit dem Express-Server zu tun :)
    public testHandler = (params: any, query: any): Promise<ITestPayload> => {
        return new Promise<ITestPayload>((fulfill, reject) => {
            let v: ITestPayload = { id: "1", msg: "Hallo, Du Held!", data: "blabla" };
            fulfill(v);
        });
    }
    public testHandlerP = (params: any, query: any): Promise<ITestPayload> => {
        return new Promise<ITestPayload>((fulfill, reject) => {
            // tslint:disable-next-line:no-string-literal
            let v: ITestPayload = { id: "1", msg: "Hallo, Du Held!", data: params["id"] };
            fulfill(v);
        });
    }
    public testHandlerQ = (params: any, query: any): Promise<ITestPayload> => {
        return new Promise<ITestPayload>((fulfill, reject) => {
            // tslint:disable-next-line:no-string-literal
            let v: ITestPayload = { id: "1", msg: "Hallo, Du Held!", data: query["id"] };
            fulfill(v);
        });
    }
}
