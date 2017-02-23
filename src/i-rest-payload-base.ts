import { IAuditRecord } from './i-rest-payload-auditrecord';

/**
 * @class IRestPayloadBase
 * @description base definition for each payload or business object to support locking, auditing, multi tenancy...
 */
export interface IRestPayloadBase {
    id?: string;
    tenantId?: string;
    deleted?: boolean;
    auditRecord?: IAuditRecord;
    data?;
};
