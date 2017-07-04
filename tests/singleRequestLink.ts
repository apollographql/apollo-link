import { assert } from 'chai';
import * as sinon from 'sinon';
import { createHttpLink } from '../src/httpLink';
import OneTimeObservable from '../src/oneTimeObservable';
import { print } from 'graphql';
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
    assert.doesNotThrow(() => createHttpLink(''));
  });

  it('calls next and then complete', (done) => {
    const next = sinon.spy();
    const link = createHttpLink('data');
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
    const link = createHttpLink('error');
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
    const link = createHttpLink('error');
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

  it('complains when additional arguments to Operation', () => {
    const link = createHttpLink('data');
    assert.throws(() => link.request(<any>{
      error: 'cause throw',
    }));
  });

  it('fails to start after stop', () => {
    const link = createHttpLink('data');
    const observable = <OneTimeObservable>link.request({
      query: sampleQuery,
      operationName: 'SampleQuery',
    });
    observable.stop();
    assert.throws(observable.start);
  });

  it('fails to stop after termination', () => {
    const link = createHttpLink('data');
    const observable = <OneTimeObservable>link.request({
      query: sampleQuery,
      operationName: 'SampleQuery',
    });
    observable.stop();
    assert.throws(observable.stop);
  });

  it('unsubscribes without calling subscriber', (done) => {
    const link = createHttpLink('data');
    const observable = <OneTimeObservable>link.request({
      query: sampleQuery,
      operationName: 'SampleQuery',
    });
    const subscription = observable.subscribe(() => assert(false), () => assert(false), () => assert(false));
    subscription.unsubscribe();
    setTimeout(done, 50);
  });

  it('uses POST request on Mutation', (done) => {
    const next = sinon.spy();
    const link = createHttpLink('data');
    const observable = link.request({
      query: sampleMutation,
      operationName: 'SampleMutation',
    });
    observable.subscribe({
      next,
      error: (error) => assert(false),
      complete: () => {
        assert.equal(fetchMock.lastCall()[1]['method'], 'POST');
        assert(next.calledOnce);
        done();
      },
    });
  });

  it('passes all arguments to fetch uri for query', (done) => {
    const next = sinon.spy();
    const link = createHttpLink('data');
    const context = {info: 'stub'};
    const variables = {params: 'stub'};
    const operationName = 'sampleQuery';

    const observable = link.request({
      query: sampleQuery,
      operationName,
      context,
      variables,
    });
    observable.subscribe({
      next,
      error: (error) => assert(false),
      complete: () => {
        const uri: string = fetchMock.lastCall()[0];
        const params = uri.substr(uri.indexOf('?') + 1).split('&');
        const values = params.map(param => decodeURIComponent(param.substr(param.indexOf('=') + 1)));
        const keys  = params.map(param => param.substr(0, param.indexOf('=')));
        let body = {};
        for (let i = 0; i < keys.length; i++) {
          body[keys[i]] = values[i];
        }
        assert.equal(body['query'], print(sampleQuery));
        assert.deepEqual(JSON.parse(body['context']), context);
        assert.deepEqual(body['operationName'], operationName);
        assert.deepEqual(JSON.parse(body['variables']), variables);
        assert(next.calledOnce);
        done();
      },
    });
  });

  it('passes all arguments to fetch body for mutation', (done) => {
    const next = sinon.spy();
    const link = createHttpLink('data');
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
        assert(next.calledOnce);
        done();
      },
    });
  });

  it('calls multiple subscribers', (done) => {
    const link = createHttpLink('data');
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

  it('calls remaining subscribers after unsubscription', (done) => {
    const link = createHttpLink('data');
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
