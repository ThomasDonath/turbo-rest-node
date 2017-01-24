import { IRestPayloadBase } from "./rest-payload-base.interface";

export interface ITestPayload extends IRestPayloadBase {
    data: string;
};
