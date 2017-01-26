import { Db, MongoClient } from "mongodb";
import * as uuid from "uuid";

import { RestExceptions } from "./rest-exceptions";
import { IRestPayloadBase } from "./rest-payload-base.interface";
import { RestPersistenceAbstract } from "./rest-persistence-abstract";
import { ITurboLogger } from "./turbo-logger.interface";

export class RestPersistenceMongo extends RestPersistenceAbstract {
    protected dbHostNamePort: string;
    protected dbUsername: string;
    protected dbUserPassword: string;

    protected dbMongoUrl: String;
    private dbMongoOptions: String;

    constructor(protected useAuthentication: boolean = true, private COLLECTIONNAME: string, useLogger: ITurboLogger, private doMarkDeleted = true) {
        super(useAuthentication, useLogger);

        if (useAuthentication) {
            // schemaOwner/manager28
            this.dbMongoUrl = `mongodb://${this.dbUsername}:${this.dbUserPassword}@${this.dbHostNamePort}/`;
            this.dbMongoOptions = "?authSource=admin";
        } else {
            this.dbMongoUrl = `mongodb://${this.dbHostNamePort}/`;
        }
    }
    /*
        // das wird derr Knackpunkt...
        // deleted === true ausblenden
        public doQBE<T extends IRestPayloadBase>(id: uuid, tenantId: string, getMySelf): Promise<T> {
            return new Promise((fulfill, error) => { });
        }
   */
    public doGet<T extends IRestPayloadBase>(idIn: string, tenantId: string, getMySelf: () => RestPersistenceMongo): Promise<T> {
        RestPersistenceAbstract.logger.svc.debug(`get ${getMySelf().COLLECTIONNAME} ("${idIn}", "${tenantId}")`);

        return new Promise((fulfill, reject) => {
            if (!tenantId) { throw new Error("Missing TenantID"); };

            let dbConnection: Db;
            let thisId = idIn;
            let thisTenant = tenantId;

            MongoClient.connect(getMySelf().getConnectString(thisTenant))
                .then((db) => {
                    dbConnection = db;

                    let q = { id: thisId };

                    // TODO passt das Prädikat???
                    return dbConnection.collection(getMySelf().COLLECTIONNAME).find(q, { _id: 0 }).toArray();
                })
                .then((docs) => {
                    dbConnection.close();
                    let result: T;

                    if (docs.length === 0) { throw (new RestExceptions.RecordNotFound(idIn)); }
                    if (docs.length > 1) { throw (new RestExceptions.TooManyRows(idIn)); }

                    result = docs[0];
                    fulfill(result);
                })
                .catch((err) => {
                    RestPersistenceAbstract.logger.svc.error(`get ${getMySelf().COLLECTIONNAME} ("${thisId}", "${thisTenant}"): ${err}`);
                    if (dbConnection) { dbConnection.close(); };
                    reject(err);
                });
        });
    }

    public doInsert<T extends IRestPayloadBase>(thisRow: T, tenantId: string, getMySelf: () => RestPersistenceMongo): Promise<T> {
        RestPersistenceAbstract.logger.svc.debug(`insert ${getMySelf().COLLECTIONNAME} ("${thisRow.id}", "${tenantId}")`);

        // TODO2 PK testen und ggf. erneut erzeugen, oder die ObjectId nutzen?
        thisRow.id = thisRow.id || uuid.v4();
        thisRow.auditRecord = getMySelf().getAuditData(0);

        return new Promise((fulfill, reject) => {
            if (!tenantId) { throw new Error("missing TenantID"); };

            let dbConnection: Db;

            MongoClient.connect(getMySelf().getConnectString(tenantId))
                .then((db) => {
                    dbConnection = db;
                    return (dbConnection.collection(getMySelf().COLLECTIONNAME).count({}));
                })
                // check for new Schema (== new tenant)
                // TODO überladen je Objekt und Status merken
                .then((rowCount) => {
                    if (rowCount === 0) {
                        console.log(`creating indexes on ${dbConnection.databaseName}`);
                        dbConnection.collection(getMySelf().COLLECTIONNAME).createIndexes(RestPersistenceAbstract.indexDefs);
                    }
                })
                // insert the row
                .then(() => {
                    return dbConnection.collection(getMySelf().COLLECTIONNAME).insertOne(thisRow);
                })
                .catch((err) => {
                    if ((err.name === "MongoError") && (err.code === 11000) && (err.driver)) {
                        throw (new RestExceptions.RecordExistsAlready(thisRow.auditRecord.changedAt, thisRow.auditRecord.changedBy));
                    } else {
                        throw (err);
                    }
                })
                .then(() => {
                    dbConnection.close();
                    fulfill(thisRow);
                })
                .catch((err) => {
                    RestPersistenceAbstract.logger.svc.error(`insert ${getMySelf().COLLECTIONNAME} ("${thisRow.id}", "${tenantId}"): ${err}`);
                    if (dbConnection) { dbConnection.close(); };
                    reject(err);
                });
        });
    }

