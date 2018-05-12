import gql from 'graphql-tag';
import {
  execute,
  ApolloLink,
  Observable,
  FetchResult,
  fromError,
} from 'apollo-link';
import waitFor from 'wait-for-observables';

import { interceptLink } from '../';

const query = gql`
  query Sample {
    sample {
      id
    }
  }
`;

const standardError = new Error('I never work');

describe('interceptLink', () => {
  it('passes through results by default', async () => {
    const intercept = interceptLink(() => ({}));
    const data = { data: { hello: 'world' } };
    const stub = jest.fn(() => Observable.of(data));
    const link = ApolloLink.from([intercept, stub]);

    const [{ values }] = await waitFor(execute(link, { query }));
    expect(values).toEqual([data]);
    expect(stub).toHaveBeenCalledTimes(1);
  });

  it('passes through errors by default', async () => {
    const intercept = interceptLink(() => ({}));
    const stub = jest.fn(() => fromError(standardError));
    const link = ApolloLink.from([intercept, stub]);

    const [{ error }] = await waitFor(execute(link, { query }));
    expect(error).toEqual(standardError);
    expect(stub).toHaveBeenCalledTimes(1);
  });

  it('passes the GraphQL operation to the factory function', async () => {
    let operation;
    const intercept = interceptLink(op => {
      operation = op;
      return {};
    });

    const data = { data: { hello: 'world' } };
    const stub = jest.fn(() => Observable.of(data));
    const link = ApolloLink.from([intercept, stub]);

    await waitFor(execute(link, { query }));
    expect(operation).not.toBeNull();
    expect(operation.operationName).toEqual('Sample');
  });

  it('delivers different data from the interceptor', async () => {
    const data = { data: { hello: 'world' } };
    const replacedData = { data: { goodnight: 'moon' } };
    const intercept = interceptLink(() => ({
      next: (value, { next }) => next(replacedData),
    }));
    const stub = jest.fn(() => Observable.of(data));
    const link = ApolloLink.from([intercept, stub]);

    const [{ values }] = await waitFor(execute(link, { query }));
    expect(values).toEqual([replacedData]);
    expect(stub).toHaveBeenCalledTimes(1);
  });

  it('delivers a different error from the interceptor', async () => {
    const replacedError = new Error('I also never work');
    const intercept = interceptLink(() => ({
      error: (err, { error }) => error(replacedError),
    }));
    const data = { data: { hello: 'world' } };
    const stub = jest.fn(() => fromError(standardError));
    const link = ApolloLink.from([intercept, stub]);

    const [{ error }] = await waitFor(execute(link, { query }));
    expect(error).toEqual(replacedError);
    expect(stub).toHaveBeenCalledTimes(1);
  });

  it('can deliver an error from the next handler', async () => {
    const data = { data: { hello: 'world' } };
    const intercept = interceptLink(() => ({
      next: (value, { error }) => error(standardError),
    }));
    const stub = jest.fn(() => Observable.of(data));
    const link = ApolloLink.from([intercept, stub]);

    const [{ error }] = await waitFor(execute(link, { query }));
    expect(error).toEqual(standardError);
    expect(stub).toHaveBeenCalledTimes(1);
  });

  it('can deliver data from the error handler', async () => {
    const data = { data: { hello: 'world' } };
    const intercept = interceptLink(() => ({
      error: (err, { complete, next }) => {
        next(data);
        complete(); // XXX: this is necessary for tests, but will it be for Apollo Client?
      },
    }));
    const stub = jest.fn(() => fromError(standardError));
    const link = ApolloLink.from([intercept, stub]);

    const [{ values }] = await waitFor(execute(link, { query }));
    expect(values).toEqual([data]);
    expect(stub).toHaveBeenCalledTimes(1);
  });

  it('calls the canceled interceptor method', async () => {
    const canceled = jest.fn(() => {});
    const intercept = interceptLink(() => ({ canceled }));
    const data = { data: { hello: 'world' } };
    const stub = jest.fn(() => fromError(standardError));
    const link = ApolloLink.from([intercept, stub]);

    await waitFor(execute(link, { query }));
    expect(canceled).toHaveBeenCalledTimes(1);
  });
});
