import * as loggerLib from "winston";

/**
 * Logger Service for this project, uses Winston for now. Is an interface to be enhanced later for request based logging.
 *
 */
export interface ITurboLogger {
    svc: loggerLib.LoggerInstance;
};
