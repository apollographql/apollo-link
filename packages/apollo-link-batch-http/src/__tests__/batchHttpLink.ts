import { ApolloLink, execute, Observable, makePromise } from 'apollo-link';
import { print } from 'graphql';
import * as fetchMock from 'fetch-mock';
import gql from 'graphql-tag';

import { sharedHttpTest } from './sharedHttpTests';
import { BatchHttpLink } from '../batchHttpLink';

const sampleQuery = gql`
  query SampleQuery {
    stub {
      id
    }
  }
`;

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
  sharedHttpTest(
    'BatchHttpLink',
    httpArgs => {
      const args = {
        ...httpArgs,
        batchInterval: 0,
        batchMax: 1,
      };
      return new BatchHttpLink(args);
    },
    true,
  );

  beforeAll(() => {
    jest.resetModules();
  });

  const data = { data: { hello: 'world' } };
  const data2 = { data: { hello: 'everyone' } };
  const roflData = { data: { haha: 'hehe' } };
  const lawlData = { data: { tehe: 'haaa' } };
  const makePromise = res =>
    new Promise((resolve, reject) => setTimeout(() => resolve(res)));

  let subscriber;

  beforeEach(() => {
    fetchMock.restore();
    fetchMock.post('begin:batch', makePromise([data, data2]));
    fetchMock.post('begin:rofl', makePromise([roflData, roflData]));
    fetchMock.post('begin:lawl', makePromise([lawlData, lawlData]));

    const next = jest.fn();
    const error = jest.fn();
    const complete = jest.fn();

    subscriber = {
      next,
      error,
      complete,
    };
  });

  it('does not need any constructor arguments', () => {
    expect(() => new BatchHttpLink()).not.toThrow();
  });

  it('should pass batchInterval, batchMax, and batchKey to BatchLink', () => {
    jest.mock('apollo-link-batch', () => ({
      BatchLink: jest.fn(),
    }));

    const BatchLink = require('apollo-link-batch').BatchLink;
    const LocalScopedLink = require('../batchHttpLink').BatchHttpLink;

    const batchKey = () => 'hi';
    const batchHandler = operations => Observable.of();

    const batch = new LocalScopedLink({
      batchInterval: 20,
      batchMax: 20,
      batchKey,
      batchHandler,
    });

    const {
      batchInterval,
      batchMax,
      batchKey: batchKeyArg,
    } = BatchLink.mock.calls[0][0];

    expect(batchInterval).toBe(20);
    expect(batchMax).toBe(20);
    expect(batchKeyArg()).toEqual(batchKey());
  });

  it('handles batched requests', done => {
    const link = new BatchHttpLink({
      uri: 'batch',
      batchInterval: 0,
      batchMax: 2,
    });

    let nextCalls = 0;
    let completions = 0;
    const next = expectedData => data => {
      try {
        expect(data).toEqual(expectedData);
        nextCalls++;
      } catch (error) {
        done.fail(error);
      }
    };

    const complete = () => {
      try {
        const calls = fetchMock.calls('begin:batch');
        expect(calls.length).toBe(1);
        expect(nextCalls).toBe(2);

        const options = fetchMock.lastOptions('begin:batch');
        expect(options.credentials).toEqual('two');

        completions++;

        if (completions === 2) {
          done();
        }
      } catch (error) {
        done.fail(error);
      }
    };

    const error = error => {
      done.fail(error);
    };

    execute(link, {
      query: sampleQuery,
      context: { credentials: 'two' },
    }).subscribe(next(data), error, complete);

    execute(link, {
      query: sampleQuery,
      context: { credentials: 'two' },
    }).subscribe(next(data2), error, complete);
  });

  it('errors on an incorrect number of results for a batch', done => {
    const link = new BatchHttpLink({
      uri: 'batch',
      batchInterval: 0,
      batchMax: 3,
    });

    let errors = 0;
    const next = data => {
      done.fail('next should not have been called');
    };

    const complete = () => {
      done.fail('complete should not have been called');
    };

    const error = error => {
      errors++;

      if (errors === 3) {
        done();
      }
    };

    execute(link, { query: sampleQuery }).subscribe(next, error, complete);
    execute(link, { query: sampleQuery }).subscribe(next, error, complete);
    execute(link, { query: sampleQuery }).subscribe(next, error, complete);
  });

  describe('batchKey', () => {
    const query = gql`
      query {
        author {
          firstName
          lastName
        }
      }
    `;

    it('should batch queries with different options separately', done => {
      let key = true;
      const batchKey = () => {
        key = !key;
        return '' + !key;
      };

      const link = ApolloLink.from([
        new BatchHttpLink({
          uri: operation => {
            return operation.variables.endpoint;
          },
          batchInterval: 1,
          //if batchKey does not work, then the batch size would be 3
          batchMax: 3,
          batchKey,
        }),
      ]);

      let count = 0;
      const next = expected => received => {
        try {
          expect(received).toEqual(expected);
        } catch (e) {
          done.fail(e);
        }
      };
      const complete = () => {
        count++;
        if (count === 4) {
          try {
            const lawlCalls = fetchMock.calls('begin:lawl');
            expect(lawlCalls.length).toBe(1);
            const roflCalls = fetchMock.calls('begin:rofl');
            expect(roflCalls.length).toBe(1);
            done();
          } catch (e) {
            done.fail(e);
          }
        }
      };

      [1, 2].forEach(x => {
        execute(link, {
          query,
          variables: { endpoint: 'rofl' },
        }).subscribe({
          next: next(roflData),
          error: done.fail,
          complete,
        });

        execute(link, {
          query,
          variables: { endpoint: 'lawl' },
        }).subscribe({
          next: next(lawlData),
          error: done.fail,
          complete,
        });
      });
    });
  });
});
