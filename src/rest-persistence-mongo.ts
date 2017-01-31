import { Db, MongoClient } from "mongodb";
import * as uuid from "uuid";

import { IRestPayloadBase } from "./i-rest-payload-base";
import { ITurboLogger } from "./i-turbo-logger";
import { RestPersistenceAbstract } from "./rest-persistence-abstract";

import { RecordExistsAlready } from "./record-already-exists";
import { RecordChangedByAnotherUser } from "./record-changed-by-another-user";
import { RecordNotFound } from "./record-not-found";
import { TooManyRows } from "./too-many-rows";

export class RestPersistenceMongo extends RestPersistenceAbstract {

    protected dbHostNamePort: string;
    protected dbUsername: string;
    protected dbUserPassword: string;

    protected dbMongoUrl: String;
    private dbMongoOptions: String;
    private dontCheckIndexes: boolean = false;

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

    public doQBE<T extends IRestPayloadBase>(predicate, sortCriteria, tenantId: string, getMySelf): Promise<T> {
        RestPersistenceAbstract.logger.svc.debug(`doQBE ${getMySelf().COLLECTIONNAME} ("${predicate}", "${tenantId}")`);

        return new Promise((fulfill, reject) => {
            if (!tenantId) { throw new Error("Missing TenantID"); };

            let dbConnection: Db;
            let queryPredicate = predicate;

            queryPredicate.deleted = false;

            MongoClient.connect(getMySelf().getConnectString(tenantId))
                .then((db) => {
                    dbConnection = db;

                    return dbConnection.collection(getMySelf().COLLECTIONNAME).find(queryPredicate).sort(sortCriteria).toArray();
                })
                .then((docs) => {
                    dbConnection.close();
                    fulfill(docs);
                })
                .catch((err) => {
                    if (dbConnection) { dbConnection.close(); };
                    reject(err);
                });
        });
    }

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

                    return dbConnection.collection(getMySelf().COLLECTIONNAME).find(q).toArray();
                })
                .then((docs) => {
                    dbConnection.close();
                    let result: T;

                    if (docs.length === 0) { throw new RecordNotFound(idIn); }
                    if (docs.length > 1) { throw new TooManyRows(idIn); }

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

        thisRow.id = thisRow.id || uuid.v4();
        thisRow.auditRecord = getMySelf().getAuditData(0);
        thisRow.deleted = false;

        return new Promise((fulfill, reject) => {
            if (!tenantId) { throw new Error("missing TenantID"); };

            let dbConnection: Db;
            let doCreateIndex: boolean = false;

            MongoClient.connect(getMySelf().getConnectString(tenantId))
                .then((db) => {
                    dbConnection = db;

                    if (!getMySelf().dontCheckIndexes) {
                        doCreateIndex = true;
                        getMySelf().dontCheckIndexes = true;
                        return (dbConnection.collection(getMySelf().COLLECTIONNAME).count({}));
                    } else {
                        return new Promise((ff) => {
                            ff(0);
                        });
                    }
                })
                // check for new Schema (== new tenant)
                .then((rowCount) => {
                    if (doCreateIndex) {
                        RestPersistenceAbstract.logger.svc.info(`creating indexes on ${dbConnection.databaseName}; row id ${thisRow.id}`);

                        return dbConnection.collection(getMySelf().COLLECTIONNAME).createIndexes(RestPersistenceAbstract.indexDefs);
                    } else {
                        return new Promise((ff) => {
                            ff();
                        });
                    }
                })
                // insert the row
                .then(() => {
                    return dbConnection.collection(getMySelf().COLLECTIONNAME).insertOne(thisRow);
                })
                .catch((err) => {
                    if ((err.name === "MongoError") && (err.code === 11000) && (err.driver)) {
                        throw new RecordExistsAlready(thisRow.auditRecord.changedAt, thisRow.auditRecord.changedBy);
                    } else {
                        // weiß nicht, ob der Fehlercode stimmt
                        RestPersistenceAbstract.logger.svc.warn("create duplicate index(?) errcode ${err.code}");

                        if (!((err.name === "MongoError") && (err.code === 11000) && (err.driver))) {
                            throw (err);
                        }
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

            let rowVersionNumber = getMySelf().getRowVersionNumber(thisRow.auditRecord);

            MongoClient.connect(getMySelf().getConnectString(tenantId))
                .then((db) => {
                    dbConnection = db;

                    let queryPredicate;
                    let orgRowVersion = thisRow.auditRecord.rowVersion;
                    if (noLock) {
                        queryPredicate = { id: thisRow.id };
                    } else {
                        queryPredicate = { "id": thisRow.id, "auditRecord.rowVersion": orgRowVersion };
                    }

                    thisRow.auditRecord = getMySelf().getAuditData(thisRow.auditRecord.rowVersion);

                    if (getMySelf().doMarkDeleted) {
                        thisRow.deleted = true;
                        return dbConnection.collection(getMySelf().COLLECTIONNAME).replaceOne(queryPredicate, thisRow);
                    } else {
                        return dbConnection.collection(getMySelf().COLLECTIONNAME).deleteOne(queryPredicate);
                    }

                })
                .then((result) => {
                    dbConnection.close();

                    if (!noLock) {
                        if (getMySelf().doMarkDeleted) {
                            if (result.matchedCount === 0) {
                                throw new RecordChangedByAnotherUser(thisRow.id);
                            }
                        } else {
                            if (result.deletedCount === 0) {
                                throw new RecordChangedByAnotherUser(thisRow.id);
                            }
                        }
                    }
                    fulfill(thisRow);
                })
                .catch((err) => {
                    RestPersistenceAbstract.logger.svc.warn(`delete ${getMySelf().COLLECTIONNAME} ("${thisRow.id}", "${tenantId}"): ${err}`);
                    if (dbConnection) { dbConnection.close(); };
                    reject(err);
                });
        });
    }

    public doUpdate<T extends IRestPayloadBase>(thisRow: T, tenantId: string, getMySelf: () => RestPersistenceMongo): Promise<T> {
        RestPersistenceAbstract.logger.svc.debug(`update ${getMySelf().COLLECTIONNAME} ("${thisRow.id}", "${tenantId}")`);

        let dbConnection: Db;

        return new Promise((fulfill, reject) => {
            if (!tenantId) { throw new Error("missing TenantID"); };

            let rowVersionNumber = getMySelf().getRowVersionNumber(thisRow.auditRecord);

            MongoClient.connect(getMySelf().getConnectString(tenantId))
                .then((db) => {
                    dbConnection = db;

                    let orgRowVersion = thisRow.auditRecord.rowVersion;
                    let queryPredicate = { "id": thisRow.id, "auditRecord.rowVersion": orgRowVersion };

                    thisRow.auditRecord = getMySelf().getAuditData(thisRow.auditRecord.rowVersion);
                    thisRow.deleted = false;

                    return (dbConnection.collection(getMySelf().COLLECTIONNAME).replaceOne(queryPredicate, thisRow));
                })
                .then((result) => {
                    dbConnection.close();

                    if (result.matchedCount === 0) {
                        throw new RecordChangedByAnotherUser(thisRow.id);
                    }
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
