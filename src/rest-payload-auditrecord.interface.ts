export interface IAuditRecord {
    rowVersion: number;
    changedAt: Date;
    changedBy: string;
};
