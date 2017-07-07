import { assert } from 'chai';
import * as sinon from 'sinon';
import HttpLink, {
  createHttpLink,
} from '../src/httpLink';

import OneTimeObservable from '../src/oneTimeObservable';
import { print } from 'graphql';
import gql from 'graphql-tag';
import * as fetchMock from 'fetch-mock';
import {
  ApolloLink,
} from '../src/types';

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

describe('HttpLink', () => {
  const getData = {hello: 'world', method: 'GET'};
  const postData = {hello: 'world', method: 'POST'};
  const mockError = { throws: new TypeError('mock me') };

  let subscriber;

  beforeEach(() => {
    fetchMock.get('begin:data', getData);
    fetchMock.post('begin:data', postData);
    fetchMock.get('begin:error', mockError);
    fetchMock.post('begin:error', mockError);

    const next = sinon.spy();
    const error = sinon.spy();
    const complete = sinon.spy();

    subscriber = {
      next,
      error,
      complete,
    };
  });

  afterEach(() => {
    fetchMock.restore();
  });

  it('does not need any constructor arguments', () => {
    assert.doesNotThrow(() => new HttpLink());
  });

  it('does not need any arguments to wrapped constructor', () => {
    assert.doesNotThrow(() => createHttpLink());
  });

  it('calls next and then complete', (done) => {
    const next = sinon.spy();
    const link = createHttpLink({uri: 'data'});
    const observable = link.request({
      query: sampleQuery,
      operationName: 'SampleQuery',
    });
    observable.subscribe({
      next,
      error: (error) => assert(false),
      complete: () => { assert(next.calledOnce); done(); },
    });
  });

  it('calls error when fetch fails', (done) => {
    const link = createHttpLink({uri: 'error'});
    const observable = link.request({
      query: sampleQuery,
    });
    observable.subscribe(
      (result) => assert(false),
      (error) => {
        assert.equal(error, mockError.throws);
        done();
      },
      () => { assert(false); done(); },
    );
  });

  it('calls error when fetch fails', (done) => {
    const link = createHttpLink({uri: 'error'});
    const observable = link.request({
      query: sampleMutation,
    });
    observable.subscribe(
      (result) => assert(false),
      (error) => {
        assert.equal(error, mockError.throws);
        done();
      },
      () => { assert(false); done(); },
    );
  });

  it('fails to start after stop', () => {
    const link = createHttpLink({uri: 'data'});
    const observable = <OneTimeObservable>link.request({
      query: sampleQuery,
      operationName: 'SampleQuery',
    });
    observable.stop();
    assert.throws(observable.start);
  });

  it('fails to stop after termination', () => {
    const link = createHttpLink({uri: 'data'});
    const observable = <OneTimeObservable>link.request({
      query: sampleQuery,
      operationName: 'SampleQuery',
    });
    observable.stop();
    assert.throws(observable.stop);
  });

  it('unsubscribes without calling subscriber', (done) => {
    const link = createHttpLink({uri: 'data'});
    const observable = <OneTimeObservable>link.request({
      query: sampleQuery,
      operationName: 'SampleQuery',
    });
    const subscription = observable.subscribe(() => assert(false), () => assert(false), () => assert(false));
    subscription.unsubscribe();
    assert(subscription.closed);
    setTimeout(done, 50);
  });

  it('subscriber after observable termination gets immediate completion', (done) => {
    const link = createHttpLink({
      uri: 'data',
    });
    const observable = <OneTimeObservable>link.request({
      query: sampleQuery,
      operationName: 'SampleQuery',
    });
    const subscription = observable.subscribe(() => assert(false), () => assert(false), () => assert(false));
    subscription.unsubscribe();
    assert(subscription.closed);

    observable.subscribe(() => assert(false), () => assert(false), done);
  });

  it('subscription after observable termination should be closed and unsubscribe should have no effects', () => {
    const link = createHttpLink({
      uri: 'data',
    });
    const observable = <OneTimeObservable>link.request({
      query: sampleQuery,
      operationName: 'SampleQuery',
    });
    let subscription = observable.subscribe(() => assert(false), () => assert(false), () => assert(false));
    subscription.unsubscribe();
    assert(subscription.closed);

    subscription = observable.subscribe({});
    assert(subscription.closed);
    assert.doesNotThrow(subscription.unsubscribe);
    assert(subscription.closed);
  });


  const verifyRequest = (link: ApolloLink, after: () => void) => {
    const next = sinon.spy();
    const context = {info: 'stub'};
    const variables = {params: 'stub'};
    const operationName = 'SampleMutation';

    const observable = link.request({
      query: sampleMutation,
      operationName,
      context,
      variables,
    });
    observable.subscribe({
      next,
      error: (error) => assert(false),
      complete: () => {
        const body = JSON.parse(fetchMock.lastCall()[1]['body']);
        assert.equal(body['query'], print(sampleMutation));
        assert.deepEqual(body['context'], context);
        assert.deepEqual(body['operationName'], operationName);
        assert.deepEqual(body['variables'], variables);

        assert.equal(next.callCount, 1);

        after();
      },
    });
  };

  it('passes all arguments to multiple fetch body', (done) => {
    const link = createHttpLink({uri: 'data'});
    verifyRequest(link, () => verifyRequest(link, done));
  });

  it('calls multiple subscribers', (done) => {
    const link = createHttpLink({uri: 'data'});
    const context = {info: 'stub'};
    const variables = {params: 'stub'};
    const operationName = 'SampleMutation';

    const observable = link.request({
      query: sampleMutation,
      operationName,
      context,
      variables,
    });
    observable.subscribe(subscriber);
    observable.subscribe(subscriber);

    setTimeout(() => {
      assert(subscriber.next.calledTwice);
      assert(subscriber.error.notCalled);
      assert(subscriber.complete.calledTwice);
      done();
    }, 50);
  });

  it('calls remaining subscribers after unsubscribe', (done) => {
    const link = createHttpLink({uri: 'data'});
    const context = {info: 'stub'};
    const variables = {params: 'stub'};
    const operationName = 'SampleMutation';

    const observable = link.request({
      query: sampleMutation,
      operationName,
      context,
      variables,
    });
    observable.subscribe(subscriber);
    const subscription = observable.subscribe(subscriber);
    subscription.unsubscribe();

    setTimeout(() => {
      assert(subscriber.next.calledOnce);
      assert(subscriber.error.notCalled);
      assert(subscriber.complete.calledOnce);
      done();
    }, 50);
  });

//future tests:
//http-link calls fetch with proper arguments
//   simple
//   proper uri
//   metadata
//   variables
//   operationName
//   etc..
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
