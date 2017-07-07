import { assert, expect } from 'chai';
import * as sinon from 'sinon';
import * as Links from '../src/links';
import ErrorObservable from './observables/errorObservable';
import SuccessObservable from './observables/successObservable';
import ColdObservable from './observables/coldObservable';
import MockLink from '../src/mockLink';
import { parse } from 'graphql';
import {
  FetchResult,
  Operation,
} from '../src/types';

const sampleQuery = `query SampleQuery{
  stub{
    id
  }
}`;

describe('Link static library', () => {

  describe('chain', () => {

    const uniqueOperation: Operation = {
      operationName: 'uniqueName',
    };

    it('throws an error on empty array', () => {
      assert.throws(() => Links.chain([]), 'Must have at least one link to form a chain');
    });

    it('can create chain of one', () => {
      assert.doesNotThrow(() => Links.chain([ new MockLink() ]));
    });

    it('can create chain of two', () => {
      assert.doesNotThrow(() => Links.chain([ new MockLink(), new MockLink() ]));
    });

    it('should receive result of one link', (done) => {
      const data: FetchResult = {
        data: {
          hello: 'world',
        },
      };
      const chain = Links.chain([ new MockLink(() => new SuccessObservable(data)) ]);
      const observable = chain.request(uniqueOperation);
      observable.subscribe({
        next: actualData => {
          assert.deepEqual(data, actualData);
        },
        error: expect.fail,
        complete: done,
      });
    });

    it('should accept sting query and pass AST to link', (done) => {

      const astOperation = {
        ...uniqueOperation,
        query: parse(sampleQuery),
      };

      const operation = {
        ...uniqueOperation,
        query: sampleQuery,
      };

      const stub = sinon.stub().withArgs(astOperation).callsFake((op) => {
        assert.deepEqual(astOperation, op);
        done();
      });

      const chain = Links.chain([ new MockLink(stub) ]);
      chain.request(operation);
    });

    it('should accept AST query and pass AST to link', (done) => {

      const astOperation = {
        ...uniqueOperation,
        query: parse(sampleQuery),
      };

      const stub = sinon.stub().withArgs(astOperation).callsFake((op) => {
        assert.deepEqual(astOperation, op);
        done();
      });

      const chain = Links.chain([ new MockLink(stub) ]);
      chain.request(astOperation);
    });

    it('should pass operation from one link to next with modifications', (done) => {
      const chain = Links.chain([
        new MockLink((op, forward) => forward({
          ...op,
          query: parse(sampleQuery),
        })),
        new MockLink((op) => {
          assert.deepEqual(<Operation>{...uniqueOperation, query: parse(sampleQuery) }, op);
          return done();
        }),
      ]);
      chain.request(uniqueOperation);

    });

    it('should pass result of one link to another with forward', (done) => {
      const data: FetchResult = {
        data: {
          hello: 'world',
        },
      };

      const chain = Links.chain([
        new MockLink((op, forward) => {
          const observable = forward(op);

          observable.subscribe({
            next: actualData => {
              assert.deepEqual(data, actualData);
            },
            error: expect.fail,
            complete: done,
          });

          return observable;
        }),
        new MockLink(() => new SuccessObservable(data)),
      ]);
      chain.request(uniqueOperation);
    });

    it('should receive final result of two link chain', (done) => {
      const data: FetchResult = {
        data: {
          hello: 'world',
        },
      };

      const chain = Links.chain([
        new MockLink((op, forward) => {
          const observable = forward(op);

          const coldObservable = new ColdObservable(() => {
            observable.subscribe({
                next: actualData => {
                    assert.deepEqual(data, actualData);
                    coldObservable.onNext({
                      data: {
                        ...actualData.data,
                        modification: 'unique',
                      },
                    });
                },
                error: coldObservable.onError,
                complete: coldObservable.onComplete,
            });
          });
          return coldObservable;
        }),
        new MockLink(() => new SuccessObservable(data)),
      ]);

      const result = chain.request(uniqueOperation);

      result.subscribe({
        next: modifiedData => {
            assert.deepEqual({
              data: {
                ...data.data,
                modification: 'unique',
              },
            }, modifiedData);
        },
        error: expect.fail,
        complete: done,
      });

    });

  });

  describe('asPromiseWrapper', () => {
    const operation = {
      operationName: 'uniqueName',
    };
    const data = {
      data: {
        hello: 'world',
      },
    };
    const error = new Error('I always error');

    it('return next call as Promise resolution', () => {
      const stubRequest = sinon.stub().withArgs(operation).callsFake(() => new SuccessObservable(data));

      let linkPromise = Links.asPromiseWrapper({
        request: stubRequest,
      });

      return linkPromise.request(operation)
        .then(result => assert.deepEqual(data, result));
    });

    it('return error call as Promise resolution', () => {
       const stubRequest = sinon.stub().withArgs(operation).callsFake(() => new ErrorObservable(error));

      let linkPromise = Links.asPromiseWrapper({
        request: stubRequest,
      });

      return linkPromise.request(operation)
        .then(expect.fail)
        .catch(actualError => assert.deepEqual(error, actualError));
    });
  });

});
