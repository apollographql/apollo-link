import { graphql, DocumentNode, ExecutionResult } from 'graphql';
import { parse } from 'graphql/language/parser';

import { makeExecutableSchema } from 'graphql-tools';
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
    return this.concat(
      new Link(link => {
        return new Observable(observer => {
          const subscription = link.subscribe((data: Operation) => {
            const newLink = test(data) ? Left : Right;
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
      }),
    );
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

const withSchema = schema => setContext(() => ({ schema }));

// Construct a schema, using GraphQL schema language
const typeDefs = `
  type Query {
    hello: String
  }
`;

// Provide resolver functions for your schema fields
const resolvers = {
  Query: {
    hello: (root, args, context) => {
      return 'Hello world!';
    },
  },
};

const clientSchema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const flatten = array => [].concat.apply([], array);

const filterLocalSchema = ({ request }) => {
  const { schema } = request.context;
  // get all potential root level items from the local schema
  const rootTypes = flatten(
    [
      schema.getQueryType(),
      schema.getMutationType(),
      schema.getSubscriptionType(),
    ]
      .filter(x => !!x)
      .map(x => x.getFields())
      .map(x => flatten(Object.keys(x).map(y => x[y].name))),
  );

  const doc = parse(request.query);
  // flatten all root level operation fields to determine if this is
  // a client only operation
  const fields = flatten(
    doc.definitions.map(x => x.selectionSet.selections.map(y => y.name.value)),
  );

  return fields.some(field => rootTypes.includes(field));
};

const LocalExecution = new Link(
  link =>
    new Observable(observer => {
      let cancelled;
      link.subscribe(({ request }) => {
        // don't make request if cancelled prior
        if (cancelled) return;
        graphql(request.context.schema, request.query)
          .then(result => {
            // don't continue chain if cancelled
            if (cancelled) return;
            observer.next({ request, result });
            observer.complete();
          })
          .catch(e => {
            console.error(e);
            observer.error(e);
          });
      });

      return () => {
        cancelled = true;
      };
    }),
);

describe('localSchema', () => {
  it('can reroute a cilent side query to a local execution', complete => {
    const client = withSchema(clientSchema).split(
      filterLocalSchema,
      LocalExecution,
      FetchLink,
    );

    const operation1 = client.execute({ query: `{ hello }` });
    const operation2 = client.execute({ query: `{ foo { bar }}` });

    // makes local query
    operation1.subscribe(data => {
      expect(data.result.data).toEqual({ hello: 'Hello world!' });
    });

    // sends query to the server
    operation2.subscribe(
      data => {
        expect(data.result.data).toEqual({ foo: { bar: true } });
      },
      null,
      () => complete(),
    );
  });
});

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
