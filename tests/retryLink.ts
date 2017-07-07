import { assert, expect } from 'chai';
import * as sinon from 'sinon';
import RetryLink from '../src/retryLink';
import * as Links from '../src/links';
import ErrorObservable from './observables/errorObservable';
import SuccessObservable from './observables/successObservable';

describe('RetryLink', () => {

  it('can be initialized', () => assert(true));

  it('should fail with unreachable endpoint', () => {
    const maxRetries = 10;
    const retry = new RetryLink({delay: 1, maxRetries});
    const error = new Error('I never work');
    const stubNext = sinon.stub().callsFake(() => new ErrorObservable(error));

    const promisedLink = Links.asPromiseWrapper(retry);
    return promisedLink.request({}, stubNext)
      .then(() => {
        expect.fail();
      })
      .catch(actualError => {
        assert.deepEqual(stubNext.callCount, maxRetries);
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
    stubNext.returns(new SuccessObservable(data));

    const promisedLink = Links.asPromiseWrapper(retry);
    return promisedLink.request({}, stubNext)
      .then(actualData => {
        assert(stubNext.calledOnce);
        assert.deepEqual(data, actualData);
      });
  });

  it('should return data from the underlying link on a successful retry', () => {
    const retry = new RetryLink({delay: 1});
    const error = new Error('I never work');
    const data = {
      data: {
        hello: 'world',
      },
    };
    const stubNext = sinon.stub();
    stubNext.onFirstCall().returns(new ErrorObservable(error));
    stubNext.onSecondCall().returns(new SuccessObservable(data));

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
