import { assert } from 'chai';
// import * as sinon from 'sinon';
import HttpFetcher from '../src/httpFetcher';
import FetcherPromiseWrapper from '../src/fetcher-as-promise';
// import { print } from 'graphql';
import gql from 'graphql-tag';
import * as fetchMock from 'fetch-mock';

const sampleQuery = gql`
query SampleQuery {
  stub{
    id
  }
}
`;

describe('promiseFetcher', () => {

  const getData = {hello: 'world', method: 'GET'};
  const postData = {hello: 'world', method: 'POST'};
  const mockError = { throws: new TypeError('mock me') };

  const operation = {
    query: sampleQuery,
  };

  before(() => {
    fetchMock.get('begin:data', getData);
    fetchMock.post('begin:data', postData);
    fetchMock.get('begin:error', mockError);
  });

  after(() => {
    fetchMock.restore();
  });

  //TODO should use a mock implementaiton of a Fetcher
  it('completes a GET request', (done) => {
    let fetcherPromise = FetcherPromiseWrapper(new HttpFetcher({uri: 'data'}));
    fetcherPromise.request(operation).then((result) => {
      assert.equal(JSON.stringify(getData), JSON.stringify(result));
      done();
    });
  });

});
