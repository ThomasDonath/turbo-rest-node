import * as loggerLib from 'winston';

import { ITurboLogger } from '../i-turbo-logger';
import { RestPersistenceMongo } from '../rest-persistence-mongo';

import { SampleAppController } from './sample-app-controller';
import { SampleAppRestServer } from './sample-app-rest-server';

// configure logging
const myLogger: ITurboLogger = { svc: null };
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

const samplePersistence = new RestPersistenceMongo((process.env.APP_ENV !== 'development'), 'sample', myLogger, 'dbPerTenant', null);
const sampleController = new SampleAppController(samplePersistence, myLogger);
const sampleServer = new SampleAppRestServer('/', sampleController, myLogger);

sampleServer.main();
