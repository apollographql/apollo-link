import { assert } from 'chai';
// import * as sinon from 'sinon';
import { createHttpLink } from '../src/httpLink';
import { linkPromiseWrapper } from '../src/link-as-promise';
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

describe('link-as-promise', () => {

  const data = {hello: 'world'};
  const mockError = { throws: new TypeError('mock me') };

  const operation = {
    query: sampleQuery,
  };

  before(() => {
    fetchMock.post('begin:data', data);
    fetchMock.get('begin:error', mockError);
  });

  after(() => {
    fetchMock.restore();
  });

  //TODO should use a mock implementaiton of a Link
  it('completes a GET request', (done) => {
    let linkPromise = linkPromiseWrapper(createHttpLink('data'));
    linkPromise.request(operation).then((result) => {
      assert.equal(JSON.stringify(data), JSON.stringify(result));
      done();
    });
  });

});
