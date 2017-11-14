import {
  ApolloLink,
  execute,
  Operation,
  GraphQLRequest,
  Observable,
} from 'apollo-link';
import gql from 'graphql-tag';
import { DocumentNode } from 'graphql';

import { DedupLink } from '../dedupLink';

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

    const request1: GraphQLRequest = {
      query: document,
      variables: variables1,
      operationName: getOperationName(document),
    };

    const request2: GraphQLRequest = {
      query: document,
      variables: variables2,
      operationName: getOperationName(document),
    };

    let called = 0;
    const deduper = ApolloLink.from([
      new DedupLink(),
      new ApolloLink(() => {
        called += 1;
        return null;
      }),
    ]);

    execute(deduper, request1);
    execute(deduper, request2);
    expect(called).toBe(2);
  });

  it(`will not deduplicate requests following an errored query`, done => {
    const document: DocumentNode = gql`
      query test1($x: String) {
        test(x: $x)
      }
    `;
    const variables = { x: 'Hello World' };

    let error;
    const data = { data: 'some data' };

    const request: GraphQLRequest = {
      query: document,
      variables: variables,
      operationName: getOperationName(document),
    };

    let called = 0;
    const deduper = ApolloLink.from([
      new DedupLink(),
      new ApolloLink(() => {
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
            expect(false);
            return null;
        }
      }),
    ]);

    try {
      execute(deduper, request).subscribe({
        error: actualError => {
          expect(actualError).toEqual(error);

          //second query
          execute(deduper, request).subscribe({
            next: result => {
              expect(result).toEqual(data);
              expect(called).toBe(2);
              done();
            },
          });
        },
      });
    } catch (e) {
      done.fail(e);
    }
  });

  it(`deduplicates identical queries`, () => {
    const document: DocumentNode = gql`
      query test1($x: String) {
        test(x: $x)
      }
    `;
    const variables1 = { x: 'Hello World' };
    const variables2 = { x: 'Hello World' };

    const request1: GraphQLRequest = {
      query: document,
      variables: variables1,
      operationName: getOperationName(document),
    };

    const request2: GraphQLRequest = {
      query: document,
      variables: variables2,
      operationName: getOperationName(document),
    };

    let called = 0;
    const deduper = ApolloLink.from([
      new DedupLink(),
      new ApolloLink(() => {
        return new Observable(observer => {
          called += 1;
          setTimeout(observer.complete.bind(observer));
        });
      }),
    ]);

    execute(deduper, request1).subscribe({});
    execute(deduper, request2).subscribe({});
    expect(called).toBe(1);
  });
  it(`works for nested queries`, done => {
    const document: DocumentNode = gql`
      query test1($x: String) {
        test(x: $x)
      }
    `;
    const variables1 = { x: 'Hello World' };
    const variables2 = { x: 'Hello World' };

    const request1: GraphQLRequest = {
      query: document,
      variables: variables1,
      operationName: getOperationName(document),
    };

    const request2: GraphQLRequest = {
      query: document,
      variables: variables2,
      operationName: getOperationName(document),
    };

    let called = 0;
    const deduper = ApolloLink.from([
      new DedupLink(),
      new ApolloLink(() => {
        return new Observable(observer => {
          called += 1;
          observer.next({ data: { test: 1 } });
        });
      }),
    ]);

    execute(deduper, request1).subscribe({
      complete: () => {
        execute(deduper, request2).subscribe({
          complete: () => {
            expect(called).toBe(2);
            done();
          },
        });
      },
    });
  });

  it(`can bypass deduplication if desired`, () => {
    const document: DocumentNode = gql`
      query test1($x: String) {
        test(x: $x)
      }
    `;
    const variables1 = { x: 'Hello World' };
    const variables2 = { x: 'Hello World' };

    const request1: GraphQLRequest = {
      query: document,
      variables: variables1,
      operationName: getOperationName(document),
      context: {
        forceFetch: true,
      },
    };

    const request2: GraphQLRequest = {
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
      new ApolloLink(() => {
        called += 1;
        return null;
      }),
    ]);

    execute(deduper, request1).subscribe({});
    execute(deduper, request2).subscribe({});
    expect(called).toBe(2);
  });
  it(`unsubscribes as needed`, () => {
    const document: DocumentNode = gql`
      query test1($x: String) {
        test(x: $x)
      }
    `;
    const variables1 = { x: 'Hello World' };
    const variables2 = { x: 'Hello World' };

    const request1: GraphQLRequest = {
      query: document,
      variables: variables1,
      operationName: getOperationName(document),
    };

    const request2: GraphQLRequest = {
      query: document,
      variables: variables2,
      operationName: getOperationName(document),
    };

    let unsubscribed = false;
    const deduper = ApolloLink.from([
      new DedupLink(),
      new ApolloLink(() => {
        return new Observable(() => {
          return () => {
            unsubscribed = true;
          };
        });
      }),
    ]);

    const sub1 = execute(deduper, request1).subscribe({});
    const sub2 = execute(deduper, request2).subscribe({});

    sub2.unsubscribe();
    sub1.unsubscribe();

    expect(unsubscribed).toBe(true);
  });
});
