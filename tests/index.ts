import { assert } from 'chai';
import * as sinon from 'sinon';
import HttpFetcher from '../src/httpFetcher';
import { HttpObservable } from '../src/httpFetcher';
import { State } from '../src/types';
import gql from 'graphql-tag';
import * as fetchMock from 'fetch-mock';

const sampleQuery = gql`
query SampleQuery {
  stub{
    id
  }
}
`;

describe('HttpFetcher', () => {
  it('does not need any constructor arguments', () => {
    assert.doesNotThrow(() => new HttpFetcher());
  });

  it('calls next and then complete', (done) => {
    const next = sinon.spy();
    const data = {hello: 'world'};
    fetchMock.get('*', data);
    const fetcher = new HttpFetcher('', fetch);
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

    fetchMock.restore();
  });

  it('calls error when fetch fails', (done) => {

    const mockError = {throws: new TypeError('mock me')};
    fetchMock.get('*', mockError);
    const fetcher = new HttpFetcher('', fetch);
    const observable = fetcher.request({
      query: sampleQuery,
      operationName: 'SampleQuery',
    });
    observable.subscribe(
      (data) => assert(false),
      (error) => {
        assert.equal(error, mockError.throws);
        done();
      },
      () => { assert(false); done(); },
    );

    fetchMock.restore();
  });

  it('changes status to STOPPED after stop call', () => {
    const mockError = {throws: new TypeError('mock me')};
    fetchMock.get('*', mockError);
    const fetcher = new HttpFetcher('', fetch);
    const observable = <HttpObservable>fetcher.request({
      query: sampleQuery,
      operationName: 'SampleQuery',
    });
    observable.stop();
    assert.equal(observable.status().state, State.STOPPED);
    assert.equal(observable.status().numberSubscribers, 0);
  });

//future tests:
//complain with unknown args to request
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
