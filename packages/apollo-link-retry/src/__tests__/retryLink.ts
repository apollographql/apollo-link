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
    const max = 10;
    const retry = new RetryLink({ delay: 1, max });
    const stub = jest.fn(() => new Observable(o => o.error(standardError)));
    const link = ApolloLink.from([retry, stub]);

    const [{ error }] = await waitFor(execute(link, { query }));
    expect(error).toEqual(standardError);
    expect(stub).toHaveBeenCalledTimes(max);
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
    const retry = new RetryLink({ delay: 1, max: 2 });
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
    const retry = new RetryLink({ delay: 1, max: 2 });
    const data = { data: { hello: 'world' } };
    const unsubscribeStub = jest.fn();
    const fauxObservable = {
      subscribe(observer) {
        Promise.resolve().then(() => {
          observer.next(data);
          observer.complete();
        });
        return { unsubscribe: unsubscribeStub };
      },
    };
    const stub = jest.fn();
    stub.mockReturnValueOnce(new Observable(o => o.error(standardError)));
    stub.mockReturnValueOnce(fauxObservable);
    const link = ApolloLink.from([retry, stub]);

    const [{ values }] = await waitFor(execute(link, { query }));
    expect(values).toEqual([data]);
    expect(stub).toHaveBeenCalledTimes(2);
    expect(unsubscribeStub).toHaveBeenCalledTimes(1);
  });

  it('supports multiple subscribers to the same request', async () => {
    const retry = new RetryLink({ delay: 1, max: 5 });
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
    const retry = new RetryLink({ delay: 1, max: 5 });
    const data = { data: { hello: 'world' } };
    const stub = jest.fn();
    stub.mockReturnValueOnce(new Observable(o => o.error(standardError)));
    stub.mockReturnValueOnce(new Observable(o => o.error(standardError)));
    stub.mockReturnValueOnce(Observable.of(data));
    const link = ApolloLink.from([retry, stub]);

    const [result1, result2] = await waitFor(
      execute(link, { query }),
      execute(link, { query }),
    );
    expect(result1.values).toEqual([data]);
    expect(result2.values).toEqual([data]);
    expect(stub).toHaveBeenCalledTimes(6);
  });
});
