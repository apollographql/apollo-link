import { assert } from 'chai';
import * as sinon from 'sinon';
import BatchHttpFetcher from '../src/batchHttpFetcher';
import HttpObservable from '../src/httpObservable';
import { print } from 'graphql';
import gql from 'graphql-tag';
import * as fetchMock from 'fetch-mock';
import {
  Operation,
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

describe('BatchHttpFetcher', () => {
  const data = [{hello: 'world', method: 'POST'}];
  const typeError = new TypeError('mock me');
  const mockError = { throws: typeError };
  let subscriber;

  beforeEach(() => {
    fetchMock.post('begin:error', mockError);
    fetchMock.post('begin:data', data);

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
    assert.doesNotThrow(() => new BatchHttpFetcher());
  });

  it('complains when additional arguments to Operation', () => {
    const fetcher = new BatchHttpFetcher({uri: 'data', fetch});
    assert.throws(() => fetcher.request(<any>{
      error: 'cause throw',
    }));
  });

  it('does not callback to Observable after stop', () => {
    const fetcher = new BatchHttpFetcher({uri: 'data', fetch});
    const observable = <HttpObservable>fetcher.request({
      query: sampleQuery,
      operationName: 'SampleQuery',
    });
    observable.stop();
    observable.subscribe(subscriber);
    setTimeout(() => {
      assert(subscriber.next.notCalled);
      assert(subscriber.error.notCalled);
      assert(subscriber.complete.notCalled);
    }, 50);
  });

  it('unsubscribes without calling subscriber', (done) => {
    const fetcher = new BatchHttpFetcher({uri: 'data', fetch});
    const observable = <HttpObservable>fetcher.request({
      query: sampleQuery,
      operationName: 'SampleQuery',
    });
    const assertFalse = () => assert(false);
    const subscription = observable.subscribe(assertFalse, assertFalse, assertFalse);
    subscription.unsubscribe();
    setTimeout(done, 50);
  });


  const runQuery = (uri: string, results: object[] | object, operations: Operation[], {next, error, complete}) => {
    fetchMock.post(uri, results);

    const fetcher = new BatchHttpFetcher({
      uri,
      fetch,
    });

    const observables = operations.map((operation) => fetcher.request(operation));
    observables.forEach(observable => observable.subscribe(next, error, complete));

  };

  const verifyFetchArguments = (uri, operations) => {
    //Check arguments to fetch
    const args = fetchMock.lastCall(uri);
    const uriFetched = args[0];
    const options = args[1];
    assert.deepEqual(uri, uriFetched);
    assert.deepEqual(options.method, 'POST');
    assert.deepEqual(options.headers['Accept'], '*/*');
    //Check that body matches the operations
    const body = JSON.parse(options.body);
    body.forEach((operation, i) => {
      assert.deepEqual(operation.query, print(operations[i].query));
      assert.deepEqual(operation.operationName, operations[i].operationName);
      assert.deepEqual(operation.variables, operations[i].variables);
      assert.deepEqual(operation.context, operations[i].context);
    });
  };

  const verifyFetchCalledOnce = (uri) => {
    //Single call to fetch
    assert(fetchMock.called(uri));
    assert.deepEqual(fetchMock.calls(uri).length, 1);
  };

  const verifyFetch = (uri, operations) => {
    verifyFetchCalledOnce(uri);
    verifyFetchArguments(uri, operations);
  };

  describe('errors', () => {
    const verifyObservableErrors = (error, operations) => {

      //Check calls to Observable
      assert(subscriber.next.notCalled);

      assert(subscriber.error.callCount, operations.length);
      subscriber.error.alwaysCalledWithExactly(error.throws);

      assert(subscriber.complete.notCalled);
    };

    const verifyQuery = (uri, error, operations: Operation[]) => {

      verifyFetch(uri, operations);
      verifyObservableErrors(error, operations);
    };

    it('should handle error on single request', (done) => {

      const uri = 'one request one error';

      const error = { throws: 'some error' };

      const operation = {
        query: sampleQuery,
        operationName: 'SampleQuery',
      };

      const operations: Operation[] = [operation];

      runQuery(uri, error, operations, subscriber);

      setTimeout(() => {
        verifyQuery(uri, error, operations);
        done();
      }, 50);

    });
    it('should propagate same error to two requests with single fetch call', (done) => {

      const uri = 'two requests one error';

      const error = { throws: 'some error' };

      const operation = {
        query: sampleQuery,
        operationName: 'SampleQuery',
      };

      const operations: Operation[] = [operation];

      runQuery(uri, error, operations, subscriber);

      setTimeout(() => {
        verifyQuery(uri, error, operations);
        done();
      }, 50);

    });
  });

  describe('Successful Requests', () => {

    const verifyObservableResults = (results) => {

      //Check calls to Observable
      assert.deepEqual(subscriber.next.callCount, results.length);
      results.forEach((result, i) => {
        assert.deepEqual(subscriber.next.args[i][0], result);
      });

      assert(subscriber.error.notCalled);
      assert(subscriber.complete.callCount, results.length);

    };

    const verifyQuery = (uri, results, operations: Operation[]) => {

      verifyFetch(uri, operations);
      verifyObservableResults(results);
    };

    it('should complete a single request', (done) => {
      const uri = 'single';

      const results = [{ single: 'request' }];

      const operation = {
        query: sampleQuery,
        operationName: 'SampleQuery',
      };

      const operations: Operation[] = [operation];

      runQuery(uri, results, operations, subscriber);

      setTimeout(() => {
        verifyQuery(uri, results, operations);
        done();
      }, 50);

    });
    it('should complete two requests with one correct call to fetch', (done) => {

      const uri = 'double';

      const results = [
        { first: 'is the worst' },
        { second: 'is the best' },
      ];

      const operation = {
        query: sampleQuery,
        operationName: 'SampleQuery',
      };

      const operations: Operation[] = Array(2).fill(operation);

      runQuery(uri, results, operations, subscriber);

      setTimeout(() => {
        verifyQuery(uri, results, operations);
        done();
      }, 50);

    });
    it('should complete three requests with one correct call to fetch', (done) => {

      const uri = 'triple';

      const results = [
        { first: 'is the worst' },
        { second: 'is the best' },
        { third: 'is the one with the treasure chest' },
      ];

      const operation = {
        query: sampleQuery,
        operationName: 'SampleQuery',
      };

      const operations: Operation[] = Array(3).fill(operation);

      runQuery(uri, results, operations, subscriber);

      setTimeout(() => {
        verifyQuery(uri, results, operations);
        done();
      }, 50);

    });
  });

  describe('Multiple Subscribers', () => {
    it('calls multiple subscribers', (done) => {
      const fetcher = new BatchHttpFetcher({ uri: 'data', fetch });
      const context = { info: 'stub' };
      const variables = { params: 'stub' };
      const operationName = 'SampleMutation';


      const observable = fetcher.request({
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
      const fetcher = new BatchHttpFetcher({ uri: 'data', fetch });
      const context = { info: 'stub' };
      const variables = { params: 'stub' };
      const operationName = 'SampleMutation';

      const observable = fetcher.request({
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
  });
});
