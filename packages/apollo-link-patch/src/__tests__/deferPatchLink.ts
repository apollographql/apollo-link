import {
  ApolloLink,
  execute,
  GraphQLRequest,
  Observable,
  FetchResult,
} from 'apollo-link';
import gql from 'graphql-tag';
import { DocumentNode } from 'graphql';
import { DeferPatchLink } from '../deferPatchLink';

function getOperationName(doc: DocumentNode): string | null {
  let res: string | null = null;
  doc.definitions.forEach(definition => {
    if (definition.kind === 'OperationDefinition' && definition.name) {
      res = definition.name.value;
    }
  });
  return res;
}

/**
 * Deeply clones a value to create a new instance.
 */
export function cloneDeep<T>(value: T): T {
  // If the value is an array, create a new array where every item has been cloned.
  if (Array.isArray(value)) {
    return value.map(item => cloneDeep(item)) as any;
  }
  // If the value is an object, go through all of the object’s properties and add them to a new
  // object.
  if (value !== null && typeof value === 'object') {
    const nextValue: any = {};
    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        nextValue[key] = cloneDeep(value[key]);
      }
    }
    return nextValue;
  }
  // Otherwise this is some primitive value and it is therefore immutable so we can just return it
  // directly.
  return value;
}

describe('DeferPatchLink', () => {
  it(`Merge basic fields`, done => {
    const document: DocumentNode = gql`
      query foo {
        bar
        baz @defer
      }
    `;

    const request: GraphQLRequest = {
      query: document,
      operationName: getOperationName(document),
    };

    const deferrer = ApolloLink.from([
      new DeferPatchLink(),
      new ApolloLink(() => {
        return new Observable<FetchResult>(observer => {
          observer.next({
            data: { foo: { bar: 'bar', baz: null } },
          });
          observer.next({
            path: ['foo', 'baz'],
            data: 'baz',
          });
          observer.complete();
        });
      }),
    ]);

    const allResults: FetchResult[] = [];
    execute(deferrer, request).subscribe({
      next: result => {
        // Merging patches modifies the object in place, so all results
        // actually have the same object reference.
        allResults.push(cloneDeep(result));
      },
      complete: () => {
        expect(allResults).toEqual([
          {
            data: { foo: { bar: 'bar', baz: null } },
          },
          {
            data: { foo: { bar: 'bar', baz: 'baz' } },
          },
        ]);
        done();
      },
    });
  });

  it(`Merge fields in array`, done => {
    const document: DocumentNode = gql`
      query foo {
        bar
        arr @defer {
          boo
          baz @defer
        }
      }
    `;

    const request: GraphQLRequest = {
      query: document,
      operationName: getOperationName(document),
    };

    const deferrer = ApolloLink.from([
      new DeferPatchLink(),
      new ApolloLink(() => {
        return new Observable<FetchResult>(observer => {
          observer.next({
            data: { foo: { bar: 'bar', arr: null } },
          });
          observer.next({
            path: ['foo', 'arr'],
            data: [{ boo: 0, baz: null }, { boo: 1, baz: null }],
          });
          observer.next({
            path: ['foo', 'arr', 0, 'baz'],
            data: 'baz0',
          });
          observer.next({
            path: ['foo', 'arr', 1, 'baz'],
            data: 'baz1',
          });
          observer.complete();
        });
      }),
    ]);

    const allResults: FetchResult[] = [];
    execute(deferrer, request).subscribe({
      next: result => {
        allResults.push(cloneDeep(result));
      },
      complete: () => {
        expect(allResults).toEqual([
          {
            data: { foo: { bar: 'bar', arr: null } },
          },
          {
            data: {
              foo: {
                bar: 'bar',
                arr: [{ boo: 0, baz: null }, { boo: 1, baz: null }],
              },
            },
          },
          {
            data: {
              foo: {
                bar: 'bar',
                arr: [{ boo: 0, baz: 'baz0' }, { boo: 1, baz: null }],
              },
            },
          },
          {
            data: {
              foo: {
                bar: 'bar',
                arr: [{ boo: 0, baz: 'baz0' }, { boo: 1, baz: 'baz1' }],
              },
            },
          },
        ]);
        done();
      },
    });
  });

  it(`Merge errors`, done => {
    const document: DocumentNode = gql`
      query foo {
        bar
        baz @defer
      }
    `;

    const request: GraphQLRequest = {
      query: document,
      operationName: getOperationName(document),
    };

    const deferrer = ApolloLink.from([
      new DeferPatchLink(),
      new ApolloLink(() => {
        return new Observable<FetchResult>(observer => {
          observer.next({
            data: { foo: { bar: 'bar', baz: null } },
            errors: [
              { name: 'INTERNAL_SERVER_ERROR', message: 'Some other error' },
            ],
          });
          observer.next({
            path: ['foo', 'baz'],
            errors: [
              { name: 'INTERNAL_SERVER_ERROR', message: 'Error on field: baz' },
            ],
          });
          observer.complete();
        });
      }),
    ]);

    const allResults: FetchResult[] = [];
    execute(deferrer, request).subscribe({
      next: result => {
        // Merging patches modifies the object in place, so all results
        // actually have the same object reference.
        allResults.push(cloneDeep(result));
      },
      complete: () => {
        expect(allResults).toEqual([
          {
            data: { foo: { bar: 'bar', baz: null } },
            errors: [
              { name: 'INTERNAL_SERVER_ERROR', message: 'Some other error' },
            ],
          },
          {
            data: { foo: { bar: 'bar', baz: null } },
            errors: [
              { name: 'INTERNAL_SERVER_ERROR', message: 'Some other error' },
              { name: 'INTERNAL_SERVER_ERROR', message: 'Error on field: baz' },
            ],
          },
        ]);
        done();
      },
    });
  });
});
