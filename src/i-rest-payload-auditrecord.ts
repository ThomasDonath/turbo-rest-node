/**
 * @class IAuditRecord
 * @description each business object or payload have to have at least a row version number to support optimistic locking and Change Info
 */
export interface IAuditRecord {
    rowVersion: number;
    changedAt: Date;
    changedBy: string;
};
