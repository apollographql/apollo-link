import gql from 'graphql-tag';
import { ApolloLink, execute, Observable } from 'apollo-link';

import { onError, ErrorLink } from '../';

describe('error handling', () => {
  it('has an easy way to handle GraphQL errors', done => {
    const query = gql`
      {
        foo {
          bar
        }
      }
    `;

    let called;
    const errorLink = onError(({ graphQLErrors, networkError }) => {
      expect(graphQLErrors[0].message).toBe('resolver blew up');
      called = true;
    });

    const mockLink = new ApolloLink(operation =>
      Observable.of({
        errors: [
          {
            message: 'resolver blew up',
          },
        ],
      }),
    );

    const link = errorLink.concat(mockLink);

    execute(link, { query }).subscribe(result => {
      expect(result.errors[0].message).toBe('resolver blew up');
      expect(called).toBe(true);
      done();
    });
  });
  it('has an easy way to log client side (network) errors', done => {
    const query = gql`
      query Foo {
        foo {
          bar
        }
      }
    `;

    let called;
    const errorLink = onError(({ operation, networkError }) => {
      expect(networkError.message).toBe('app is crashing');
      expect(operation.operationName).toBe('Foo');
      called = true;
    });

    const mockLink = new ApolloLink(operation => {
      throw new Error('app is crashing');
    });

    const link = errorLink.concat(mockLink);

    execute(link, { query }).subscribe({
      error: e => {
        expect(e.message).toBe('app is crashing');
        expect(called).toBe(true);
        done();
      },
    });
  });
  it('captures errors within links', done => {
    const query = gql`
      query Foo {
        foo {
          bar
        }
      }
    `;

    let called;
    const errorLink = onError(({ operation, networkError }) => {
      expect(networkError.message).toBe('app is crashing');
      expect(operation.operationName).toBe('Foo');
      called = true;
    });

    const mockLink = new ApolloLink(operation => {
      return new Observable(obs => {
        throw new Error('app is crashing');
      });
    });

    const link = errorLink.concat(mockLink);

    execute(link, { query }).subscribe({
      error: e => {
        expect(e.message).toBe('app is crashing');
        expect(called).toBe(true);
        done();
      },
    });
  });
  it('completes if no errors', done => {
    const query = gql`
      {
        foo {
          bar
        }
      }
    `;

    let called;
    const errorLink = onError(({ graphQLErrors, networkError }) => {
      expect(networkError.message).toBe('app is crashing');
      called = true;
    });

    const mockLink = new ApolloLink(operation => {
      return Observable.of({ data: { foo: { id: 1 } } });
    });

    const link = errorLink.concat(mockLink);

    execute(link, { query }).subscribe({
      complete: done,
    });
  });
  it('allows an error to be ignored', done => {
    const query = gql`
      {
        foo {
          bar
        }
      }
    `;

    let called;
    const errorLink = onError(({ graphQLErrors, response }) => {
      expect(graphQLErrors[0].message).toBe('ignore');
      // ignore errors
      response.errors = null;
      called = true;
    });

    const mockLink = new ApolloLink(operation => {
      return Observable.of({
        data: { foo: { id: 1 } },
        errors: [{ message: 'ignore' }],
      });
    });

    const link = errorLink.concat(mockLink);

    execute(link, { query }).subscribe({
      next: ({ errors, data }) => {
        expect(errors).toBe(null);
        expect(data).toEqual({ foo: { id: 1 } });
      },
      complete: done,
    });
  });

  it('can be unsubcribed', done => {
    const query = gql`
      {
        foo {
          bar
        }
      }
    `;

    let called;
    const errorLink = onError(({ networkError }) => {
      expect(networkError.message).toBe('app is crashing');
      called = true;
    });

    const mockLink = new ApolloLink(operation => {
      return new Observable(obs => {
        setTimeout(() => {
          obs.next({ data: { foo: { id: 1 } } });
          obs.complete();
        }, 5);
      });
    });

    const link = errorLink.concat(mockLink);

    const sub = execute(link, { query }).subscribe({
      complete: () => {
        done.fail('completed');
      },
    });

    sub.unsubscribe();

    setTimeout(done, 10);
  });
  it('includes the operation and any data along with a graphql error', done => {
    const query = gql`
      query Foo {
        foo {
          bar
        }
      }
    `;

    let called;
    const errorLink = onError(({ graphQLErrors, response, operation }) => {
      expect(graphQLErrors[0].message).toBe('resolver blew up');
      expect(response.data.foo).toBe(true);
      expect(operation.operationName).toBe('Foo');
      expect(operation.getContext().bar).toBe(true);
      called = true;
    });

    const mockLink = new ApolloLink(operation =>
      Observable.of({
        data: { foo: true },
        errors: [
          {
            message: 'resolver blew up',
          },
        ],
      }),
    );

    const link = errorLink.concat(mockLink);

    execute(link, { query, context: { bar: true } }).subscribe(result => {
      expect(result.errors[0].message).toBe('resolver blew up');
      expect(called).toBe(true);
      done();
    });
  });
});

