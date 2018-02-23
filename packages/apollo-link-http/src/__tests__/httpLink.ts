import { Observable, ApolloLink, execute } from 'apollo-link';
import gql from 'graphql-tag';
import fetchMock from 'fetch-mock';
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
      fetchMock.post('begin:http://data/', makePromise(data));
      fetchMock.get('begin:http://data/', makePromise(data));
    });

    afterEach(() => {
      fetchMock.restore();
    });

    it('constructor creates link that can call next and then complete', done => {
      const next = jest.fn();
      const link = new HttpLink({ uri: 'http://data/' });
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
      const extensions = { myExtension: 'foo' };

      const link = createHttpLink({
        uri: 'http://data/',
        fetchOptions: { method: 'GET' },
        includeExtensions: true,
      });

      execute(link, { query: sampleQuery, variables, extensions }).subscribe({
        next: makeCallback(done, result => {
          const [uri, options] = fetchMock.lastCall();
          const { method, body } = options;
          expect(body).toBeUndefined();
          expect(method).toBe('GET');
          expect(uri).toBe(
            'http://data/?query=query%20SampleQuery%20%7B%0A%20%20stub%20%7B%0A%20%20%20%20id%0A%20%20%7D%0A%7D%0A&operationName=SampleQuery&variables=%7B%22params%22%3A%22stub%22%7D&extensions=%7B%22myExtension%22%3A%22foo%22%7D',
          );
        }),
        error: error => done.fail(error),
      });
    });

    it('supports using a GET request with search and fragment', done => {
      const variables = { params: 'stub' };

      const link = createHttpLink({
        uri: 'http://data/?foo=bar#frag',
        fetchOptions: { method: 'GET' },
      });

      execute(link, { query: sampleQuery, variables }).subscribe({
        next: makeCallback(done, result => {
          const [uri, options] = fetchMock.lastCall();
          const { method, body } = options;
          expect(body).toBeUndefined();
          expect(method).toBe('GET');
          expect(uri).toBe(
            'http://data/?foo=bar&query=query%20SampleQuery%20%7B%0A%20%20stub%20%7B%0A%20%20%20%20id%0A%20%20%7D%0A%7D%0A&operationName=SampleQuery&variables=%7B%22params%22%3A%22stub%22%7D#frag',
          );
        }),
        error: error => done.fail(error),
      });
    });

    it('supports using a GET request on the context', done => {
      const variables = { params: 'stub' };
      const link = createHttpLink({
        uri: 'http://data/',
      });

      execute(link, {
        query: sampleQuery,
        variables,
        context: {
          fetchOptions: { method: 'GET' },
        },
      }).subscribe(
        makeCallback(done, result => {
          const [uri, options] = fetchMock.lastCall();
          const { method, body } = options;
          expect(body).toBeUndefined();
          expect(method).toBe('GET');
          expect(uri).toBe(
            'http://data/?query=query%20SampleQuery%20%7B%0A%20%20stub%20%7B%0A%20%20%20%20id%0A%20%20%7D%0A%7D%0A&operationName=SampleQuery&variables=%7B%22params%22%3A%22stub%22%7D',
          );
        }),
      );
    });
  });

  sharedHttpTest('HttpLink', createHttpLink);
});
