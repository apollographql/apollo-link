import { assert } from 'chai';
import * as sinon from 'sinon';
import BatchHttpLink from '../src/batchHttpLink';

import * as proxy from 'proxyquire';

import { ApolloLink, execute, Observable, makePromise } from 'apollo-link-core';
import { ApolloFetch } from 'apollo-fetch';

import { print } from 'graphql';
import gql from 'graphql-tag';

describe('BatchHttpLink', () => {
  it('does not need any constructor arguments', () => {
    assert.doesNotThrow(() => new BatchHttpLink());
  });

  it('should pass batchInterval and batchMax to BatchLink', () => {
    const stub = sinon.stub();
    const BatchHttpProxy = proxy('../src/batchHttpLink', {
      'apollo-link-batch': {
        default: stub,
      },
    }).default;

    const batch = new BatchHttpProxy({
      batchInterval: 20,
      batchMax: 20,
    });
    assert(batch);
    assert(stub.called);
    assert.equal(stub.firstCall.args[0].batchInterval, 20);
    assert.equal(stub.firstCall.args[0].batchMax, 20);
  });

  const operation = {
    query: gql`
      query SampleQuery {
        stub {
          id
        }
      }
    `,
  };

  it('should pass printed operation to apollo fetch', done => {
    const apolloFetch: any = operations => {
      assert(Array.isArray(operations));
      assert.equal(operations.length, 1);
      assert.deepEqual(operations[0].query, print(operation.query));
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
      assert(Array.isArray(operations));
      assert.equal(operations.length, 1);
      assert.deepEqual(operations[0].query, print(operation.query));
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
        assert.equal(received, error);
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

    const apolloFetch: any = operations => {
      assert(Array.isArray(operations));
      assert.equal(operations.length, 1);
      assert.deepEqual(operations[0].query, print(operation.query));
      return makePromise(
        new Observable(observer => {
          observer.next(results);
          observer.complete();
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

    const next = sinon.stub();

    execute(link, operation).subscribe({
      next,
      complete: () => {
        assert(next.calledOnce);
        assert.equal(next.firstCall.args[0], results[0]);
        done();
      },
    });
  });
});