describe('error handling with class', () => {
  it('has an easy way to handle GraphQL errors', done => {
    const query = gql`
      {
        foo {
          bar
        }
      }
    `;

    let called;
    const errorLink = new ErrorLink(({ graphQLErrors, networkError }) => {
      expect(graphQLErrors[0].message).toBe('resolver blew up');
      called = true;
    });

    const mockLink = new ApolloLink(operation =>
      Observable.of({
        errors: [
          {
            message: 'resolver blew up',
          },
        ],
      }),
    );

    const link = errorLink.concat(mockLink);

    execute(link, { query }).subscribe(result => {
      expect(result.errors[0].message).toBe('resolver blew up');
      expect(called).toBe(true);
      done();
    });
  });
  it('has an easy way to log client side (network) errors', done => {
    const query = gql`
      {
        foo {
          bar
        }
      }
    `;

    let called;
    const errorLink = new ErrorLink(({ networkError }) => {
      expect(networkError.message).toBe('app is crashing');
      called = true;
    });

    const mockLink = new ApolloLink(operation => {
      throw new Error('app is crashing');
    });

    const link = errorLink.concat(mockLink);

    execute(link, { query }).subscribe({
      error: e => {
        expect(e.message).toBe('app is crashing');
        expect(called).toBe(true);
        done();
      },
    });
  });
  it('captures errors within links', done => {
    const query = gql`
      {
        foo {
          bar
        }
      }
    `;

    let called;
    const errorLink = new ErrorLink(({ networkError }) => {
      expect(networkError.message).toBe('app is crashing');
      called = true;
    });

    const mockLink = new ApolloLink(operation => {
      return new Observable(obs => {
        throw new Error('app is crashing');
      });
    });

    const link = errorLink.concat(mockLink);

    execute(link, { query }).subscribe({
      error: e => {
        expect(e.message).toBe('app is crashing');
        expect(called).toBe(true);
        done();
      },
    });
  });
  it('completes if no errors', done => {
    const query = gql`
      {
        foo {
          bar
        }
      }
    `;

    let called;
    const errorLink = new ErrorLink(({ networkError }) => {
      expect(networkError.message).toBe('app is crashing');
      called = true;
    });

    const mockLink = new ApolloLink(operation => {
      return Observable.of({ data: { foo: { id: 1 } } });
    });

    const link = errorLink.concat(mockLink);

    execute(link, { query }).subscribe({
      complete: done,
    });
  });
  it('can be unsubcribed', done => {
    const query = gql`
      {
        foo {
          bar
        }
      }
    `;

    let called;
    const errorLink = new ErrorLink(({ networkError }) => {
      expect(networkError.message).toBe('app is crashing');
      called = true;
    });

    const mockLink = new ApolloLink(operation => {
      return new Observable(obs => {
        setTimeout(() => {
          obs.next({ data: { foo: { id: 1 } } });
          obs.complete();
        }, 5);
      });
    });

    const link = errorLink.concat(mockLink);

    const sub = execute(link, { query }).subscribe({
      complete: () => {
        done.fail('completed');
      },
    });

    sub.unsubscribe();

    setTimeout(done, 10);
  });
});
