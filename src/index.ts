
/**
 * @module TurboRestNode
 * @description base to implement a lightweight REST server with Node.js/Express. Includes configuration via environment, logging, exceptions, error handling and persistence (Mongo for now)
 * @author td@thomasdonath.com
 */
export { IJwtToken } from "./i-jwt-token";
export { IRestPayloadBase } from "./i-rest-payload-base";

export { RestAppServerBase } from "./rest-app-server-base";
export { RestPersistenceMongo } from "./rest-persistence-mongo";
export { ITurboLogger } from "./i-turbo-logger";
export { RestAppControllerAbstract } from "./rest-app-controller-abstract";

export { RestExceptionBase } from "./rest-exception-base";
export { RecordChangedByAnotherUser } from "./record-changed-by-another-user";
export { RecordNotFound } from "./record-not-found";
export { TooManyRows } from "./too-many-rows";
export { RecordExistsAlready } from "./record-already-exists";
export { NotNullViolated } from "./not-null-violated";
export { AuthenticationError } from "./authentication-error";
