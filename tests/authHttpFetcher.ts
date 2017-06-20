import { assert } from 'chai';
import * as sinon from 'sinon';
import AuthHttpFetcher from '../src/authHttpFetcher';
import gql from 'graphql-tag';
import * as fetchMock from 'fetch-mock';

const sampleQuery = gql`
query SampleQuery {
  stub{
    id
  }
}
`;

describe('authHttpFetcher', () => {
  const authorized = {hello: 'world'};
  const unauthorized = {hello: 'world', status: 401};

  before(() => {
    fetchMock.post('begin:auth', authorized);
    fetchMock.get('begin:unauth', unauthorized);
  });

  after(() => {
    fetchMock.restore();
  });

  it('does not need any constructor arguments', () => {
    assert.doesNotThrow(() => new AuthHttpFetcher());
  });

  it('runs simple GET request', (done) => {

    const next = sinon.spy();
    const tokenGen = () => 'token';
    const fetcher = new AuthHttpFetcher('auth', tokenGen);
    const observable = fetcher.request({
      query: sampleQuery,
      operationName: 'SampleQuery',
    });
    //observableToPromise return a promise
    observable.subscribe({
      next,
      error: (error) => assert(false),
      complete: () => { assert(next.calledOnce); done(); },
    });
  });

});
