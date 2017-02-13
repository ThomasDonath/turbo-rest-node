import { Db, MongoClient } from "mongodb";
import * as uuid from "uuid";

import { IRestPayloadBase } from "./i-rest-payload-base";
import { ITurboLogger } from "./i-turbo-logger";
import { RestPersistenceAbstract } from "./rest-persistence-abstract";

import { MissingTenantId } from "./missing-tenant-id";
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

    /**
     * @param useAuthentication DB requires useAuthentication
     * @param COLLECTIONNAME name for the collection to be read/written
     * @param tenacyImpl are there all tenants in ONE database (tenantInDb) or one DB for each tenant (dbPerTenant)?
     * @param dbName if tenacyImpl == tenantInDb then database name to be used else unused value
     * @param doMarkDeleted rows to be deleted will not really deleted but marked as deleted. then will a query with :id return the deleted row
     */
    constructor(
        protected useAuthentication: boolean = true,
        private COLLECTIONNAME: string,
        useLogger: ITurboLogger,
        private tenacyImpl: "dbPerTenant" | "tenantInDb",
        private dbName: string,
        private doMarkDeleted = true,
    ) {
        super(useAuthentication, useLogger);

        if (tenacyImpl === "tenantInDb" && !dbName) {
            throw new Error("DB name required but not configured");
        }

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
            if (!tenantId) { throw new MissingTenantId(); };

            let dbConnection: Db;
            let queryPredicate = predicate;

            queryPredicate.deleted = false;
            queryPredicate.tenantId = tenantId;

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
            if (!tenantId) { throw new MissingTenantId(); };

            let dbConnection: Db;
            let thisId = idIn;
            let thisTenant = tenantId;

            MongoClient.connect(getMySelf().getConnectString(thisTenant))
                .then((db) => {
                    dbConnection = db;

                    let q = { id: thisId, tenantId: thisTenant };

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
        thisRow.tenantId = tenantId;

        return new Promise((fulfill, reject) => {
            if (!thisRow.tenantId) { throw new MissingTenantId(); };

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
                        // not sure if this the right error code for an index that already exist
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
    /**
     * @function doDelete
     * @description @see RestPersistenceAbstract.doDelete
     * @param noLock sometimes we want to delete rows no matter of read consistence. then we pass TRUE here
     */
    public doDelete<T extends IRestPayloadBase>(thisRow: T, tenantId: string, getMySelf: () => RestPersistenceMongo, noLock: boolean = false): Promise<T> {
        RestPersistenceAbstract.logger.svc.debug(`delete ${getMySelf().COLLECTIONNAME} ("${thisRow.id}", "${tenantId}")`);

        return new Promise((fulfill, reject) => {
            if (!tenantId) { throw new MissingTenantId(); };

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
                        queryPredicate = { "id": thisRow.id, "tenantId": tenantId, "auditRecord.rowVersion": orgRowVersion };
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
            if (!tenantId) { throw new MissingTenantId(); };

            let rowVersionNumber = getMySelf().getRowVersionNumber(thisRow.auditRecord);

            MongoClient.connect(getMySelf().getConnectString(tenantId))
                .then((db) => {
                    dbConnection = db;

                    let orgRowVersion = thisRow.auditRecord.rowVersion;
                    let queryPredicate = { "id": thisRow.id, "tenantId": tenantId, "auditRecord.rowVersion": orgRowVersion };

                    thisRow.auditRecord = getMySelf().getAuditData(thisRow.auditRecord.rowVersion);
                    thisRow.deleted = false;
                    thisRow.tenantId = tenantId;

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

    public healthCheck(inTenantId: string, getMySelf: () => RestPersistenceMongo): Promise<IRestPayloadBase> {
        RestPersistenceAbstract.logger.svc.debug(`health check entry")`);

        let dummyRow: IRestPayloadBase = { auditRecord: { changedAt: new Date(), changedBy: "system", rowVersion: 0 }, deleted: false, data: {}, id: "emptyId", tenantId: inTenantId };
        let dbConnection: Db;

        return new Promise((fulfill, reject) => {

            MongoClient.connect(getMySelf().getConnectString(inTenantId))
                .then((db) => {
                    dbConnection = db;
                    dbConnection.close();

                    dummyRow.data.message = "I'm alive";
                    fulfill(dummyRow);
                })
                .catch((err) => {
                    RestPersistenceAbstract.logger.svc.error(`health check, "${inTenantId}"): ${err}`);
                    if (dbConnection) { dbConnection.close(); };
                    reject(err);
                });
        });
    }

    protected getConnectString(tenantId: string): string {
        return this.tenacyImpl === "dbPerTenant" ? this.dbMongoUrl + tenantId + this.dbMongoOptions : this.dbMongoUrl + this.dbName + this.dbMongoOptions;
    }
}
