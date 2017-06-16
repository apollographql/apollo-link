import { assert } from 'chai';
import * as sinon from 'sinon';
import HttpFetcher from '../src/httpFetcher';
import { HttpObservable } from '../src/httpFetcher';
import { State } from '../src/types';
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
  stub(param: 1){
    id
  }
}
`;

describe('HttpFetcher', () => {
  const getData = {hello: 'world', method: 'GET'};
  const postData = {hello: 'world', method: 'POST'};
  const mockError = { throws: new TypeError('mock me') };

  before(() => {
    fetchMock.get('begin:data', getData);
    fetchMock.post('begin:data', postData);
    fetchMock.get('begin:error', mockError);
  });

  after(() => {
    fetchMock.restore();
  });

  it('does not need any constructor arguments', () => {
    assert.doesNotThrow(() => new HttpFetcher());
  });

  it('calls next and then complete', (done) => {
    const next = sinon.spy();
    const fetcher = new HttpFetcher('data', fetch);
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

  it('calls error when fetch fails', (done) => {

    const fetcher = new HttpFetcher('error', fetch);
    const observable = fetcher.request({
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

  it('complains when additional arguments to Operation', () => {
    const fetcher = new HttpFetcher('', fetch);
    assert.throws(() => fetcher.request(<any>{
      error: 'cause throw',
    }));
  });

  it('changes status to STOPPED after stop call', () => {
    const fetcher = new HttpFetcher('', fetch);
    const observable = <HttpObservable>fetcher.request({
      query: sampleQuery,
      operationName: 'SampleQuery',
    });
    observable.stop();
    assert.equal(observable.status().state, State.STOPPED);
    assert.equal(observable.status().numberSubscribers, 0);
  });

  it('fails to start after stop', () => {
    const fetcher = new HttpFetcher('', fetch);
    const observable = <HttpObservable>fetcher.request({
      query: sampleQuery,
      operationName: 'SampleQuery',
    });
    observable.stop();
    assert.throws(observable.start);
  });

  it('fails to stop after termination', () => {
    const fetcher = new HttpFetcher('', fetch);
    const observable = <HttpObservable>fetcher.request({
      query: sampleQuery,
      operationName: 'SampleQuery',
    });
    observable.stop();
    assert.throws(observable.stop);
  });

  it('call immediate next when terminated', (done) => {
    const fetcher = new HttpFetcher('', fetch);
    const observable = <HttpObservable>fetcher.request({
      query: sampleQuery,
      operationName: 'SampleQuery',
    });
    observable.stop();
    assert.doesNotThrow(
      observable.subscribe(() => assert(false), () => assert(false), done ));
  });

  it('unsubscribes without calling subscriber', (done) => {
    const fetcher = new HttpFetcher('data', fetch );
    const observable = <HttpObservable>fetcher.request({
      query: sampleQuery,
      operationName: 'SampleQuery',
    });
    const unsubscribe = observable.subscribe(() => assert(false), () => assert(false), () => assert(false));
    unsubscribe();
    setTimeout(done, 1000);
  });

  it('immediate stop no subsequent calling of subscriber', (done) => {
    const fetcher = new HttpFetcher('data', fetch );
    const observable = <HttpObservable>fetcher.request({
      query: sampleQuery,
      operationName: 'SampleQuery',
    });
    observable.subscribe(() => assert(false), () => assert(false));
    observable.stop();
    setTimeout(done, 1000);
  });

  it('uses POST request on Mutation', (done) => {
    const next = sinon.spy();
    const fetcher = new HttpFetcher('data', fetch);
    const observable = fetcher.request({
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
    const fetcher = new HttpFetcher('data', fetch);
    const context = {info: 'stub'};
    const variables = {params: 'stub'};
    const operationName = 'sampleQuery';

    const observable = fetcher.request({
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
        assert.equal(body['query'].replace(/\s/g, ''), print(sampleQuery).replace(/\s/g, ''));
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
    const fetcher = new HttpFetcher('data', fetch);
    const context = {info: 'stub'};
    const variables = {params: 'stub'};
    const operationName = 'SampleMutation';

    const observable = fetcher.request({
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
    const next = sinon.spy();
    const error = sinon.spy();
    const complete = sinon.spy();
    const fetcher = new HttpFetcher('data', fetch);
    const context = {info: 'stub'};
    const variables = {params: 'stub'};
    const operationName = 'SampleMutation';

    const subscriber = {
      next,
      error,
      complete,
    };

    const observable = fetcher.request({
      query: sampleMutation,
      operationName,
      context,
      variables,
    });
    observable.subscribe(subscriber);
    observable.subscribe(subscriber);

    setTimeout(() => {
      assert(next.calledTwice);
      assert(error.notCalled);
      assert(complete.calledTwice);
      done();
    }, 1000);
  });

  it('calls remaining subscribers after unsubscription', (done) => {
    const next = sinon.spy();
    const error = sinon.spy();
    const complete = sinon.spy();
    const fetcher = new HttpFetcher('data', fetch);
    const context = {info: 'stub'};
    const variables = {params: 'stub'};
    const operationName = 'SampleMutation';

    const subscriber = {
      next,
      error,
      complete,
    };

    const observable = fetcher.request({
      query: sampleMutation,
      operationName,
      context,
      variables,
    });
    observable.subscribe(subscriber);
    const unsubscribe = observable.subscribe(subscriber);
    unsubscribe();

    setTimeout(() => {
      assert(next.calledOnce);
      assert(error.notCalled);
      assert(complete.calledOnce);
      done();
    }, 1000);
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
