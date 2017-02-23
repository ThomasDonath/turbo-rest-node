import * as loggerLib from 'winston';

import { ITurboLogger } from '../i-turbo-logger';
import { RestPersistenceMongo } from '../rest-persistence-mongo';

import { SampleAppController } from './sample-app-controller';
import { SampleAppRestServer } from './sample-app-rest-server';

// configure logging
let myLogger: ITurboLogger = { svc: null };
myLogger.svc = new (loggerLib.Logger)({
    transports: [
        new (loggerLib.transports.Console)({
            formatter: (options) => {
                // add CID (Correlation ID)
                return options.timestamp() + ' ' +
                    options.level.toUpperCase() + ' ' +
                    (options.message ? options.message : '') +
                    (options.meta && Object.keys(options.meta).length ? '' + JSON.stringify(options.meta) : '');
            },
            timestamp: () => Date.now(),
        }),
    ],
});
myLogger.svc.level = 'info';

let samplePersistence = new RestPersistenceMongo(true, 'sample', myLogger, 'dbPerTenant', null);
let sampleController = new SampleAppController(samplePersistence, myLogger);
let sampleServer = new SampleAppRestServer('/', sampleController, myLogger);

sampleServer.main();
