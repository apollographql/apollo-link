import {
  ApolloLink,
  execute,
  Observable,
  Operation,
  FetchResult,
} from 'apollo-link';
import gql from 'graphql-tag';
import { print } from 'graphql/language/printer';

import BatchLink, {
  OperationBatcher,
  BatchHandler,
  BatchableRequest,
} from '../batchLink';

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
    expect(() => {
      const querySched = new OperationBatcher({
        batchInterval: 10,
        batchHandler: () => null,
      });
      querySched.consumeQueue();
    }).not.toThrow();
  });

  it('should not do anything when faced with an empty queue', () => {
    const batcher = new OperationBatcher({
      batchInterval: 10,
      batchHandler: () => {
        return null;
      },
    });

    expect(batcher.queuedRequests.length).toBe(0);
    batcher.consumeQueue();
    expect(batcher.queuedRequests.length).toBe(0);
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

    expect(batcher.queuedRequests.length).toBe(0);
    batcher.enqueueRequest(request).subscribe({});
    expect(batcher.queuedRequests.length).toBe(1);
    batcher.enqueueRequest(request).subscribe({});
    expect(batcher.queuedRequests.length).toBe(2);
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
        expect(myBatcher.queuedRequests.length).toBe(0);
        expect(resultObj).toEqual({ data });
        done();
      });
      const observables: (
        | Observable<FetchResult>
        | undefined)[] = myBatcher.consumeQueue()!;

      expect(observables.length).toBe(1);
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
        expect(resultObj1).toEqual({ data });

        if (notify) {
          done();
        } else {
          notify = true;
        }
      });

      observable2.subscribe(resultObj2 => {
        expect(resultObj2).toEqual({ data });

        if (notify) {
          done();
        } else {
          notify = true;
        }
      });

      expect(myBatcher.queuedRequests.length).toBe(2);
      const observables: (
        | Observable<FetchResult>
        | undefined)[] = myBatcher.consumeQueue()!;
      expect(myBatcher.queuedRequests.length).toBe(0);
      expect(observables.length).toBe(2);
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
        expect(result).toEqual({ data });
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
    expect(batcher.queuedRequests.length).toBe(1);

    setTimeout(() => {
      expect(batcher.queuedRequests.length).toBe(0);
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
    expect(batcher.queuedRequests.length).toBe(2);

    setTimeout(() => {
      // The batch shouldn't be fired yet, so we can add one more request.
      batcher.enqueueRequest({ operation }).subscribe({});
      expect(batcher.queuedRequests.length).toBe(3);
    }, 5);

    setTimeout(() => {
      // The batch should've been fired by now.
      expect(batcher.queuedRequests.length).toBe(0);
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
        expect(resError.message).toBe('Network error');
        done();
      },
    });
    batcher.consumeQueue();
  });
});

describe('BatchLink', () => {
  it('does not need any constructor arguments', () => {
    expect(
      () => new BatchLink({ batchHandler: () => Observable.of() }),
    ).not.toThrow();
  });

  it('passes forward on', () => {
    const link = ApolloLink.from([
      new BatchLink({ batchHandler: () => Observable.of() }),
    ]);
    execute(link, {});
  });
});
