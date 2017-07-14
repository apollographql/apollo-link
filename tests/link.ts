import { assert, expect } from 'chai';
import * as sinon from 'sinon';
import { execute, asPromiseWrapper, ApolloLink } from '../src/link';
import * as Observable from 'zen-observable';
import MockLink from '../src/mockLink';
import SetContextLink from '../src/setContextLink';
import { parse } from 'graphql';
import {
  FetchResult,
  Operation,
} from '../src/types';

import {
  testLinkResults,
} from './utils/testingUtils';

const sampleQuery = `query SampleQuery{
  stub{
    id
  }
}`;

describe('ApolloLink(abstract class)', () => {

  describe('concat', () => {
    it('should concat a function', (done) => {
      const returnOne = new SetContextLink({ add: 1 });
      const link = returnOne.concat((operation, forward) => Observable.of({ data: operation.context.add }));

      testLinkResults({
        link,
        results: [1],
        done,
      });
    });

    it('should concat a Link', (done) => {
      const returnOne = new SetContextLink({ add: 1 });
      const mock = new MockLink((op) => Observable.of({ data: op.context.add }));
      const link = returnOne.concat(mock);

      testLinkResults({
        link,
        results: [1],
        done,
      });
    });

    it('should concat a Link and function', (done) => {
      const returnOne = new SetContextLink({ add: 1 });
      const mock = new MockLink((op, forward) => {
        let _op = {
          ...op,
          context: {
            add: op.context.add + 2,
          },
        };
        return forward(_op);
      });
      const link = returnOne.concat(mock).concat((op) => {
        return Observable.of({ data: op.context.add });
      });

      testLinkResults({
        link,
        results: [3],
        done,
      });
    });

    it('should concat a function and Link', (done) => {
      const returnOne = new SetContextLink({ add: 1 });
      const mock = new MockLink((op, forward) => Observable.of({ data: op.context.add }));

      const link = returnOne.concat((operation, forward) => {
        operation = {
          ...operation,
          context: {
            add: operation.context.add + 2,
          },
        };
        return forward(operation);
      }).concat(mock);
      testLinkResults({
        link,
        results: [3],
        done,
      });
    });

    it('should concat two functions', (done) => {
      const returnOne = new SetContextLink({ add: 1 });
      const link = returnOne.concat((operation, forward) => {
        operation = {
          ...operation,
          context: {
            add: operation.context.add + 2,
          },
        };
        return forward(operation);
      }).concat((op, forward) => Observable.of({ data: op.context.add }));
      testLinkResults({
        link,
        results: [3],
        done,
      });
    });

    it('should concat two Links', (done) => {
      const returnOne = new SetContextLink({ add: 1 });
      const mock1 = new MockLink((operation, forward) => {
        operation = {
          ...operation,
          context: {
            add: operation.context.add + 2,
          },
        };
        return forward(operation);
      });
      const mock2 = new MockLink((op, forward) => Observable.of({ data: op.context.add }));

      const link = returnOne.concat(mock1).concat(mock2);
      testLinkResults({
        link,
        results: [3],
        done,
      });
    });

    it('should return an link that can be concat\'d multiple times', (done) => {
      const returnOne = new SetContextLink({ add: 1 });
      const mock1 = new MockLink((operation, forward) => {
        operation = {
          ...operation,
          context: {
            add: operation.context.add + 2,
          },
        };
        return forward(operation);
      });
      const mock2 = new MockLink((op, forward) => Observable.of({ data: op.context.add + 2 }));
      const mock3 = new MockLink((op, forward) => Observable.of({ data: op.context.add + 3 }));
      const link = returnOne.concat(mock1);

      testLinkResults({
        link: link.concat(mock2),
        results: [5],
      });
      testLinkResults({
        link: link.concat(mock3),
        results: [6],
        done,
      });
    });

  });

  describe('split', () => {
    it('should split two functions', (done) => {
      const context = { add: 1 };
      const returnOne = new SetContextLink(context);
      const link1 = returnOne.concat((operation, forward) => Observable.of({ data: operation.context.add + 1 }));
      const link2 = returnOne.concat((operation, forward) => Observable.of({ data: operation.context.add + 2 }));
      const link = returnOne.split(
        (operation) => operation.context.add === 1,
        link1,
        link2,
      );

      testLinkResults({
        link,
        results: [2],
      });

      context.add = 2;

      testLinkResults({
        link,
        results: [4],
        done,
      });
    });

    it('should split two Links', (done) => {
      const context = { add: 1 };
      const returnOne = new SetContextLink(context);
      const link1 = returnOne.concat(
        new MockLink((operation, forward) => Observable.of({ data: operation.context.add + 1 })),
      );
      const link2 = returnOne.concat(
        new MockLink((operation, forward) => Observable.of({ data: operation.context.add + 2 })),
      );
      const link = returnOne.split(
        (operation) => operation.context.add === 1,
        link1,
        link2,
      );

      testLinkResults({
        link,
        results: [2],
      });

      context.add = 2;

      testLinkResults({
        link,
        results: [4],
        done,
      });
    });

    it('should split a link and a function', (done) => {
      const context = { add: 1 };
      const returnOne = new SetContextLink(context);
      const link1 = returnOne.concat((operation, forward) => Observable.of({ data: operation.context.add + 1 }));
      const link2 = returnOne.concat(
        new MockLink((operation, forward) => Observable.of({ data: operation.context.add + 2 })),
      );
      const link = returnOne.split(
        (operation) => operation.context.add === 1,
        link1,
        link2,
      );

      testLinkResults({
        link,
        results: [2],
      });

      context.add = 2;

      testLinkResults({
        link,
        results: [4],
        done,
      });
    });

  });

  describe('empty', () => {
    it('should returns an immediately completed Observable', (done) => {
      testLinkResults({
        link: ApolloLink.empty(),
        done,
      });
    });
  });
});

