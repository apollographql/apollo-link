import * as Observable from 'zen-observable';

import Link, { OperationRequest, LinkResult } from '../';

// request => observable
const mockLink = (result = { data: {}, errors: null }) => {
  return new Link((request: OperationRequest) => {
    return new Observable(observer => {
      let timer = setTimeout(() => {
        observer.next(result);
        observer.complete();
      }, 10);

      return () => clearTimeout(timer);
    });
  });
};

const poll = interval =>
  new Link((request: OperationRequest, prev) => {
    return new Observable(observer => {
      let timer = setInterval(() => {
        if (prev) {
          const stack = prev.request(request);
          return stack.subscribe({
            next: data => observer.next(data),
            error: e => observer.error(e),
            complete: () => {
              if (stack) stack.unsubscribe();
            },
          });
        }
        observer.error(
          new Error('polling link should be used after a request link')
        );
      }, 10);

      return () => {
        observer.complete();
        clearInterval(timer);
      };
    });
  });

const logger = new Link((request: OperationRequest, prev) => {
  return new Observable(observer => {
    const subscription = prev
      .map(x => {
        x.context.logger = {
          start: new Date(),
        };
        return x;
      })
      .request(request)
      .subscribe({
        next: ({ context, ...rest }) => {
          context.logger.end = new Date();
          // log the duration here
          const span = context.logger.end - context.logger.start;
          observer.next({
            ...rest,
            context,
          });
        },
        error: e => {
          observer.error(e);
        },
        complete: () => {
          observer.complete();
        },
      });
    return () => subscription.unsubscribe();
  });
});

const addContext = value =>
  new Link((request, prev) => {
    if (!prev) return Observable.of({ context: { ...value } });
    return new Observable(observer => {
      const subscription = prev.request(request).subscribe({
        next: ({ context, ...rest }) => {
          observer.next({
            ...rest,
            context: {
              ...context,
              ...value,
            },
          });
        },
        error: e => {
          observer.error(e);
        },
        complete: () => {
          observer.complete();
        },
      });
      return () => subscription.unsubscribe();
    });
  });

describe('usecase', () => {
  it('takes a function to handle an operation', complete => {
    const client = mockLink().request({ query: '{ foo { bar }}' }).subscribe({
      next: x => {
        expect(x).toEqual({ data: {}, errors: null, context: {} });
      },
      complete,
    });
  });

  it('can join links together', complete => {
    let count = 1;
    const client = mockLink()
      .concat(poll(10))
      .concat(logger)
      .request({ query: '{ foo { bar }}' });

    let subscription = client.subscribe({
      next: x => {
        count++;
      },
      error: console.error,
    });

    setTimeout(() => {
      subscription.unsubscribe();
      expect(count).toEqual(3);
      complete();
    }, 40);
  });
});

describe('from', () => {
  it('builds a chain in order', complete => {
    let count = 1;
    const client = Link.from([mockLink(), poll(10), logger]).request({
      query: '{ foo { bar }}',
    });

    let subscription = client.subscribe({
      next: x => {
        count++;
      },
      error: console.error,
    });

    setTimeout(() => {
      subscription.unsubscribe();
      expect(count).toEqual(3);
      complete();
    }, 40);
  });
});

describe('filter', () => {
  it("can not run a request if the parameters don't pass", complete => {
    let called = false;
    const client = mockLink()
      .filter(({ context }) => context.run)
      .request({ query: '{ foo { bar }}', context: { run: false } })
      .subscribe({
        next: x => {
          called = true;
          throw new Error('Should not have been called');
        },
        complete: () => {
          expect(called).toEqual(false);
          complete();
        },
      });
  });
});

describe('map', () => {
  it('allows changing the request before flight', complete => {
    const client = mockLink()
      .map(request => {
        request.context.user = 'james';
        return request;
      })
      .request({ query: '{ foo { bar }}', context: { run: false } })
      .subscribe({
        next: x => {
          if (!x) return;
          expect(x.context.user).toEqual('james');
        },
        complete,
      });
  });
});

describe('split', () => {
  it('allows ending a chain based on a value', complete => {
    const client = mockLink()
      .split(({ context }) => !context.user, logger)
      .request({ query: '{ foo { bar } }' });

    const subscription = client.subscribe({
      next: data => {
        expect(data.context.logger.start).toBeDefined();
        expect(data.context.logger.end).toBeDefined();
      },
      error: console.error,
      complete,
    });
  });
  it('has an optional second param', complete => {
    let called = false;
    const client = mockLink()
      .split(({ context }) => !!context.user, logger)
      .request({ query: '{ foo { bar } }' });

    const subscription = client.subscribe({
      next: data => {
        called = true;
        expect(data.context.logger).toBeUndefined();
      },
      error: console.error,
      complete: () => {
        expect(called).toEqual(true);
        complete();
      },
    });
  });

  it('can take a second parameter', complete => {
    let called = false;
    const client = mockLink()
      .split(({ context }) => !!context.user, Link.empty(), logger)
      .request({ query: '{ foo { bar } }' });

    const subscription = client.subscribe({
      next: data => {
        called = true;
        expect(data.context.logger).toBeDefined();
      },
      error: console.error,
      complete: () => {
        expect(called).toEqual(true);
        complete();
      },
    });
  });
  it('returns a Link to continue building', complete => {
    let called = false;
    const client = mockLink()
      .split(({ context }) => !context.user, logger)
      .concat(addContext({ foo: 'bar' }))
      .request({ query: '{ foo { bar } }' });

    const subscription = client.subscribe({
      next: data => {
        called = true;
        expect(data.context.foo).toEqual('bar');
        expect(data.context.logger).toBeDefined();
      },
      error: console.error,
      complete: () => {
        expect(called).toEqual(true);
        complete();
      },
    });
  });
});
