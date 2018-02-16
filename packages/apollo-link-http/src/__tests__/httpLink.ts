import { Observable, ApolloLink, execute } from 'apollo-link';
import gql from 'graphql-tag';
import * as fetchMock from 'fetch-mock';
import objectToQuery from 'object-to-querystring';

import { sharedHttpTest } from './sharedHttpTests';
import { HttpLink, createHttpLink } from '../httpLink';

const sampleQuery = gql`
  query SampleQuery {
    stub {
      id
    }
  }
`;

const makeCallback = (done, body) => {
  return (...args) => {
    try {
      body(...args);
      done();
    } catch (error) {
      done.fail(error);
    }
  };
};

describe('HttpLink', () => {
  describe('HttpLink-specific tests', () => {
    it('does not need any constructor arguments', () => {
      expect(() => new HttpLink()).not.toThrow();
    });

    const makePromise = res =>
      new Promise((resolve, reject) => setTimeout(() => resolve(res)));
    const data = { data: { hello: 'world' } };

    beforeEach(() => {
      fetchMock.restore();
      fetchMock.post('begin:data', makePromise(data));
      fetchMock.get('begin:data', makePromise(data));
    });

    afterEach(() => {
      fetchMock.restore();
    });

    it('constructor creates link that can call next and then complete', done => {
      const next = jest.fn();
      const link = new HttpLink({ uri: 'data' });
      const observable = execute(link, {
        query: sampleQuery,
      });
      observable.subscribe({
        next,
        error: error => expect(false),
        complete: () => {
          expect(next).toHaveBeenCalledTimes(1);
          done();
        },
      });
    });

    it('supports using a GET request', done => {
      const variables = { params: 'stub' };

      let requestedString;
      const customFetch = (uri, options) => {
        const { body, ...newOptions } = options;
        const queryString = objectToQuery(JSON.parse(body));
        requestedString = uri + queryString;
        return fetch(requestedString, newOptions);
      };
      const link = createHttpLink({
        uri: 'data',
        fetchOptions: { method: 'GET' },
        fetch: customFetch,
      });

      execute(link, { query: sampleQuery, variables }).subscribe({
        next: makeCallback(done, result => {
          const [uri, options] = fetchMock.lastCall();
          const { method, body, ...rest } = options;
          expect(body).toBeUndefined();

          expect(method).toBe('GET');
        }),
        error: error => done.fail(error),
      });
    });

    it('supports using a GET request on the context', done => {
      const variables = { params: 'stub' };
      const link = createHttpLink({
        uri: 'data',
      });

      execute(link, {
        query: sampleQuery,
        variables,
        context: {
          fetchOptions: { method: 'GET' },
        },
      }).subscribe(
        makeCallback(done, result => {
          const method = fetchMock.lastCall()[1].method;
          expect(method).toBe('GET');
        }),
      );
    });
  });

  sharedHttpTest('HttpLink', createHttpLink);
});