    public doDelete<T extends IRestPayloadBase>(thisRow: T, tenantId: string, getMySelf: () => RestPersistenceMongo, noLock: boolean = false): Promise<T> {
        RestPersistenceAbstract.logger.svc.debug(`delete ${getMySelf().COLLECTIONNAME} ("${thisRow.id}", "${tenantId}")`);

        return new Promise((fulfill, reject) => {
            if (!tenantId) { throw new Error("missing TenantID"); };

            let dbConnection: Db;
            let queryPredicate = { id: thisRow.id };

            let rowVersionNumber = getMySelf().getRowVersionNumber(thisRow.auditRecord);

            MongoClient.connect(getMySelf().getConnectString(tenantId))
                .then((db) => {
                    dbConnection = db;

                    return dbConnection.collection(getMySelf().COLLECTIONNAME).find(queryPredicate).toArray();
                })
                .then((oldRows: T[]) => {
                    let oldRow: T;

                    if (oldRows.length === 0) { throw (new RestExceptions.RecordNotFound(thisRow.id)); }
                    if (oldRows.length > 1) { throw (new RestExceptions.TooManyRows(thisRow.id)); }

                    oldRow = oldRows[0];

                    if (!noLock && (oldRow.auditRecord.rowVersion !== rowVersionNumber)) {
                        throw (new RestExceptions.RecordChangedByAnotherUser(thisRow.id, oldRow.auditRecord.changedAt, oldRow.auditRecord.changedBy));
                    }

                    thisRow.auditRecord = getMySelf().getAuditData(oldRow.auditRecord.rowVersion);

                    // TODO oder findAndReplaceOne - weil im find oben gibt keinen Lock - mit  findAndReplaceOne könnte RowVersion geprüft werden - Rollback? 
                    if (getMySelf().doMarkDeleted) {
                        thisRow.deleted = true;
                        return dbConnection.collection(getMySelf().COLLECTIONNAME).replaceOne(queryPredicate, thisRow);
                    } else {
                        return dbConnection.collection(getMySelf().COLLECTIONNAME).deleteOne(queryPredicate);
                    }
                })
                .then(() => {
                    dbConnection.close();
                    fulfill(thisRow);
                })
                .catch((err) => {
                    RestPersistenceAbstract.logger.svc.error(`delete ${getMySelf().COLLECTIONNAME} ("${thisRow.id}", "${tenantId}"): ${err}`);
                    if (dbConnection) { dbConnection.close(); };
                    reject(err);
                });
        });
    }

    public doUpdate<T extends IRestPayloadBase>(thisRow: T, tenantId: string, getMySelf: () => RestPersistenceMongo): Promise<T> {
        RestPersistenceAbstract.logger.svc.debug(`update ${getMySelf().COLLECTIONNAME} ("${thisRow.id}", "${tenantId}")`);

        let dbConnection: Db;
        let queryPredicate = { id: thisRow.id };

        return new Promise((fulfill, reject) => {
            if (!tenantId) { throw new Error("missing TenantID"); };

            let rowVersionNumber = getMySelf().getRowVersionNumber(thisRow.auditRecord);

            MongoClient.connect(getMySelf().getConnectString(tenantId))
                .then((db) => {
                    dbConnection = db;

                    return dbConnection.collection(getMySelf().COLLECTIONNAME).find(queryPredicate).toArray();
                })
                .then((oldRows: T[]) => {
                    let oldRow: T;

                    if (oldRows.length === 0) { throw (new RestExceptions.RecordNotFound(thisRow.id)); }
                    if (oldRows.length > 1) { throw (new RestExceptions.TooManyRows(thisRow.id)); }

                    oldRow = oldRows[0];
                    if (!(oldRow.auditRecord.rowVersion === rowVersionNumber)) {
                        throw (new RestExceptions.RecordChangedByAnotherUser(thisRow.id, oldRow.auditRecord.changedAt, oldRow.auditRecord.changedBy));
                    }

                    thisRow.auditRecord = getMySelf().getAuditData(oldRow.auditRecord.rowVersion);

                    // TODO oder findAndReplaceOne - weil im find oben gibt keinen Lock - mit  findAndReplaceOne könnte RowVersion geprüft werden - Rollback?                   
                    return (dbConnection.collection(getMySelf().COLLECTIONNAME).replaceOne(queryPredicate, thisRow));
                })
                .then(() => {
                    dbConnection.close();
                    fulfill(thisRow);
                })
                .catch((err) => {
                    RestPersistenceAbstract.logger.svc.error(`update ${getMySelf().COLLECTIONNAME} ("${thisRow.id}", "${tenantId}"): ${err}`);
                    if (dbConnection) { dbConnection.close(); };
                    reject(err);
                });
        });
    }

    protected getConnectString(tenantId: string): string {
        return this.dbMongoUrl + tenantId + this.dbMongoOptions;
    }
}
