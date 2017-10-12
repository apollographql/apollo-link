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
    const errorLink = onError(({ graphqlErrors, networkError }) => {
      expect(graphqlErrors[0].message).toBe('resolver blew up');
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
    const errorLink = onError(({ graphqlErrors, networkError }) => {
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
    const errorLink = onError(({ graphqlErrors, networkError }) => {
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
    const errorLink = onError(({ graphqlErrors, networkError }) => {
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
    const errorLink = onError(({ graphqlErrors, networkError }) => {
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
    const errorLink = new ErrorLink(({ graphqlErrors, networkError }) => {
      expect(graphqlErrors[0].message).toBe('resolver blew up');
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
    const errorLink = new ErrorLink(({ graphqlErrors, networkError }) => {
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
    const errorLink = new ErrorLink(({ graphqlErrors, networkError }) => {
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
    const errorLink = new ErrorLink(({ graphqlErrors, networkError }) => {
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
    const errorLink = new ErrorLink(({ graphqlErrors, networkError }) => {
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
