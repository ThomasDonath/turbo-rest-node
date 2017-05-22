import { expect } from 'chai';
import 'mocha';

import * as express from 'express';

import { RestExceptionBase } from './rest-exception-base';

describe('Base exception', () => {
    it('toString', () => {
        const e = new RestExceptionBase('aName', 'aMessage', 200);

        expect(e.toString()).to.eql('Exception aName: aMessage');
    });

    /* would like to test it, but dont know, how to get an initialized instance of interface express.Response
        it('giveResponse', () => {
            const e = new RestExceptionBase('aName', 'aMessage', 200);

            const res: express.Response = new ???;

            expect(e.giveResponse(res)).json.eql('');
        });
    */
});
