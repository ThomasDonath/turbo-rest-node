import { IAuditRecord } from "./rest-payload-auditrecord.interface";

export interface IRestPayloadBase {
    id?: string;
    tenantId?: string;
    deleted?: boolean;
    auditRecord?: IAuditRecord;
    data?;
};
