import { ApolloLink, execute } from 'apollo-link';
import { createApolloFetch } from 'apollo-fetch';
import { print } from 'graphql';
import gql from 'graphql-tag';
import * as fetchMock from 'fetch-mock';

import HttpLink from '../httpLink';

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
  const data = { hello: 'world', method: 'POST' };
  const mockError = { throws: new TypeError('mock me') };

  let subscriber;

  beforeEach(() => {
    fetchMock.post('begin:data', data);
    fetchMock.post('begin:error', mockError);

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
    const link = ApolloLink.from([new HttpLink()]);
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
    const context = { info: 'stub', includeExtensions: includeExtensions };
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
    const link = new HttpLink({ uri: 'data' });
    verifyRequest(link, () => verifyRequest(link, done, true));
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

  it('should add headers from the context', done => {
    const fetch = createApolloFetch({
      customFetch: (request, options) =>
        new Promise((resolve, reject) => {
          expect(options.headers['test']).toBeDefined();
          expect(options.headers.test).toEqual(context.headers.test);
          done();
        }),
    });
    const link = new HttpLink({ fetch });

    const context = {
      headers: {
        test: 'header',
      },
    };

    execute(link, { query: sampleQuery, context }).subscribe(() => {
      throw new Error();
    });
  });
});
