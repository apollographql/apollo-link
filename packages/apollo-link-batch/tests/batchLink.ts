import { assert } from 'chai';
// import * as sinon from 'sinon';
import BatchLink from '../src/batchLink';

import {
  ApolloLink,
  execute,
  Observable,
  Operation,
  FetchResult,
} from 'apollo-link-core';

// import { createApolloFetch } from 'apollo-fetch';

// import { print } from 'graphql';
// import gql from 'graphql-tag';
// import * as fetchMock from 'fetch-mock';

import {
  OperationBatcher,
  BatchHandler,
  BatchableRequest,
} from '../src/batchLink';
import gql from 'graphql-tag';

import { print } from 'graphql/language/printer';

interface MockedResponse {
  request: Operation;
  result?: FetchResult;
  error?: Error;
  delay?: number;
}

function requestToKey(request: Operation): string {
  const queryString =
    typeof request.query === 'string' ? request.query : print(request.query);

  return JSON.stringify({
    variables: request.variables || {},
    query: queryString,
  });
}

function createMockBatchHandler(...mockedResponses: MockedResponse[]) {
  const mockedResponsesByKey: { [key: string]: MockedResponse[] } = {};

  const mockBatchHandler: BatchHandler = (operations: Operation[]) => {
    return new Observable(observer => {
      const results = operations.map(operation => {
        const key = requestToKey(operation);
        const responses = mockedResponsesByKey[key];
        if (!responses || responses.length === 0) {
          throw new Error(
            `No more mocked responses for the query: ${print(
              operation.query,
            )}, variables: ${JSON.stringify(operation.variables)}`,
          );
        }

        const { result, error } = responses.shift()!;

        if (!result && !error) {
          throw new Error(
            `Mocked response should contain either result or error: ${key}`,
          );
        }

        if (error) {
          observer.error(error);
        }

        return result;
      });

      observer.next(results);
    });
  };

  (mockBatchHandler as any).addMockedResponse = (
    mockedResponse: MockedResponse,
  ) => {
    const key = requestToKey(mockedResponse.request);
    let _mockedResponses = mockedResponsesByKey[key];
    if (!_mockedResponses) {
      _mockedResponses = [];
      mockedResponsesByKey[key] = _mockedResponses;
    }
    _mockedResponses.push(mockedResponse);
  };

  mockedResponses.map((mockBatchHandler as any).addMockedResponse);

  return mockBatchHandler;
}

