import { ApolloLink, execute, Observable, makePromise } from 'apollo-link';
import { ApolloFetch } from 'apollo-fetch';
import { print } from 'graphql';
import gql from 'graphql-tag';

import { BatchHttpLink } from '../batchHttpLink';

const operation = {
  query: gql`
    query SampleQuery {
      stub {
        id
      }
    }
  `,
};

describe('BatchHttpLink', () => {
  beforeAll(() => {
    jest.resetModules();
  });
  it('does not need any constructor arguments', () => {
    expect(() => new BatchHttpLink()).not.toThrow();
  });

  it('should pass batchInterval and batchMax to BatchLink', () => {
    jest.mock('apollo-link-batch', () => ({
      BatchLink: jest.fn(),
    }));

    const BatchLink = require('apollo-link-batch').BatchLink;
    const LocalScopedLink = require('../batchHttpLink').BatchHttpLink;

    const batch = new LocalScopedLink({
      batchInterval: 20,
      batchMax: 20,
    });

    const { batchInterval, batchMax } = BatchLink.mock.calls[0][0];
    expect(batchInterval).toBe(20);
    expect(batchMax).toBe(20);
  });

  it('should pass printed operation to apollo fetch', done => {
    const apolloFetch: any = operations => {
      expect(Array.isArray(operations)).toBeTruthy();
      expect(operations.length).toEqual(1);
      expect(operations[0].query).toEqual(print(operation.query));
      done();
      return makePromise(Observable.of());
    };
    (apolloFetch as any).use = () => void 0;
    (apolloFetch as any).useAfter = () => void 0;
    (apolloFetch as any).batchUse = () => void 0;
    (apolloFetch as any).batchUseAfter = () => void 0;

    const link = ApolloLink.from([
      new BatchHttpLink({
        fetch: apolloFetch as ApolloFetch,
      }),
    ]);

    execute(link, operation).subscribe({});
  });

  it("should call observer's error when apollo fetch returns an error", done => {
    const error = new Error('Evans Hauser');

    const apolloFetch: any = operations => {
      expect(Array.isArray(operations)).toBeTruthy();
      expect(operations.length).toEqual(1);
      expect(operations[0].query).toEqual(print(operation.query));
      return makePromise(
        new Observable(observer => {
          observer.error(error);
        }),
      );
    };
    (apolloFetch as any).use = () => void 0;
    (apolloFetch as any).useAfter = () => void 0;
    (apolloFetch as any).batchUse = () => void 0;
    (apolloFetch as any).batchUseAfter = () => void 0;

    const link = ApolloLink.from([
      new BatchHttpLink({
        fetch: apolloFetch as ApolloFetch,
      }),
    ]);

    execute(link, operation).subscribe({
      error: received => {
        expect(received).toEqual(error);
        done();
      },
    });
  });

  it("should call observer's next and then complete when apollo fetch returns data", done => {
    const results = [
      {
        data: {
          data: {
            works: 'great',
          },
        },
      },
    ];

    let middleware = [];
    const apolloFetch: any = operations => {
      expect(Array.isArray(operations)).toBeTruthy();
      expect(operations.length).toEqual(1);
      expect(operations[0].query).toEqual(print(operation.query));
      middleware.forEach(x => x());
      return makePromise(
        new Observable(observer => {
          observer.next(results);
          observer.complete();
        }),
      );
    };
    (apolloFetch as any).use = () => void 0;
    (apolloFetch as any).useAfter = () => void 0;
    (apolloFetch as any).batchUse = fn => {
      const request = { options: { headers: {} } } as any;
      const next = () => {
        expect(request.options.headers.foo).toEqual(true);
      };
      middleware.push(() => fn(request, next));
    };
    (apolloFetch as any).batchUseAfter = () => void 0;

    const link = ApolloLink.from([
      new BatchHttpLink({
        fetch: apolloFetch as ApolloFetch,
      }),
    ]);

    const next = jest.fn();

    execute(link, {
      ...operation,
      context: {
        headers: { foo: true },
      },
    }).subscribe({
      next,
      complete: () => {
        expect(next).toBeCalledWith(results[0]);
        done();
      },
    });
  });
});
