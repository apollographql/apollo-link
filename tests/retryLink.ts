import { assert, expect } from 'chai';
import * as sinon from 'sinon';
import RetryLink from '../src/retryLink';
import * as Links from '../src/links';
import * as Observable from 'zen-observable';

describe('RetryLink', () => {

  it('can be initialized', () => assert(true));

  it('should fail with unreachable endpoint', () => {
    const max = 10;
    const retry = new RetryLink({delay: 1, max});
    const error = new Error('I never work');
    const stubNext = sinon.stub().callsFake(() => new Observable(observer => observer.error(error)));

    const promisedLink = Links.asPromiseWrapper(retry);
    return promisedLink.request({}, stubNext)
      .then(() => {
        expect.fail();
      })
      .catch(actualError => {
        assert.deepEqual(stubNext.callCount, max);
        assert.deepEqual(error, actualError);
      });
  });

  it('should return data from the underlying link on a successful operation', () => {
    const retry = new RetryLink();
    const data = {
      data: {
        hello: 'world',
      },
    };
    const stubNext = sinon.stub();
    stubNext.returns(Observable.of(data));

    const promisedLink = Links.asPromiseWrapper(retry);
    return promisedLink.request({}, stubNext)
      .then(actualData => {
        assert(stubNext.calledOnce);
        assert.deepEqual(data, actualData);
      });
  });

  it('should return data from the underlying link on a successful retry', () => {
    const retry = new RetryLink({delay: 1, max: 2});
    const error = new Error('I never work');
    const data = {
      data: {
        hello: 'world',
      },
    };
    const stubNext = sinon.stub();
    stubNext.onFirstCall().returns(new Observable(observer => observer.error(error)));
    stubNext.onSecondCall().returns(Observable.of(data));

    const promisedLink = Links.asPromiseWrapper(retry);
    return promisedLink.request({}, stubNext)
      .then(actualData => {
        assert.deepEqual(stubNext.callCount, 2);
        assert.deepEqual(data, actualData);
      })
      .catch(actualError => {
        expect.fail();
      });
  });

});
