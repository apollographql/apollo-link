import { Observable, ApolloLink, execute } from 'apollo-link';
import gql from 'graphql-tag';
import * as fetchMock from 'fetch-mock';

import { sharedHttpTest } from './sharedHttpTests';
import { HttpLink, createHttpLink } from '../httpLink';

const sampleQuery = gql`
  query SampleQuery {
    stub {
      id
    }
  }
`;

describe('HttpLink', () => {
  it('does not need any constructor arguments', () => {
    expect(() => new HttpLink()).not.toThrow();
  });

  const makePromise = res =>
    new Promise((resolve, reject) => setTimeout(() => resolve(res)));
  const data = { data: { hello: 'world' } };

  fetchMock.post('begin:data', makePromise(data));

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

  sharedHttpTest('HttpLink', createHttpLink);
});
