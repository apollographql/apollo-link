import { ApolloLink, execute, Observable, makePromise } from 'apollo-link';
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
    const f = global.fetch;
    global.fetch = () => {};

    expect(() => new BatchHttpLink()).not.toThrow();

    global.fetch = f;
  });

  it('should pass a batchOptions to HttpLink and delegate to HttpLink', () => {
    jest.mock('apollo-link-http', () => {
      const request = jest.fn();
      return {
        createHttpLink: jest.fn(() => ({ request })),
      };
    });

    const createHttpLink = require('apollo-link-http').createHttpLink;
    const LocalScopedLink = require('../batchHttpLink').BatchHttpLink;

    const reduceOptions = () => {};

    const batch = new LocalScopedLink({
      batchInterval: 20,
      batchMax: 20,
      reduceOptions,
    });

    const { batchOptions } = createHttpLink.mock.calls[0][0];
    expect(batchOptions.batchInterval).toBe(20);
    expect(batchOptions.batchMax).toBe(20);
    expect(batchOptions.reduceOptions).toEqual(reduceOptions);

    const { request } = createHttpLink();
    execute(batch, operation);
    expect(request).toBeCalled();
  });
});
