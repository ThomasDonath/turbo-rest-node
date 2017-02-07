import { IAuditRecord } from "./i-rest-payload-auditrecord";
import { IRestPayloadBase } from "./i-rest-payload-base";
import { ITurboLogger } from "./i-turbo-logger";
import { MissingAuditData } from "./missing-audit-data";

/**
 * @class RestPersistenceAbstract
 * @description predefined interface to implement persistence for the application controller, prepares configuration from environment
 */
export abstract class RestPersistenceAbstract {
    /**
     * @function setIndexDefs
     * @description an array of index definitions to be used during initialisation of a collection inside the INSERT method
     */
    public static setIndexDefs(indexList): void {
        RestPersistenceAbstract.indexDefs = indexList;
    }
    protected static indexDefs;

    protected static logger: ITurboLogger;

    protected dbHostNamePort: string;
    protected dbUsername: string;
    protected dbUserPassword: string;

    /**
     * @constructor
     * @param useAuthentication want we use authentication against the database or not?
     * @param inject the logger instance
     */
    constructor(protected useAuthentication: boolean = true, useLogger: ITurboLogger) {
        RestPersistenceAbstract.logger = useLogger;

        this.dbHostNamePort = process.env.CONF_DB_SERVERNAME_PORT || "localhost:27017";
        this.dbUsername = process.env.CONF_DB_USERNAME;
        this.dbUserPassword = process.env.CONF_DB_USERPASSWORD;

        RestPersistenceAbstract.logger.svc.info(`CONF_DB_SERVERNAME_PORT: "${this.dbHostNamePort}"`);
        RestPersistenceAbstract.logger.svc.info(`CONF_DB_USERNAME: "${this.dbUsername}"`);
        RestPersistenceAbstract.logger.svc.info(`CONF_DB_USERPASSWORD: ${this.dbUserPassword ? "***" : "null"}`);
    }
    /**
     * @function doQBE
     * @description query by example
     * @param predicate JSON object with property/value pairs to filter the result (may be empty)
     * @param sortCriteria JSON object with property/value pairs to sort the result (may be empty)
     * @param tenantId ID for the requested tenant. Mandantory!
     * @param getMySelf reference to a function returning the persistence constroller instance. Mandantory!
     */
    public abstract doQBE<T extends IRestPayloadBase>(predicate, sortCriteria, tenantId: string, getMySelf): Promise<T>;
    /**
     * @function doGet
     * @description query one and only one row for a given primary key value
     * @param idIn primary key value to ask for. Mandantory!
     * @param tenantId ID for the requested tenant. Mandantory!
     * @param getMySelf reference to a function returning the persistence constroller instance. Mandantory!
     */
    public abstract doGet<T extends IRestPayloadBase>(idIn: string, tenantId: string, getMySelf: () => RestPersistenceAbstract): Promise<T>;
    /**
     * @function doInsert
     * @description insert a new row
     * @param thisRow full object for the new row
     * @param tenantId ID for the requested tenant. Mandantory!
     * @param getMySelf reference to a function returning the persistence constroller instance. Mandantory!
     */
    public abstract doInsert<T extends IRestPayloadBase>(thisRow: T, tenantId: string, getMySelf: () => RestPersistenceAbstract): Promise<T>;
    /**
     * @function doDelete
     * @description insert a new row
     * @param thisRow full object for the row to be deleted
     * @param tenantId ID for the requested tenant. Mandantory!
     * @param getMySelf reference to a function returning the persistence constroller instance. Mandantory!
     */
    public abstract doDelete<T extends IRestPayloadBase>(thisRow: T, tenantId: string, getMySelf: () => RestPersistenceAbstract): Promise<T>;
    /**
     * @function doUpdate
     * @description update a row, must exists
     * @param thisRow full object for the row to be updated
     * @param tenantId ID for the requested tenant. Mandantory!
     * @param getMySelf reference to a function returning the persistence constroller instance. Mandantory!
     */
    public abstract doUpdate<T extends IRestPayloadBase>(thisRow: T, tenantId: string, getMySelf: () => RestPersistenceAbstract): Promise<T>;

    protected getAuditData(oldRowVersion: number): IAuditRecord {
        return {
            changedAt: new Date(),
            changedBy: "Anonymous",
            rowVersion: ++oldRowVersion,
        };
    }
    /**
     * @function getConnectString
     * @description return the connect string (including username/password) for the given database and tenant. Must be overloaded!
     */
    protected abstract getConnectString(tenantId: string): string;

    /**
     * @function getRowVersionNumber
     * @description return the new/next row version number based on a given audit record
     */
    protected getRowVersionNumber(auditRecord: IAuditRecord): number {
        let result: number;
        try {
            result = auditRecord.rowVersion;
            if (!(result)) {
                throw new MissingAuditData();
            }
        } catch (e) {
            if (e.name === "TypeError") {
                throw new MissingAuditData();
            } else {
                throw (e);
            }
        }
        return result;
    }
}
