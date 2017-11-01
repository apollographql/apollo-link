import { Observable, ApolloLink, execute } from 'apollo-link';
import { print } from 'graphql';
import gql from 'graphql-tag';
import * as fetchMock from 'fetch-mock';

import { HttpLink, createHttpLink } from '../httpLink';

const sampleQuery = gql`
  query SampleQuery {
    stub {
      id
    }
  }
`;

const sampleMutation = gql`
  mutation SampleMutation {
    stub(param: "value") {
      id
    }
  }
`;

describe('HttpLink', () => {
  const data = { data: { hello: 'world' } };
  const data2 = { data: { hello: 'everyone' } };
  const mockError = { throws: new TypeError('mock me') };

  let subscriber;

  beforeEach(() => {
    fetchMock.post('begin:data2', data2);
    fetchMock.post('begin:data', data);
    fetchMock.post('begin:error', mockError);
    fetchMock.post('begin:apollo', data);

    fetchMock.get('begin:data', data);
    fetchMock.get('begin:data2', data2);

    const next = jest.fn();
    const error = jest.fn();
    const complete = jest.fn();

    subscriber = {
      next,
      error,
      complete,
    };
  });

  afterEach(() => {
    fetchMock.restore();
  });
  it('raises warning if called with concat', () => {
    const link = new HttpLink();
    const _warn = console.warn;
    console.warn = warning => expect(warning['message']).toBeDefined();
    expect(link.concat((operation, forward) => forward(operation))).toEqual(
      link,
    );
    console.warn = _warn;
  });

  it('does not need any constructor arguments', () => {
    expect(() => new HttpLink()).not.toThrow();
  });

  it('calls next and then complete', done => {
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

  it('calls error when fetch fails', done => {
    const link = new HttpLink({ uri: 'error' });
    const observable = execute(link, {
      query: sampleQuery,
    });
    observable.subscribe(
      result => expect(false),
      error => {
        expect(error).toEqual(mockError.throws);
        done();
      },
      () => {
        expect(false);
        done();
      },
    );
  });

  it('calls error when fetch fails', done => {
    const link = new HttpLink({ uri: 'error' });
    const observable = execute(link, {
      query: sampleMutation,
    });
    observable.subscribe(
      result => expect(false),
      error => {
        expect(error).toEqual(mockError.throws);
        done();
      },
      () => {
        expect(false);
        done();
      },
    );
  });

  it('unsubscribes without calling subscriber', done => {
    const link = new HttpLink({ uri: 'data' });
    const observable = execute(link, {
      query: sampleQuery,
    });
    const subscription = observable.subscribe(
      () => expect(false),
      () => expect(false),
      () => expect(false),
    );
    subscription.unsubscribe();
    expect(subscription.closed).toBe(true);
    setTimeout(done, 50);
  });

  const verifyRequest = (
    link: ApolloLink,
    after: () => void,
    includeExtensions: boolean = false,
  ) => {
    const next = jest.fn();
    const context = { info: 'stub' };
    const variables = { params: 'stub' };

    const observable = execute(link, {
      query: sampleMutation,
      context,
      variables,
    });
    observable.subscribe({
      next,
      error: error => expect(false),
      complete: () => {
        const body = JSON.parse(fetchMock.lastCall()[1].body);
        expect(body.query).toBe(print(sampleMutation));
        expect(body.variables).toEqual(variables);
        expect(body.context).not.toBeDefined();
        if (includeExtensions) {
          expect(body.extensions).toBeDefined();
        } else {
          expect(body.extensions).not.toBeDefined();
        }
        expect(next).toHaveBeenCalledTimes(1);

        after();
      },
    });
  };

  it('passes all arguments to multiple fetch body including extensions', done => {
    const link = new HttpLink({ uri: 'data', includeExtensions: true });
    verifyRequest(link, () => verifyRequest(link, done, true), true);
  });

  it('passes all arguments to multiple fetch body excluding extensions', done => {
    const link = new HttpLink({ uri: 'data' });
    verifyRequest(link, () => verifyRequest(link, done));
  });

  it('calls multiple subscribers', done => {
    const link = new HttpLink({ uri: 'data' });
    const context = { info: 'stub' };
    const variables = { params: 'stub' };

    const observable = execute(link, {
      query: sampleMutation,
      context,
      variables,
    });
    observable.subscribe(subscriber);
    observable.subscribe(subscriber);

    setTimeout(() => {
      expect(subscriber.next).toHaveBeenCalledTimes(2);
      expect(subscriber.complete).toHaveBeenCalledTimes(2);
      expect(subscriber.error).not.toHaveBeenCalled();
      done();
    }, 50);
  });

  it('calls remaining subscribers after unsubscribe', done => {
    const link = new HttpLink({ uri: 'data' });
    const context = { info: 'stub' };
    const variables = { params: 'stub' };

    const observable = execute(link, {
      query: sampleMutation,
      context,
      variables,
    });
    observable.subscribe(subscriber);
    const subscription = observable.subscribe(subscriber);
    subscription.unsubscribe();

    setTimeout(() => {
      expect(subscriber.next).toHaveBeenCalledTimes(1);
      expect(subscriber.complete).toHaveBeenCalledTimes(1);
      expect(subscriber.error).not.toHaveBeenCalled();
      done();
    }, 50);
  });
  it('allows for dynamic endpoint setting', done => {
    const variables = { params: 'stub' };
    const link = createHttpLink({ uri: 'data' });

    execute(link, {
      query: sampleQuery,
      variables,
      context: { uri: 'data2' },
    }).subscribe(result => {
      expect(result).toEqual(data2);
      done();
    });
  });
  it('adds headers to the request from the context', done => {
    const variables = { params: 'stub' };
    const middleware = new ApolloLink((operation, forward) => {
      operation.setContext({
        headers: { authorization: '1234' },
      });
      return forward(operation).map(result => {
        const { response } = operation.getContext();
        expect(response.headers).toBeDefined();
        return result;
      });
    });
    const link = middleware.concat(createHttpLink({ uri: 'data' }));

    execute(link, { query: sampleQuery, variables }).subscribe(result => {
      const headers = fetchMock.lastCall()[1].headers;
      expect(headers.authorization).toBe('1234');
      expect(headers['content-type']).toBe('application/json');
      expect(headers.accept).toBe('*/*');
      done();
    });
  });
  it('adds headers to the request from the setup', done => {
    const variables = { params: 'stub' };
    const link = createHttpLink({
      uri: 'data',
      headers: { authorization: '1234' },
    });

    execute(link, { query: sampleQuery, variables }).subscribe(result => {
      const headers = fetchMock.lastCall()[1].headers;
      expect(headers.authorization).toBe('1234');
      expect(headers['content-type']).toBe('application/json');
      expect(headers.accept).toBe('*/*');
      done();
    });
  });
  it('prioritizes context headers over setup headers', done => {
    const variables = { params: 'stub' };
    const middleware = new ApolloLink((operation, forward) => {
      operation.setContext({
        headers: { authorization: '1234' },
      });
      return forward(operation);
    });
    const link = middleware.concat(
      createHttpLink({ uri: 'data', headers: { authorization: 'no user' } }),
    );

    execute(link, { query: sampleQuery, variables }).subscribe(result => {
      const headers = fetchMock.lastCall()[1].headers;
      expect(headers.authorization).toBe('1234');
      expect(headers['content-type']).toBe('application/json');
      expect(headers.accept).toBe('*/*');
      done();
    });
  });
  it('adds headers to the request from the context on an operation', done => {
    const variables = { params: 'stub' };
    const link = createHttpLink({ uri: 'data' });

    const context = {
      headers: { authorization: '1234' },
    };
    execute(link, {
      query: sampleQuery,
      variables,
      context,
    }).subscribe(result => {
      const headers = fetchMock.lastCall()[1].headers;
      expect(headers.authorization).toBe('1234');
      expect(headers['content-type']).toBe('application/json');
      expect(headers.accept).toBe('*/*');
      done();
    });
  });
  it('adds creds to the request from the context', done => {
    const variables = { params: 'stub' };
    const middleware = new ApolloLink((operation, forward) => {
      operation.setContext({
        credentials: 'same-team-yo',
      });
      return forward(operation);
    });
    const link = middleware.concat(createHttpLink({ uri: 'data' }));

    execute(link, { query: sampleQuery, variables }).subscribe(result => {
      const creds = fetchMock.lastCall()[1].credentials;
      expect(creds).toBe('same-team-yo');
      done();
    });
  });
  it('adds creds to the request from the setup', done => {
    const variables = { params: 'stub' };
    const link = createHttpLink({ uri: 'data', credentials: 'same-team-yo' });

    execute(link, { query: sampleQuery, variables }).subscribe(result => {
      const creds = fetchMock.lastCall()[1].credentials;
      expect(creds).toBe('same-team-yo');
      done();
    });
  });
  it('prioritizes creds from the context over the setup', done => {
    const variables = { params: 'stub' };
    const middleware = new ApolloLink((operation, forward) => {
      operation.setContext({
        credentials: 'same-team-yo',
      });
      return forward(operation);
    });
    const link = middleware.concat(
      createHttpLink({ uri: 'data', credentials: 'error' }),
    );

    execute(link, { query: sampleQuery, variables }).subscribe(result => {
      const creds = fetchMock.lastCall()[1].credentials;
      expect(creds).toBe('same-team-yo');
      done();
    });
  });
  it('adds uri to the request from the context', done => {
    const variables = { params: 'stub' };
    const middleware = new ApolloLink((operation, forward) => {
      operation.setContext({
        uri: 'data',
      });
      return forward(operation);
    });
    const link = middleware.concat(createHttpLink());

    execute(link, { query: sampleQuery, variables }).subscribe(result => {
      const uri = fetchMock.lastUrl();
      expect(uri).toBe('data');
      done();
    });
  });
  it('adds uri to the request from the setup', done => {
    const variables = { params: 'stub' };
    const link = createHttpLink({ uri: 'data' });

    execute(link, { query: sampleQuery, variables }).subscribe(result => {
      const uri = fetchMock.lastUrl();
      expect(uri).toBe('data');
      done();
    });
  });
  it('prioritizes context uri over setup uri', done => {
    const variables = { params: 'stub' };
    const middleware = new ApolloLink((operation, forward) => {
      operation.setContext({
        uri: 'apollo',
      });
      return forward(operation);
    });
    const link = middleware.concat(
      createHttpLink({ uri: 'data', credentials: 'error' }),
    );

    execute(link, { query: sampleQuery, variables }).subscribe(result => {
      const uri = fetchMock.lastUrl();

      expect(uri).toBe('apollo');
      done();
    });
  });
  it('adds fetchOptions to the request from the setup', done => {
    const variables = { params: 'stub' };
    const link = createHttpLink({
      uri: 'data',
      fetchOptions: { signal: 'foo' },
    });

    execute(link, { query: sampleQuery, variables }).subscribe(result => {
      const signal = fetchMock.lastCall()[1].signal;
      expect(signal).toBe('foo');
      done();
    });
  });
  it('supports using a GET request', done => {
    const variables = { params: 'stub' };
    const link = createHttpLink({
      uri: 'data',
      fetchOptions: { method: 'GET' },
    });

    execute(link, { query: sampleQuery, variables }).subscribe(result => {
      const method = fetchMock.lastCall()[1].method;
      expect(method).toBe('GET');
      done();
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
    }).subscribe(result => {
      const method = fetchMock.lastCall()[1].method;
      expect(method).toBe('GET');
      done();
    });
  });
  it('adds fetchOptions to the request from the context', done => {
    const variables = { params: 'stub' };
    const middleware = new ApolloLink((operation, forward) => {
      operation.setContext({
        fetchOptions: {
          signal: 'foo',
        },
      });
      return forward(operation);
    });
    const link = middleware.concat(createHttpLink({ uri: 'data' }));

    execute(link, { query: sampleQuery, variables }).subscribe(result => {
      const signal = fetchMock.lastCall()[1].signal;
      expect(signal).toBe('foo');
      done();
    });
  });
  it('prioritizes context over setup', done => {
    const variables = { params: 'stub' };
    const middleware = new ApolloLink((operation, forward) => {
      operation.setContext({
        fetchOptions: {
          signal: 'foo',
        },
      });
      return forward(operation);
    });
    const link = middleware.concat(
      createHttpLink({ uri: 'data', fetchOptions: { signal: 'bar' } }),
    );

    execute(link, { query: sampleQuery, variables }).subscribe(result => {
      const signal = fetchMock.lastCall()[1].signal;
      expect(signal).toBe('foo');
      done();
    });
  });
});

describe('dev warnings', () => {
  it('warns if no fetch is present', done => {
    if (typeof fetch !== 'undefined') fetch = undefined;
    try {
      const link = createHttpLink({ uri: 'data' });
      done.fail("warning wasn't called");
    } catch (e) {
      expect(e.message).toMatch(/fetch is not found globally/);
      done();
    }
  });
  it('does not warn if no fetch is present but a fetch is passed', () => {
    expect(() => {
      const link = createHttpLink({ uri: 'data', fetch: () => {} });
    }).not.toThrow();
  });
  it('warns if apollo-fetch is used', done => {
    try {
      const mockFetch = {
        use: () => {},
        useAfter: () => {},
        batchUse: () => {},
        batchUseAfter: () => {},
      };
      const link = createHttpLink({ uri: 'data', fetch: mockFetch });
      done.fail("warning wasn't called");
    } catch (e) {
      expect(e.message).toMatch(/It looks like you're using apollo-fetch/);
      done();
    }
  });
});

describe('error handling', () => {
  const json = jest.fn(() => Promise.resolve({}));
  const fetch = jest.fn((uri, options) => {
    return Promise.resolve({ json });
  });
  it('throws an error if response code is > 300', done => {
    fetch.mockReturnValueOnce(Promise.resolve({ status: 400, json }));
    const link = createHttpLink({ uri: 'data', fetch });

    execute(link, { query: sampleQuery }).subscribe(
      result => {
        done.fail('error should have been thrown from the network');
      },
      e => {
        expect(e.parseError.message).toMatch(/Received status code 400/);
        expect(e.statusCode).toBe(400);
        done();
      },
    );
  });
  it('throws an error if empty response from the server ', done => {
    fetch.mockReturnValueOnce(Promise.resolve({ json }));
    json.mockReturnValueOnce(Promise.resolve({ body: 'boo' }));
    const link = createHttpLink({ uri: 'data', fetch });

    execute(link, { query: sampleQuery }).subscribe(
      result => {
        done.fail('error should have been thrown from the network');
      },
      e => {
        expect(e.parseError.message).toMatch(
          /Server response was missing for query 'SampleQuery'/,
        );
        done();
      },
    );
  });
  it('makes it easy to do stuff on a 401', done => {
    fetch.mockReturnValueOnce(Promise.resolve({ status: 401, json }));

    const middleware = new ApolloLink((operation, forward) => {
      return new Observable(ob => {
        const op = forward(operation);
        const sub = op.subscribe({
          next: ob.next.bind(ob),
          error: e => {
            expect(e.parseError.message).toMatch(/Received status code 401/);
            expect(e.statusCode).toEqual(401);
            ob.error(e);
            done();
          },
          complete: ob.complete.bind(ob),
        });

        return () => {
          sub.unsubscribe();
        };
      });
    });

    const link = middleware.concat(createHttpLink({ uri: 'data', fetch }));

    execute(link, { query: sampleQuery }).subscribe(
      result => {
        done.fail('error should have been thrown from the network');
      },
      () => {},
    );
  });
  it("throws if the body can't be stringified", done => {
    fetch.mockReturnValueOnce(Promise.resolve({ data: {}, json }));
    const link = createHttpLink({ uri: 'data', fetch });

    let b;
    const a = { b };
    b = { a };
    a.b = b;
    const variables = {
      a,
      b,
    };
    execute(link, { query: sampleQuery, variables }).subscribe(
      result => {
        done.fail('error should have been thrown from the link');
      },
      e => {
        expect(e.message).toMatch(/Payload is not serializable/);
        expect(e.parseError.message).toMatch(
          /Converting circular structure to JSON/,
        );
        done();
      },
    );
  });
  it('supports being cancelled and does not throw', done => {
    let called;
    class AbortController {
      signal: {};
      abort = () => {
        called = true;
      };
    }

    global.AbortController = AbortController;

    fetch.mockReturnValueOnce(Promise.resolve({ json }));
    json.mockReturnValueOnce(Promise.resolve({ data: { hello: 'world' } }));

    const link = createHttpLink({ uri: 'data', fetch });

    const sub = execute(link, { query: sampleQuery }).subscribe({
      next: result => {
        done.fail('result should not have been called');
      },
      error: e => {
        done.fail('error should not have been called');
      },
      complete: () => {
        done.fail('complete should not have been called');
      },
    });

    sub.unsubscribe();

    setTimeout(() => {
      delete global.AbortController;
      expect(called).toBe(true);
      done();
    }, 150);
  });
});