describe('Link static library', () => {

  describe('from', () => {

    const uniqueOperation: Operation = {
      query: parse(sampleQuery),
      context: 'uniqueName',
    };

    it('should create an observable that completes when passed an empty array', (done) => {
      const observable = ApolloLink.from([]).request({query: parse(sampleQuery)});
      observable.subscribe(
        () => assert(false, 'should not call next'),
        () => assert(false, 'should not call error'),
        done,
      );
    });

    it('can create chain of one', () => {
      assert.doesNotThrow(() => ApolloLink.from([ new MockLink() ]));
    });

    it('can create chain of two', () => {
      assert.doesNotThrow(() => ApolloLink.from([ new MockLink(), new MockLink() ]));
    });

    it('should receive result of one link', (done) => {
      const data: FetchResult = {
        data: {
          hello: 'world',
        },
      };
      const chain = ApolloLink.from([ new MockLink(() => Observable.of(data)) ]);
      const observable = execute(chain, uniqueOperation);
      observable.subscribe({
        next: actualData => {
          assert.deepEqual(data, actualData);
        },
        error: () => expect.fail(),
        complete: () => done(),
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

      const chain = ApolloLink.from([ new MockLink(stub) ]);
      execute(chain, operation);
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

      const chain = ApolloLink.from([ new MockLink(stub) ]);
      execute(chain, astOperation);
    });

    it('should pass operation from one link to next with modifications', (done) => {
      const chain = ApolloLink.from([
        new MockLink((op, forward) => forward({
          ...op,
          query: parse(sampleQuery),
        })),
        new MockLink((op) => {
          assert.deepEqual(<Operation>{...uniqueOperation, query: parse(sampleQuery) }, op);
          return done();
        }),
      ]);
      execute(chain, uniqueOperation);
    });

    it('should pass result of one link to another with forward', (done) => {
      const data: FetchResult = {
        data: {
          hello: 'world',
        },
      };

      const chain = ApolloLink.from([
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
        new MockLink(() => Observable.of(data)),
      ]);
      execute(chain, uniqueOperation);
    });

    it('should receive final result of two link chain', (done) => {
      const data: FetchResult = {
        data: {
          hello: 'world',
        },
      };

      const chain = ApolloLink.from([
        new MockLink((op, forward) => {
          const observable = forward(op);

          return new Observable(observer => {
            observable.subscribe({
                next: actualData => {
                    assert.deepEqual(data, actualData);
                    observer.next({
                      data: {
                        ...actualData.data,
                        modification: 'unique',
                      },
                    });
                },
                error: (error) => observer.error(error),
                complete: () => observer.complete(),
            });
          });
        }),
        new MockLink(() => Observable.of(data)),
      ]);

      const result = execute(chain, uniqueOperation);

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

    it('should chain together a function with links', (done) => {
      const add1 = (operation, forward) => {
        operation.context++;
        return forward(operation);
      };
      const add1Link = new MockLink((operation, forward) => {
        operation.context++;
        return forward(operation);
      });

      const link = ApolloLink.from([
        add1,
        add1,
        add1Link,
        add1,
        add1Link,
        (operation) => Observable.of({data: operation.context}),
      ]);
      testLinkResults({
        link,
        results: [5],
        context: 0,
        done,
      });
    });
  });

  describe('split', () => {
    it('should create filter when single link passed in', (done) => {
      const link = ApolloLink.split(
        (operation) => operation.context,
        (operation, forward) => Observable.of({ data: 1 }),
      );

      let context = true;

      testLinkResults({
        link,
        results: [1],
        context,
      });

      context = false;

      testLinkResults({
        link,
        results: [],
        context,
        done,
      });
    });

    it('should split two functions', (done) => {
      const link = ApolloLink.split(
        (operation) => operation.context,
        (operation, forward) => Observable.of({ data: 1 }),
        (operation, forward) => Observable.of({ data: 2 }),
      );

      let context = true;

      testLinkResults({
        link,
        results: [1],
        context,
      });

      context = false;

      testLinkResults({
        link,
        results: [2],
        context,
        done,
      });
    });

    it('should split two Links', (done) => {
      const link = ApolloLink.split(
        (operation) => operation.context,
        (operation, forward) => Observable.of({ data: 1 }),
        new MockLink((operation, forward) => Observable.of({ data: 2 })),
      );

      let context = true;

      testLinkResults({
        link,
        results: [1],
        context,
      });

      context = false;

      testLinkResults({
        link,
        results: [2],
        context,
        done,
      });

    });

    it('should split a link and a function', (done) => {
      const link = ApolloLink.split(
        (operation) => operation.context,
        (operation, forward) => Observable.of({ data: 1 }),
        new MockLink((operation, forward) => Observable.of({ data: 2 })),
      );

      let context = true;

      testLinkResults({
        link,
        results: [1],
        context,
      });

      context = false;

      testLinkResults({
        link,
        results: [2],
        context,
        done,
      });

    });

  });

  describe('execute', () => {
    it('should return an empty observable when a link returns null', (done) => {
      testLinkResults({
        link: new MockLink(),
        results: [],
        done,
      });
    });

    it('should return an empty observable when a link is empty', (done) => {
      testLinkResults({
        link: ApolloLink.empty(),
        results: [],
        done,
      });
    });

    it('should return an empty observable when a concat\'d link returns null', (done) => {
      const link = new MockLink((operation, forward) => {
        return forward(operation);
      }).concat(() => null);
      testLinkResults({
        link,
        results: [],
        done,
      });
    });

    it('should return an empty observable when a split link returns null', (done) => {
      let context = true;
      const link = new SetContextLink(context).split(
        (op) => op.context,
        () => Observable.of(),
        () => null,
      );
      testLinkResults({
        link,
        results: [],
      });
      context = false;
      testLinkResults({
        link,
        results: [],
        done,
      });
    });
  });

  describe('asPromiseWrapper', () => {
    const operation = {
      query: parse(sampleQuery),
      context: 'uniqueName',
    };
    const data = {
      data: {
        hello: 'world',
      },
    };
    const error = new Error('I always error');

    it('return next call as Promise resolution', () => {
      const linkPromise = asPromiseWrapper(() => Observable.of(data));

      return linkPromise.request(operation)
        .then(result => assert.deepEqual(data, result));
    });

    it('return error call as Promise rejection', () => {
      const linkPromise = asPromiseWrapper(() => new Observable(observer => {
        throw error;
      }));

      return linkPromise.request(operation)
        .then(expect.fail)
        .catch(actualError => assert.deepEqual(error, actualError));
    });
  });
});

describe('Terminating links', () => {
  const _warn = console.warn;
  const warningStub = sinon.stub().callsFake(warning => {
    assert.deepEqual(warning.message, `You are concating to a terminating link, which will have no effect`)
  });

  before(() => {
    console.warn = warningStub;
  });

  beforeEach(() => {
    warningStub.reset();
  });

  after(() => {
    console.warn = _warn;
  });

  describe('concat', () => {
    it('should warn if attempting to concat to a terminating Link from function', () => {
      const link = ApolloLink.from([(operation) => Observable.of({ data: 'yo' })]);
      assert.deepEqual(link.concat((operation, forward) => forward(operation)), link);
      assert(warningStub.calledOnce);
      assert.deepEqual(warningStub.firstCall.args[0].link, link);
    });

    it('should warn if attempting to concat to a terminating Link', () => {
      const link = new MockLink((operation) => Observable.of());
      assert.deepEqual(link.concat((operation, forward) => forward(operation)), link);
      assert(warningStub.calledOnce);
      assert.deepEqual(warningStub.firstCall.args[0].link, link);
    });

    it('should not warn if attempting concat a terminating Link at end', () => {
      const link = new MockLink((operation, forward) => forward(operation));
      link.concat((operation) => Observable.of());
      assert(warningStub.notCalled);
    });
  });

  describe('split', () => {
    it('should not warn if attempting to split a terminating and non-terminating Link', () => {
      const split = ApolloLink.split(
        () => true,
        (operation) => Observable.of({ data: 'yo' }),
        (operation, forward) => forward(operation),
      );
      split.concat((operation, forward) => forward(operation));
      assert(warningStub.notCalled);
    });

    it('should warn if attempting to concat to split two terminating links', () => {
      const split = ApolloLink.split(
        () => true,
        (operation) => Observable.of({ data: 'yo' }),
        (operation) => Observable.of({ data: 'yo' }),
      );
     assert.deepEqual(split.concat((operation, forward) => forward(operation)), split);
      assert(warningStub.calledOnce);
    });
  });

  describe('from', () => {
    it('should not warn if attempting to form a terminating then non-terminating Link', () => {
      ApolloLink.from([
        (operation, forward) => forward(operation),
        (operation) => Observable.of({ data: 'yo' }),
      ]);
      assert(warningStub.notCalled);
    });

    it('should warn if attempting to add link after termination', () => {
      ApolloLink.from([
        (operation, forward) => forward(operation),
        (operation) => Observable.of({ data: 'yo' }),
        (operation, forward) => forward(operation),
      ]);
      assert(warningStub.calledOnce);
    });

    it('should warn if attempting to add link after termination', () => {
      ApolloLink.from([
        (operation, forward) => forward(operation),
        (operation) => Observable.of({ data: 'yo' }),
        (operation, forward) => forward(operation),
      ]);
      assert(warningStub.calledOnce);
    });
  });

  describe('warning', () => {
    it('should include link that terminates', () => {
      const terminatingLink = new MockLink((operation) => Observable.of({ data: 'yo' }));
      ApolloLink.from([
        (operation, forward) => forward(operation),
        (operation, forward) => forward(operation),
        terminatingLink,
        (operation, forward) => forward(operation),
        (operation, forward) => forward(operation),
        (operation) => Observable.of({ data: 'yo' }),
        (operation, forward) => forward(operation),
      ]);
      assert(warningStub.called);
    });
  });
});