describe('OperationBatcher', () => {
  it('should construct', () => {
    assert.doesNotThrow(() => {
      const querySched = new OperationBatcher({
        batchInterval: 10,
        batchHandler: () => null,
      });
      querySched.consumeQueue();
    });
  });

  it('should not do anything when faced with an empty queue', () => {
    const batcher = new OperationBatcher({
      batchInterval: 10,
      batchHandler: () => {
        return null;
      },
    });

    assert.equal(batcher.queuedRequests.length, 0);
    batcher.consumeQueue();
    assert.equal(batcher.queuedRequests.length, 0);
  });

  it('should be able to add to the queue', () => {
    const batcher = new OperationBatcher({
      batchInterval: 10,
      batchHandler: () => {
        return null;
      },
    });

    const query = gql`
      query {
        author {
          firstName
          lastName
        }
      }
    `;

    const request: BatchableRequest = {
      operation: { query },
    };

    assert.equal(batcher.queuedRequests.length, 0);
    batcher.enqueueRequest(request).subscribe({});
    assert.equal(batcher.queuedRequests.length, 1);
    batcher.enqueueRequest(request).subscribe({});
    assert.equal(batcher.queuedRequests.length, 2);
  });

  describe('request queue', () => {
    const query = gql`
      query {
        author {
          firstName
          lastName
        }
      }
    `;
    const data = {
      author: {
        firstName: 'John',
        lastName: 'Smith',
      },
    };
    const batchHandler = createMockBatchHandler(
      {
        request: { query },
        result: { data },
      },
      {
        request: { query },
        result: { data },
      },
    );
    const operation: Operation = {
      query,
    };

    it('should be able to consume from a queue containing a single query', done => {
      const myBatcher = new OperationBatcher({
        batchInterval: 10,
        batchHandler,
      });

      myBatcher.enqueueRequest({ operation }).subscribe(resultObj => {
        assert.equal(myBatcher.queuedRequests.length, 0);
        assert.deepEqual(resultObj, { data });
        done();
      });
      const observables: (
        | Observable<FetchResult>
        | undefined)[] = myBatcher.consumeQueue()!;

      assert.equal(observables.length, 1);
    });

    it('should be able to consume from a queue containing multiple queries', done => {
      const request2: Operation = {
        query,
      };
      const BH = createMockBatchHandler(
        {
          request: { query },
          result: { data },
        },
        {
          request: { query },
          result: { data },
        },
      );

      const myBatcher = new OperationBatcher({
        batchInterval: 10,
        batchMax: 10,
        batchHandler: BH,
      });
      const observable1 = myBatcher.enqueueRequest({ operation });
      const observable2 = myBatcher.enqueueRequest({ operation: request2 });
      let notify = false;
      observable1.subscribe(resultObj1 => {
        assert.deepEqual(resultObj1, { data });

        if (notify) {
          done();
        } else {
          notify = true;
        }
      });

      observable2.subscribe(resultObj2 => {
        assert.deepEqual(resultObj2, { data });

        if (notify) {
          done();
        } else {
          notify = true;
        }
      });

      assert.equal(myBatcher.queuedRequests.length, 2);
      const observables: (
        | Observable<FetchResult>
        | undefined)[] = myBatcher.consumeQueue()!;
      assert.equal(myBatcher.queuedRequests.length, 0);
      assert.equal(observables.length, 2);
    });

    it('should return a promise when we enqueue a request and resolve it with a result', done => {
      const BH = createMockBatchHandler({
        request: { query },
        result: { data },
      });
      const myBatcher = new OperationBatcher({
        batchInterval: 10,
        batchHandler: BH,
      });
      const observable = myBatcher.enqueueRequest({ operation });
      observable.subscribe(result => {
        assert.deepEqual(result, { data });
        done();
      });
      myBatcher.consumeQueue();
    });
  });

  it('should work when single query', done => {
    const batcher = new OperationBatcher({
      batchInterval: 10,
      batchHandler: () =>
        new Observable(observer => {
          setTimeout(observer.complete.bind(observer));
        }),
    });
    const query = gql`
      query {
        author {
          firstName
          lastName
        }
      }
    `;
    const operation: Operation = { query };

    batcher.enqueueRequest({ operation }).subscribe({});
    assert.equal(batcher.queuedRequests.length, 1);

    setTimeout(() => {
      assert.equal(batcher.queuedRequests.length, 0);
      done();
    }, 20);
  });

  it('should correctly batch multiple queries', done => {
    const batcher = new OperationBatcher({
      batchInterval: 10,
      batchHandler: () => null,
    });
    const query = gql`
      query {
        author {
          firstName
          lastName
        }
      }
    `;
    const operation: Operation = { query };

    batcher.enqueueRequest({ operation }).subscribe({});
    batcher.enqueueRequest({ operation }).subscribe({});
    assert.equal(batcher.queuedRequests.length, 2);

    setTimeout(() => {
      // The batch shouldn't be fired yet, so we can add one more request.
      batcher.enqueueRequest({ operation }).subscribe({});
      assert.equal(batcher.queuedRequests.length, 3);
    }, 5);

    setTimeout(() => {
      // The batch should've been fired by now.
      assert.equal(batcher.queuedRequests.length, 0);
      done();
    }, 20);
  });

  it('should reject the promise if there is a network error', done => {
    const query = gql`
      query {
        author {
          firstName
          lastName
        }
      }
    `;
    const operation: Operation = {
      query: query,
    };
    const error = new Error('Network error');
    const BH = createMockBatchHandler({
      request: { query },
      error,
    });
    const batcher = new OperationBatcher({
      batchInterval: 10,
      batchHandler: BH,
    });

    const observable = batcher.enqueueRequest({ operation });
    observable.subscribe({
      error: (resError: Error) => {
        assert.equal(resError.message, 'Network error');
        done();
      },
    });
    batcher.consumeQueue();
  });
});

describe('BatchLink', () => {
  it('does not need any constructor arguments', () => {
    assert.doesNotThrow(() => new BatchLink());
  });

  it('passes forward on', () => {
    const link = ApolloLink.from([new BatchLink()]);
    execute(link, {});
  });
});
