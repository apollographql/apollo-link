import { DocumentNode, ExecutionResult } from 'graphql';
import * as Observable from 'zen-observable';

interface OperationRequest {
  query: DocumentNode;
  variables?: { [key: string]: any };
  context?: { [key: string]: any };
}

type OperationResult = ExecutionResult;

interface Operation {
  request: OperationRequest;
  result?: OperationResult;
}

class Link {
  value: (link: Observable<Operation>) => Observable<Operation>;

  // #from :: Link[] => Link
  static from(links: Link[]) {
    return links.reduce((x, y) => x.concat(y), Link.empty());
  }

  // #of :: Observable => Link
  static of(observable) {
    return new Link(() => observable);
  }

  // #empty :: () => Link
  static empty() {
    return new Link(link => link);
  }

  // Link :: Observable<Operation> => Observable<Operation>
  constructor(f) {
    this.value = f;
  }

  // .concat :: Link => Link
  concat(link: Link) {
    // Observable<Operation> => Observable<Operation>
    return new Link(observable => {
      // Observable<Operation> => Observable<Operation>
      return link.value(this.value(observable));
    });
  }

  // .filter :: ((Operation) => bool) => Link
  filter(test: (operation: Operation) => boolean) {
    return new Link(link => link.filter(test));
  }

  // .split :: ((Operation) => bool, Link, Link?) => Link
  split(test, Left, Right = Link.empty()) {
    return new Link(link => {
      return new Observable(observer => {
        const subscription = link.subscribe((data: Operation) => {
          const newLink = test(data) ? this.concat(Left) : this.concat(Right);
          newLink.execute(data.request).subscribe({
            next: x => observer.next(x),
            error: e => observer.error(e),
            complete: () => observer.complete(),
          });
        });

        () => {
          subscription.unsubscribe();
        };
      });
    });
  }

  // .execute :: OperationRequest => Observable<Operation>
  execute(request: OperationRequest) {
    return this.value(
      Observable.of({
        request: request.context ? request : { ...request, ...{ context: {} } },
      }),
    );
  }
}

const setContext = updater =>
  // Link :: Observable => Observable
  new Link(link =>
    link.map(({ request, ...rest }) => ({
      ...rest,
      request: {
        ...request,
        context: { ...request.context, ...updater(request.context) },
      },
    })),
  );

// Link :: Observable => Observable
const PollLink = (link, interval) =>
  new Link(prev => {
    let timer;

    return new Observable(observer => {
      const subscription = prev.subscribe(data => {
        timer = setInterval(() => {
          link.execute(data.request).subscribe(x => observer.next(x));
        }, interval);
      });

      () => {
        if (timer) clearInterval(timer);
        if (subscription) subscription.unsubscribe();
      };
    });
  });

// Link :: Observable => Observable
const fetcher = () =>
  new Link(
    link =>
      new Observable(observer => {
        let cancelled;
        link.subscribe(({ request }) => {
          // don't make request if cancelled prior
          if (cancelled) return;
          Promise.resolve({ data: { foo: { bar: true } } })
            .then(result => {
              // don't continue chain if cancelled
              if (cancelled) return;
              observer.next({ request, result });
              observer.complete();
            })
            .catch(e => observer.error(e));
        });

        return () => {
          cancelled = true;
        };
      }),
  );

const LogStart = setContext(() => ({
  logging: { time: new Date(), id: Math.random() },
}));

const AuthLink = setContext(() => ({
  fetch: { headers: { user: '7' } },
}));

const FetchLink = fetcher();

const LogEnd = setContext(({ logging: { time } }) => ({
  logging: { time: new Date() - time },
}));

describe('concat', () => {
  it('works', complete => {
    const client = LogStart.concat(AuthLink).concat(LogEnd);

    const subscription = client
      .execute({
        query: `{ foo { bar } }`,
      })
      .subscribe({
        next: data => {
          expect(data.request.context.logging).toBeDefined();
          expect(data.request.context.fetch).toBeDefined();
        },
        error: console.error,
        complete: () => complete(),
      });
  });

  it('works associatively', complete => {
    const client = LogStart.concat(AuthLink.concat(LogEnd));

    const subscription = client
      .execute({
        query: `{ foo { bar } }`,
      })
      .subscribe({
        next: data => {
          expect(data.request.context.logging).toBeDefined();
          expect(data.request.context.fetch).toBeDefined();
        },

        error: console.error,
        complete: () => complete(),
      });
  });
});

describe('from', () => {
  it('works', complete => {
    let count = 0;
    const RequestLink = Link.from([LogStart, FetchLink, LogEnd]);
    const client = Link.from([AuthLink, PollLink(RequestLink, 10)]);

    const subscription = client
      .execute({
        query: `{ foo { bar } }`,
      })
      .subscribe({
        next: data => {
          count++;
          expect(data.result.data).toEqual({ foo: { bar: true } });
          expect(data.request.context.logging).toBeDefined();
          expect(data.request.context.fetch).toBeDefined();
        },
        error: console.error,
      });

    setTimeout(() => {
      expect(count).toEqual(3);
      complete();
    }, 35);
  });
});

describe('filter', () => {
  it("can not run a request if the parameters don't pass", complete => {
    let called = false;
    const client = FetchLink.filter(({ request: { context } }) => context.run)
      .execute({ query: '{ foo { bar }}', context: { run: false } })
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

describe('split', () => {
  it('allows splitting a chain based on a value', complete => {
    const client = FetchLink.split(
      ({ request: { context } }) => !context.user,
      LogStart,
    ).execute({ query: '{ foo { bar } }' });

    const subscription = client.subscribe({
      next: data => {
        expect(data.request.context.logging).toBeDefined();
      },
      error: console.error,
      complete: () => complete(),
    });
  });
  it('has an optional second param', complete => {
    let called = false;
    const client = FetchLink.split(
      ({ request: { context } }) => !!context.user,
      LogStart,
    ).execute({ query: '{ foo { bar } }' });

    const subscription = client.subscribe({
      next: data => {
        called = true;
        expect(data.request.context.logging).toBeUndefined();
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
    const client = FetchLink.split(
      ({ request: { context } }) => !!context.user,
      Link.empty(),
      LogStart,
    ).execute({ query: '{ foo { bar } }' });

    const subscription = client.subscribe({
      next: data => {
        called = true;
        expect(data.request.context.logging).toBeDefined();
      },
      error: console.error,
      complete: () => {
        expect(called).toEqual(true);
        complete();
      },
    });
  });
});
