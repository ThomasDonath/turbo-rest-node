import * as loggerLib from "winston";

/**
 * @class ITurboLogger
 * @description Logger Service for this project, uses Winston for now. It's an interface to be enhanced later for request based logging.
 *
 */
export interface ITurboLogger {
    svc: loggerLib.LoggerInstance;
};
