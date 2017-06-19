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

const sampleMutation = gql`
mutation SampleMutation {
  stub(param: "value"){
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

  it('does not need any constructor arguments', () => {
    assert.doesNotThrow(() => new AuthHttpFetcher());
  });


//future tests:
//http-fetcher calls fetch with proper arguments
//   simple
//   proper uri
//   metadata
//   variables
//   operationName
//   etcc..
//argument is undefinded, then not passed to the request
//  operationName

//query -> GET and mutation -> POST

//throw error on subscriptions?

//status() returns correct values during life cycle
//  cold?
//  number subscribers
//  started? has been called
//  stopped? has been called explicitly
//  completed? has notified
//  errored? has notified

//test after completion all subsequent subscribes call complete to avoid memory leaks (other option is error)

//error called on unsuccessful fetch and next and complete uncalled
//calls next and complete on subscribers on successful fetch and error uncalled
//fetch is not called when no subscribe call
//fetch is called after start is called
//  if fetch hasn't been called then fail after short timeout

//Can unsubscribe and never get any more events

//call stop and none of the Subscriber is called again

//multiple subscribers and all are called each success/failure
//multiple subscribers -> others still get events after an unsubscribe

//multiple queries
});
