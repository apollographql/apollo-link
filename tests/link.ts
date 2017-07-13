import { assert, expect } from 'chai';
import * as sinon from 'sinon';
import * as Links from '../src/link';
const ApolloLink = Links.ApolloLink;
import * as Observable from 'zen-observable';
import MockLink from '../src/mockLink';
import SetContextLink from '../src/setContextLink';
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

const checkCalls = (calls, results) => {
  assert.deepEqual(calls.length, results.length);
  calls.map((call, i) => assert.deepEqual(call.args[0].data, results[i]));
};

interface TestResultType {
  link;
  results?: any[];
  query?: string;
  done?: () => void;
  context?: any;
}

const testLinkResults = (params: TestResultType) => {
  const { link, context } = params;
  const results = params.results || [];
  const query = params.query || sampleQuery;
  const done = params.done || (() => void 0);

  const spy = sinon.spy();
  Links.execute(link, { query, context }).subscribe({
    next: spy,
    error: error => {
      assert(error, results.pop());
      checkCalls(spy.getCalls(), results);
      if (done) {
        done();
      }
    },
    complete: () => {
      checkCalls(spy.getCalls(), results);
      if (done) {
        done();
      }
    },
  });
};

describe('concat', () => {
  it('should concat a function', (done) => {
    const returnOne = new SetContextLink({ add: 1 });
    const link = returnOne.concat((operation, forward) => Observable.of({data: operation.context.add}));

    testLinkResults({
      link,
      results: [1],
      done,
    });
  });

  it('should concat a Link', (done) => {
    const returnOne = new SetContextLink({ add: 1 });
    const mock = new MockLink((op) => Observable.of({data: op.context.add}));
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
      return Observable.of({data: op.context.add});
    });

    testLinkResults({
      link,
      results: [3],
      done,
    });
  });

  it('should concat a function and Link', (done) => {
    const returnOne = new SetContextLink({ add: 1 });
    const mock = new MockLink((op, forward) => Observable.of({data: op.context.add}));

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
    }).concat((op, forward) => Observable.of({data: op.context.add}));
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
    const link1 = returnOne.concat((operation, forward) => Observable.of({data: operation.context.add + 1}));
    const link2 = returnOne.concat((operation, forward) => Observable.of({data: operation.context.add + 2}));
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
      new MockLink((operation, forward) => Observable.of({data: operation.context.add + 1})),
    );
    const link2 = returnOne.concat(
      new MockLink((operation, forward) => Observable.of({data: operation.context.add + 2})),
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
    const link1 = returnOne.concat((operation, forward) => Observable.of({data: operation.context.add + 1}));
    const link2 = returnOne.concat(
      new MockLink((operation, forward) => Observable.of({data: operation.context.add + 2})),
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

describe('Link static library', () => {

  describe('from', () => {

    const uniqueOperation: Operation = {
      query: sampleQuery,
      context: 'uniqueName',
    };

    it('should create an observable that completes when passed an empty array', (done) => {
      const observable = ApolloLink.from([]).request({query: sampleQuery});
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
      const observable = Links.execute(chain, uniqueOperation);
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
      Links.execute(chain, operation);
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
      Links.execute(chain, astOperation);
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
      Links.execute(chain, uniqueOperation);
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
      Links.execute(chain, uniqueOperation);
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

      const result = Links.execute(chain, uniqueOperation);

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

  describe('split', () => {
    it('should split two functions', (done) => {
      const link1 = (operation, forward) => Observable.of({ data: 1 });
      const link2 = (operation, forward) => Observable.of({ data: 2 });
      const link = Links.split(
        (operation) => {
          return operation.context;
        },
        link1,
        link2,
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
      const link1 = (operation, forward) => Observable.of({ data: 1 });
      const link2 = new MockLink((operation, forward) => Observable.of({ data: 2 }));
      const link = Links.split(
        (operation) => operation.context,
        link1,
        link2,
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
      const link1 = (operation, forward) => Observable.of({ data: 1 });
      const link2 = new MockLink((operation, forward) => Observable.of({ data: 2 }));
      const link = Links.split(
        (operation) => operation.context,
        link1,
        link2,
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

  describe('asPromiseWrapper', () => {
    const operation = {
      query: sampleQuery,
      context: 'uniqueName',
    };
    const data = {
      data: {
        hello: 'world',
      },
    };
    const error = new Error('I always error');

    it('return next call as Promise resolution', () => {
      const stubRequest = sinon.stub().withArgs(operation).callsFake(() => Observable.of(data));

      let linkPromise = Links.asPromiseWrapper({
        request: stubRequest,
      });

      return linkPromise.request(operation)
        .then(result => assert.deepEqual(data, result));
    });

    it('return error call as Promise rejection', () => {
       const stubRequest = sinon.stub().withArgs(operation).callsFake(() => new Observable(observer => observer.error(error)));

      let linkPromise = Links.asPromiseWrapper({
        request: stubRequest,
      });

      return linkPromise.request(operation)
        .then(expect.fail)
        .catch(actualError => assert.deepEqual(error, actualError));
    });
  });

});
