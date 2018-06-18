import gql from 'graphql-tag';
import { ApolloLink, execute, Observable } from 'apollo-link';
import { of } from 'rxjs';

import { setContext } from '../index';

const sleep = ms => new Promise(s => setTimeout(s, ms));
const query = gql`
  query Test {
    foo {
      bar
    }
  }
`;
const data = {
  foo: { bar: true },
};

it('can be used to set the context with a simple function', done => {
  const withContext = setContext(() => ({ dynamicallySet: true }));

  const mockLink = new ApolloLink(operation => {
    expect(operation.getContext().dynamicallySet).toBe(true);
    return of({ data });
  });

  const link = withContext.concat(mockLink);

  execute(link, { query }).subscribe(result => {
    expect(result.data).toEqual(data);
    done();
  });
});

it('can be used to set the context with a function returning a promise', done => {
  const withContext = setContext(() =>
    Promise.resolve({ dynamicallySet: true }),
  );

  const mockLink = new ApolloLink(operation => {
    expect(operation.getContext().dynamicallySet).toBe(true);
    return of({ data });
  });

  const link = withContext.concat(mockLink);

  execute(link, { query }).subscribe(result => {
    expect(result.data).toEqual(data);
    done();
  });
});

it('can be used to set the context with a function returning a promise that is delayed', done => {
  const withContext = setContext(() =>
    sleep(25).then(() => ({ dynamicallySet: true })),
  );

  const mockLink = new ApolloLink(operation => {
    expect(operation.getContext().dynamicallySet).toBe(true);
    return of({ data });
  });

  const link = withContext.concat(mockLink);

  execute(link, { query }).subscribe(result => {
    expect(result.data).toEqual(data);
    done();
  });
});

it('handles errors in the lookup correclty', done => {
  const withContext = setContext(() =>
    sleep(5).then(() => {
      throw new Error('dang');
    }),
  );

  const mockLink = new ApolloLink(operation => {
    return of({ data });
  });

  const link = withContext.concat(mockLink);

  execute(link, { query }).subscribe(done.fail, e => {
    expect(e.message).toBe('dang');
    done();
  });
});
it('handles errors in the lookup correclty with a normal function', done => {
  const withContext = setContext(() => {
    throw new Error('dang');
  });

  const mockLink = new ApolloLink(operation => {
    return of({ data });
  });

  const link = withContext.concat(mockLink);

  execute(link, { query }).subscribe(done.fail, e => {
    expect(e.message).toBe('dang');
    done();
  });
});

it('has access to the request information', done => {
  const withContext = setContext(({ operationName, query, variables }) =>
    sleep(1).then(() =>
      Promise.resolve({
        variables: variables ? true : false,
        operation: query ? true : false,
        operationName: operationName.toUpperCase(),
      }),
    ),
  );

  const mockLink = new ApolloLink(operation => {
    const { variables, operation, operationName } = operation.getContext();
    expect(variables).toBe(true);
    expect(operation).toBe(true);
    expect(operationName).toBe('TEST');
    return of({ data });
  });

  const link = withContext.concat(mockLink);

  execute(link, { query, variables: { id: 1 } }).subscribe(result => {
    expect(result.data).toEqual(data);
    done();
  });
});
it('has access to the context at execution time', done => {
  const withContext = setContext((_, { count }) =>
    sleep(1).then(() => ({ count: count + 1 })),
  );

  const mockLink = new ApolloLink(operation => {
    const { count } = operation.getContext();
    expect(count).toEqual(2);
    return of({ data });
  });

  const link = withContext.concat(mockLink);

  execute(link, { query, context: { count: 1 } }).subscribe(result => {
    expect(result.data).toEqual(data);
    done();
  });
});

it('unsubscribes correctly', done => {
  const withContext = setContext((_, { count }) =>
    sleep(1).then(() => ({ count: count + 1 })),
  );

  const mockLink = new ApolloLink(operation => {
    const { count } = operation.getContext();
    expect(count).toEqual(2);
    return of({ data });
  });

  const link = withContext.concat(mockLink);

  let handle = execute(link, {
    query,
    context: { count: 1 },
  }).subscribe(result => {
    expect(result.data).toEqual(data);
    handle.unsubscribe();
    done();
  });
});

it('unsubscribes without throwing before data', done => {
  let called;
  const withContext = setContext((_, { count }) => {
    called = true;
    return sleep(1).then(() => ({ count: count + 1 }));
  });

  const mockLink = new ApolloLink(operation => {
    const { count } = operation.getContext();
    expect(count).toEqual(2);
    return new Observable(obs => {
      setTimeout(() => {
        obs.next({ data });
        obs.complete();
      }, 25);
    });
  });

  const link = withContext.concat(mockLink);

  let handle = execute(link, {
    query,
    context: { count: 1 },
  }).subscribe(result => {
    done.fail('should have unsubscribed');
  });

  setTimeout(() => {
    handle.unsubscribe();
    expect(called).toBe(true);
    done();
  }, 10);
});
