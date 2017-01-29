import { IAuditRecord } from "./rest-payload-auditrecord.interface";
import { IRestPayloadBase } from "./rest-payload-base.interface";
import { ITurboLogger } from "./turbo-logger.interface";

export abstract class RestPersistenceAbstract {
    // TODO TypeDef für indexList
    public static setIndexDefs(indexList): void {
        RestPersistenceAbstract.indexDefs = indexList;
    }
    protected static logger: ITurboLogger;

    protected static indexDefs;

    protected dbHostNamePort: string;
    protected dbUsername: string;
    protected dbUserPassword: string;

    constructor(protected useAuthentication: boolean = true, useLogger: ITurboLogger) {
        RestPersistenceAbstract.logger = useLogger;

        this.dbHostNamePort = process.env.CONF_DB_SERVERNAME_PORT || "localhost:27017";
        this.dbUsername = process.env.CONF_DB_USERNAME;
        this.dbUserPassword = process.env.CONF_DB_USERPASSWORD;

        RestPersistenceAbstract.logger.svc.info(`CONF_DB_SERVERNAME_PORT: "${this.dbHostNamePort}"`);
        RestPersistenceAbstract.logger.svc.info(`CONF_DB_USERNAME: "${this.dbUsername}"`);
        RestPersistenceAbstract.logger.svc.info(`CONF_DB_USERPASSWORD: ${this.dbUserPassword ? "***" : "null"}`);
    }

    public abstract doGet<T extends IRestPayloadBase>(idIn: string, tenantId: string, getMySelf: () => RestPersistenceAbstract): Promise<T>;
    public abstract doInsert<T extends IRestPayloadBase>(thisRow: T, tenantId: string, getMySelf: () => RestPersistenceAbstract): Promise<T>;
    public abstract doDelete<T extends IRestPayloadBase>(thisRow: T, tenantId: string, getMySelf: () => RestPersistenceAbstract): Promise<T>;
    public abstract doUpdate<T extends IRestPayloadBase>(thisRow: T, tenantId: string, getMySelf: () => RestPersistenceAbstract): Promise<T>;

    protected getAuditData(oldRowVersion: number): IAuditRecord {
        // TODO Richtiger Username in changedBy!
        return {
            changedAt: new Date(),
            changedBy: "Anonymous",
            rowVersion: ++oldRowVersion,
        };
    }

    protected abstract getConnectString(tenantId: string): string;

    protected getRowVersionNumber(auditRecord: IAuditRecord): number {
        let result: number;
        try {
            result = auditRecord.rowVersion;
            if (!(result)) {
                throw new Error("Interner Fehler: Keine Audit Daten im Request");
            }
        } catch (e) {
            if (e.name === "TypeError") {
                throw new Error("Interner Fehler: Keine Audit Daten im Request");
            } else {
                throw (e);
            }
        }
        return result;
    }
}
