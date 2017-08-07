import { assert } from 'chai';
import DedupLink from '../src/dedupLink';

import { ApolloLink, execute, Operation, Observable } from 'apollo-link-core';

import gql from 'graphql-tag';

import { DocumentNode } from 'graphql';

function getOperationName(doc: DocumentNode): string | null {
  let res: string | null = null;
  doc.definitions.forEach(definition => {
    if (definition.kind === 'OperationDefinition' && definition.name) {
      res = definition.name.value;
    }
  });
  return res;
}

describe('DedupLink', () => {
  it(`does not affect different queries`, () => {
    const document: DocumentNode = gql`
      query test1($x: String) {
        test(x: $x)
      }
    `;
    const variables1 = { x: 'Hello World' };
    const variables2 = { x: 'Goodbye World' };

    const request1: Operation = {
      query: document,
      variables: variables1,
      operationName: getOperationName(document),
    };

    const request2: Operation = {
      query: document,
      variables: variables2,
      operationName: getOperationName(document),
    };

    let called = 0;
    const deduper = ApolloLink.from([
      new DedupLink(),
      () => {
        called += 1;
        return null;
      },
    ]);

    execute(deduper, request1);
    execute(deduper, request2);
    assert.equal(called, 2);
  });

  it(`will not deduplicate requests following an errored query`, done => {
    const document: DocumentNode = gql`
      query test1($x: String) {
        test(x: $x)
      }
    `;
    const variables = { x: 'Hello World' };

    let error;
    const data = { data: { data: 'some data' } };

    const request: Operation = {
      query: document,
      variables: variables,
      operationName: getOperationName(document),
    };

    let called = 0;
    const deduper = ApolloLink.from([
      new DedupLink(),
      () => {
        called += 1;
        switch (called) {
          case 1:
            return new Observable(observer => {
              error = new Error('some error');
              observer.error(error);
            });
          case 2:
            return new Observable(observer => {
              observer.next(data);
              observer.complete();
            });
          default:
            assert(false, 'Should not have been called more than twice');
            return null;
        }
      },
    ]);

    execute(deduper, request).subscribe({
      error: actualError => {
        assert.equal(actualError, error);

        //second query
        execute(deduper, request).subscribe({
          next: result => {
            assert.equal(result, data);
            assert.equal(called, 2);
            done();
          },
        });
      },
    });
  });

  it(`deduplicates identical queries`, () => {
    const document: DocumentNode = gql`
      query test1($x: String) {
        test(x: $x)
      }
    `;
    const variables1 = { x: 'Hello World' };
    const variables2 = { x: 'Hello World' };

    const request1: Operation = {
      query: document,
      variables: variables1,
      operationName: getOperationName(document),
    };

    const request2: Operation = {
      query: document,
      variables: variables2,
      operationName: getOperationName(document),
    };

    let called = 0;
    const deduper = ApolloLink.from([
      new DedupLink(),
      () => {
        called += 1;
        return new Observable(observer => {
          setTimeout(observer.complete.bind(observer));
        });
      },
    ]);

    execute(deduper, request1).subscribe({});
    execute(deduper, request2).subscribe({});
    assert.equal(called, 1);
  });

  it(`can bypass deduplication if desired`, () => {
    const document: DocumentNode = gql`
      query test1($x: String) {
        test(x: $x)
      }
    `;
    const variables1 = { x: 'Hello World' };
    const variables2 = { x: 'Hello World' };

    const request1: Operation = {
      query: document,
      variables: variables1,
      operationName: getOperationName(document),
      context: {
        forceFetch: true,
      },
    };

    const request2: Operation = {
      query: document,
      variables: variables2,
      operationName: getOperationName(document),
      context: {
        forceFetch: true,
      },
    };

    let called = 0;
    const deduper = ApolloLink.from([
      new DedupLink(),
      () => {
        called += 1;
        return null;
      },
    ]);

    execute(deduper, request1).subscribe({});
    execute(deduper, request2).subscribe({});
    assert.equal(called, 2);
  });
});
