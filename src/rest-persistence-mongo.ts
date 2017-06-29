import { Db, MongoClient } from 'mongodb';
import * as uuid from 'uuid';

import { IRestPayloadBase } from './i-rest-payload-base';
import { ITurboLogger } from './i-turbo-logger';
import { RestPersistenceAbstract } from './rest-persistence-abstract';

import { MissingAuditData } from './missing-audit-data';
import { MissingTenantId } from './missing-tenant-id';
import { RecordExistsAlready } from './record-already-exists';
import { RecordChangedByAnotherUser } from './record-changed-by-another-user';
import { RecordNotFound } from './record-not-found';
import { TooManyRows } from './too-many-rows';

export class RestPersistenceMongo extends RestPersistenceAbstract {

  protected dbHostNamePort: string;
  protected dbUsername: string;
  protected dbUserPassword: string;

  protected dbMongoUrl: string;
  private dbMongoOptions: string;
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
    private tenacyImpl: 'dbPerTenant' | 'tenantInDb',
    private dbName: string,
    private doMarkDeleted = true,
  ) {
    super(useAuthentication, useLogger);

    if (tenacyImpl === 'tenantInDb' && !dbName) {
      throw new Error('DB name required but not configured');
    }

    if (useAuthentication) {

      this.dbMongoUrl = `mongodb://${this.dbUsername}:${this.dbUserPassword}@${this.dbHostNamePort}/`;
      this.dbMongoOptions = '?authSource=admin';
    } else {
      this.dbMongoUrl = `mongodb://${this.dbHostNamePort}/`;
      this.dbMongoOptions = '';
    }
  }

  public doQBE<T extends IRestPayloadBase>(predicate, sortCriteria, tenantIdIn: string, skipRows: number, limitRows: number, getMySelf): Promise<T> {
    RestPersistenceAbstract.logger.svc.debug(`doQBE ${getMySelf().COLLECTIONNAME} ("${predicate}", "${tenantIdIn}")`);

    return new Promise((fulfill, reject) => {
      if (!tenantIdIn) { throw new MissingTenantId(); }

      let dbConnection: Db;
      const queryPredicate = predicate;
      const rowLimit = limitRows || this.rowLimit;

      queryPredicate.deleted = false;
      queryPredicate.tenantId = tenantIdIn;

      MongoClient.connect(getMySelf().getConnectString(tenantIdIn))
        .then((db) => {
          dbConnection = db;

          return dbConnection
            .collection(getMySelf().COLLECTIONNAME)
            .find(queryPredicate)
            .sort(sortCriteria)
            .skip(skipRows ? skipRows : 0)
            .limit(rowLimit)
            .toArray();
        })
        .then((docs) => {
          dbConnection.close();
          fulfill(docs);
        })
        .catch((err) => {
          if (dbConnection) { dbConnection.close(); }
          reject(err);
        });
    });
  }

  public doGet<T extends IRestPayloadBase>(idIn: string, tenantIdIn: string, getMySelf: () => RestPersistenceMongo): Promise<T> {
    RestPersistenceAbstract.logger.svc.debug(`get ${getMySelf().COLLECTIONNAME} ("${idIn}", "${tenantIdIn}")`);

    return new Promise((fulfill, reject) => {
      if (!tenantIdIn) { throw new MissingTenantId(); }

      let dbConnection: Db;
      const thisId = idIn;
      const thisTenant = tenantIdIn;

      MongoClient.connect(getMySelf().getConnectString(thisTenant))
        .then((db) => {
          dbConnection = db;

          const q = { id: thisId, tenantId: thisTenant };

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
          if (dbConnection) { dbConnection.close(); }
          reject(err);
        });
    });
  }

  public doInsert<T extends IRestPayloadBase>(thisRow: T, tenantIdIn: string, getMySelf: () => RestPersistenceMongo): Promise<T> {
    RestPersistenceAbstract.logger.svc.debug(`insert ${getMySelf().COLLECTIONNAME} ("${thisRow.id}", "${tenantIdIn}")`);

    thisRow.id = thisRow.id || uuid.v4();
    thisRow.auditRecord = getMySelf().setAuditData(0, thisRow.auditRecord.changedBy);
    thisRow.deleted = false;
    thisRow.tenantId = tenantIdIn;

    return new Promise((fulfill, reject) => {
      if (!thisRow.tenantId) { throw new MissingTenantId(); }

      let dbConnection: Db;
      let doCreateIndex: boolean = false;

      MongoClient.connect(getMySelf().getConnectString(tenantIdIn))
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

            return dbConnection.collection(getMySelf().COLLECTIONNAME).createIndexes(getMySelf().indexDefs);
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
          if ((err.name === 'MongoError') && (err.code === 11000) && (err.driver)) {
            throw new RecordExistsAlready(thisRow.auditRecord.changedAt, thisRow.auditRecord.changedBy);
          } else {
            // not sure if this the right error code for an index that already exist
            RestPersistenceAbstract.logger.svc.warn('create duplicate index(?) errcode ${err.code}');

            if (!((err.name === 'MongoError') && (err.code === 11000) && (err.driver))) {
              throw (err);
            }
          }
        })
        .then(() => {
          dbConnection.close();
          fulfill(thisRow);
        })
        .catch((err) => {
          RestPersistenceAbstract.logger.svc.error(`insert ${getMySelf().COLLECTIONNAME} ("${thisRow.id}", "${tenantIdIn}"): ${err}`);
          if (dbConnection) { dbConnection.close(); }
          reject(err);
        });
    });
  }
  /**
   * @function doDelete
   * @description @see RestPersistenceAbstract.doDelete
   * @param noLock sometimes we want to delete rows no matter of read consistence. then we pass TRUE here
   */
  public doDelete(idIn: string, rowVersionIn: number, changedByIn: string, tenantIdIn: string, getMySelf: () => RestPersistenceMongo, noLockIn: boolean = false): Promise<boolean> {

    RestPersistenceAbstract.logger.svc.debug(`delete ${getMySelf().COLLECTIONNAME} ("${idIn}", "${tenantIdIn}")`);

    const thisId: string = idIn;
    const thisRowVersion: number = rowVersionIn;
    const thisChangedBy: string = changedByIn;
    const thisTenantIdIn: string = tenantIdIn;
    const noLock: boolean = noLockIn;

    return new Promise((fulfill, reject) => {
      if (!thisTenantIdIn) { throw new MissingTenantId(); }
      if (!noLock && !thisRowVersion) { throw new MissingAuditData(); }

      let dbConnection: Db;

      MongoClient.connect(getMySelf().getConnectString(thisTenantIdIn))
        .then((db) => {
          dbConnection = db;

          let queryPredicate;
          if (noLock) {
            queryPredicate = { id: thisId, tenantId: thisTenantIdIn };
          } else {
            queryPredicate = { 'id': thisId, 'tenantId': thisTenantIdIn, 'auditRecord.rowVersion': thisRowVersion };
          }

          if (getMySelf().doMarkDeleted) {
            return dbConnection.collection(getMySelf().COLLECTIONNAME).update(queryPredicate, {
              $currentDate: { 'auditRecord.changedAt': { $type: 'timestamp' } },
              $inc: { 'auditRecord.rowVersion': 1 },
              $set: { 'auditRecord.changedBy': thisChangedBy, 'deleted': true },
            });
          } else {
            return dbConnection.collection(getMySelf().COLLECTIONNAME).deleteOne(queryPredicate);
          }

        })
        .then((result) => {
          dbConnection.close();

          if (!noLock) {
            if (getMySelf().doMarkDeleted) {
              if (result.matchedCount === 0) {
                throw new RecordChangedByAnotherUser(thisId);
              }
            } else {
              if (result.deletedCount === 0) {
                throw new RecordChangedByAnotherUser(thisId);
              }
            }
          }
          fulfill(true);
        })
        .catch((err) => {
          RestPersistenceAbstract.logger.svc.warn(`delete ${getMySelf().COLLECTIONNAME} ("${thisId}", "${thisTenantIdIn}"): ${err}`);
          if (dbConnection) { dbConnection.close(); }
          reject(err);
        });
    });
  }

  public doUpdate<T extends IRestPayloadBase>(thisRow: T, tenantId: string, getMySelf: () => RestPersistenceMongo): Promise<T> {
    RestPersistenceAbstract.logger.svc.debug(`update ${getMySelf().COLLECTIONNAME} ("${thisRow.id}", "${tenantId}")`);

    let dbConnection: Db;

    return new Promise((fulfill, reject) => {
      if (!tenantId) { throw new MissingTenantId(); }

      MongoClient.connect(getMySelf().getConnectString(tenantId))
        .then((db) => {
          dbConnection = db;

          const orgRowVersion = thisRow.auditRecord.rowVersion;
          const queryPredicate = { 'id': thisRow.id, 'tenantId': tenantId, 'auditRecord.rowVersion': orgRowVersion };

          thisRow.auditRecord = getMySelf().setAuditData(thisRow.auditRecord.rowVersion, thisRow.auditRecord.changedBy);
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
          if (dbConnection) { dbConnection.close(); }
          reject(err);
        });
    });
  }

  public healthCheck(inTenantId: string, getMySelf: () => RestPersistenceMongo): Promise<IRestPayloadBase> {
    RestPersistenceAbstract.logger.svc.debug(`health check entry")`);

    const dummyRow: IRestPayloadBase = { auditRecord: { changedAt: new Date(), changedBy: 'system', rowVersion: 0 }, deleted: false, id: 'emptyId', tenantId: inTenantId };
    let dbConnection: Db;

    return new Promise((fulfill, reject) => {

      MongoClient.connect(getMySelf().getConnectString(inTenantId))
        .then((db) => {
          dbConnection = db;
          dbConnection.close();

          Object.defineProperty(dummyRow, 'message', {
            configurable: true,
            enumerable: true,
            value: 'I\'m alive',
            writable: true,
          });
          fulfill(dummyRow);
        })
        .catch((err) => {
          RestPersistenceAbstract.logger.svc.error(`health check, "${inTenantId}"): ${err}`);
          if (dbConnection) { dbConnection.close(); }
          reject(err);
        });
    });
  }

  protected getConnectString(tenantId: string): string {
    return this.tenacyImpl === 'dbPerTenant' ? this.dbMongoUrl + tenantId + this.dbMongoOptions : this.dbMongoUrl + this.dbName + this.dbMongoOptions;
  }
}
