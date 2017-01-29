import { IAuditRecord } from "./i-rest-payload-auditrecord";

export interface IRestPayloadBase {
    id?: string;
    tenantId?: string;
    deleted?: boolean;
    auditRecord?: IAuditRecord;
    data?;
};
