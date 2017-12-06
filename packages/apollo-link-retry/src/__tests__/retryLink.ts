import gql from 'graphql-tag';
import { execute, ApolloLink, Observable, FetchResult } from 'apollo-link';
import waitFor from 'wait-for-observables';

import { RetryLink } from '../retryLink';

const query = gql`
  {
    sample {
      id
    }
  }
`;

const standardError = new Error('I never work');

describe('RetryLink', () => {
  it('fails for unreachable endpoints', async () => {
    const maxTries = 10;
    const retry = new RetryLink({ initialDelay: 1, maxTries });
    const stub = jest.fn(() => new Observable(o => o.error(standardError)));
    const link = ApolloLink.from([retry, stub]);

    const [{ error }] = await waitFor(execute(link, { query }));
    expect(error).toEqual(standardError);
    expect(stub).toHaveBeenCalledTimes(maxTries);
  });

  it('returns data from the underlying link on a successful operation', async () => {
    const retry = new RetryLink();
    const data = { data: { hello: 'world' } };
    const stub = jest.fn(() => Observable.of(data));
    const link = ApolloLink.from([retry, stub]);

    const [{ values }] = await waitFor(execute(link, { query }));
    expect(values).toEqual([data]);
    expect(stub).toHaveBeenCalledTimes(1);
  });

  it('returns data from the underlying link on a successful retry', async () => {
    const retry = new RetryLink({ initialDelay: 1, maxTries: 2 });
    const data = { data: { hello: 'world' } };
    const stub = jest.fn();
    stub.mockReturnValueOnce(new Observable(o => o.error(standardError)));
    stub.mockReturnValueOnce(Observable.of(data));
    const link = ApolloLink.from([retry, stub]);

    const [{ values }] = await waitFor(execute(link, { query }));
    expect(values).toEqual([data]);
    expect(stub).toHaveBeenCalledTimes(2);
  });

  it('calls unsubscribe on the appropriate downstream observable', async () => {
    const retry = new RetryLink({ initialDelay: 1, maxTries: 2 });
    const data = { data: { hello: 'world' } };
    const unsubscribeStub = jest.fn();

    const firstTry = new Observable(o => o.error(standardError));
    // Hold the test hostage until we're hit
    let secondTry;
    const untilSecondTry = new Promise(resolve => {
      secondTry = {
        subscribe(observer) {
          resolve(); // Release hold on test.

          Promise.resolve().then(() => {
            observer.next(data);
            observer.complete();
          });
          return { unsubscribe: unsubscribeStub };
        },
      };
    });

    const stub = jest.fn();
    stub.mockReturnValueOnce(firstTry);
    stub.mockReturnValueOnce(secondTry);
    const link = ApolloLink.from([retry, stub]);

    const subscription = execute(link, { query }).subscribe({});
    await untilSecondTry;
    subscription.unsubscribe();
    expect(unsubscribeStub).toHaveBeenCalledTimes(1);
  });

  it('supports multiple subscribers to the same request', async () => {
    const retry = new RetryLink({ initialDelay: 1, maxTries: 5 });
    const data = { data: { hello: 'world' } };
    const stub = jest.fn();
    stub.mockReturnValueOnce(new Observable(o => o.error(standardError)));
    stub.mockReturnValueOnce(new Observable(o => o.error(standardError)));
    stub.mockReturnValueOnce(Observable.of(data));
    const link = ApolloLink.from([retry, stub]);

    const observable = execute(link, { query });
    const [result1, result2] = await waitFor(observable, observable);
    expect(result1.values).toEqual([data]);
    expect(result2.values).toEqual([data]);
    expect(stub).toHaveBeenCalledTimes(3);
  });

  it('retries independently for concurrent requests', async () => {
    const retry = new RetryLink({ initialDelay: 1, maxTries: 5 });
    const data = { data: { hello: 'world' } };
    const stub = jest.fn(() => new Observable(o => o.error(standardError)));
    const link = ApolloLink.from([retry, stub]);

    const [result1, result2] = await waitFor(
      execute(link, { query }),
      execute(link, { query }),
    );
    expect(result1.error).toEqual(standardError);
    expect(result2.error).toEqual(standardError);
    expect(stub).toHaveBeenCalledTimes(10);
  });

  describe('buildDelayFunction', () => {
    // For easy testing of just the delay component
    interface SimpleDelayFunction {
      (count: number): number;
    }

    function delayRange(delayFunction: SimpleDelayFunction, count: number) {
      const results = [];
      for (let i = 1; i <= count; i++) {
        results.push(delayFunction(i));
      }
      return results;
    }

    it('stops after hitting maxTries', () => {
      const delayFunction = RetryLink.buildDelayFunction({
        maxTries: 3,
        retryIf: () => true,
      }) as SimpleDelayFunction;

      expect(typeof delayFunction(2)).toEqual('number');
      expect(delayFunction(3)).toEqual(false);
      expect(delayFunction(4)).toEqual(false);
    });

    it('skips retries if there was no error, by default', () => {
      const delayFunction = RetryLink.buildDelayFunction();

      expect(delayFunction(1, {} as any, undefined)).toEqual(false);
      expect(typeof delayFunction(1, {} as any, {})).toEqual('number');
    });

    describe('without jitter', () => {
      it('grows exponentially up to maxDelay', () => {
        const delayFunction = RetryLink.buildDelayFunction({
          jitter: false,
          initialDelay: 100,
          maxDelay: 1000,
          maxTries: Infinity,
          retryIf: () => true,
        }) as SimpleDelayFunction;

        expect(delayRange(delayFunction, 6)).toEqual([
          100,
          200,
          400,
          800,
          1000,
          1000,
        ]);
      });
    });

    describe('with jitter', () => {
      let mockRandom, origRandom;
      beforeEach(() => {
        mockRandom = jest.fn();
        origRandom = Math.random;
        Math.random = mockRandom;
      });

      afterEach(() => {
        Math.random = origRandom;
      });

      it('jitters, on average, exponentially up to maxDelay', () => {
        const delayFunction = RetryLink.buildDelayFunction({
          jitter: true,
          initialDelay: 100,
          maxDelay: 1000,
          maxTries: Infinity,
          retryIf: () => true,
        }) as SimpleDelayFunction;

        mockRandom.mockReturnValue(0.5);
        expect(delayRange(delayFunction, 5)).toEqual([100, 200, 400, 500, 500]);
      });

      it('can have instant retries as the low end of the jitter range', () => {
        const delayFunction = RetryLink.buildDelayFunction({
          jitter: true,
          initialDelay: 100,
          maxDelay: 1000,
          maxTries: Infinity,
          retryIf: () => true,
        }) as SimpleDelayFunction;

        mockRandom.mockReturnValue(0);
        expect(delayRange(delayFunction, 5)).toEqual([0, 0, 0, 0, 0]);
      });

      it('uses double the calculated delay as the high end of the jitter range, up to maxDelay', () => {
        const delayFunction = RetryLink.buildDelayFunction({
          jitter: true,
          initialDelay: 100,
          maxDelay: 1000,
          maxTries: Infinity,
          retryIf: () => true,
        }) as SimpleDelayFunction;

        mockRandom.mockReturnValue(1);
        expect(delayRange(delayFunction, 5)).toEqual([
          200,
          400,
          800,
          1000,
          1000,
        ]);
      });
    });
  });
});
