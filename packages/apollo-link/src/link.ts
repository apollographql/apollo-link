import * as Observable from 'zen-observable';

import {
  GraphQLRequest,
  NextLink,
  Operation,
  RequestHandler,
  FetchResult,
  DevToolsHook,
} from './types';

import {
  validateOperation,
  isTerminating,
  LinkError,
  transformOperation,
  createOperation,
} from './linkUtils';

const passthrough = (op, forward) => (forward ? forward(op) : Observable.of());

const toLink = (handler: RequestHandler | ApolloLink) =>
  typeof handler === 'function' ? new ApolloLink(handler) : handler;

export const empty = (): ApolloLink =>
  new ApolloLink((op, forward) => Observable.of());

export const from = (links: ApolloLink[]): ApolloLink => {
  if (links.length === 0) return empty();

  return links.map(toLink).reduce((x, y) => x.concat(y));
};

export const split = (
  test: (op: Operation) => boolean,
  left: ApolloLink | RequestHandler,
  right: ApolloLink | RequestHandler = new ApolloLink(passthrough),
): ApolloLink => {
  const leftLink = toLink(left);
  const rightLink = toLink(right);

  if (isTerminating(leftLink) && isTerminating(rightLink)) {
    return new ApolloLink(operation => {
      return test(operation)
        ? leftLink.execute(operation) || Observable.of()
        : rightLink.execute(operation) || Observable.of();
    });
  } else {
    return new ApolloLink((operation, forward) => {
      return test(operation)
        ? leftLink.execute(operation, forward) || Observable.of()
        : rightLink.execute(operation, forward) || Observable.of();
    });
  }
};

// join two Links together
export const concat = (
  first: ApolloLink | RequestHandler,
  second: ApolloLink | RequestHandler,
) => {
  const firstLink = toLink(first);
  if (isTerminating(firstLink)) {
    console.warn(
      new LinkError(
        `You are calling concat on a terminating link, which will have no effect.
        Learn more about terminating links in the Apollo Link docs:
          https://www.apollographql.com/docs/link/overview.html#terminating`,
        firstLink,
      ),
    );
    return firstLink;
  }
  const nextLink = toLink(second);

  if (isTerminating(nextLink)) {
    return new ApolloLink(
      operation =>
        firstLink.execute(
          operation,
          op => nextLink.execute(op) || Observable.of(),
        ) || Observable.of(),
    );
  } else {
    return new ApolloLink((operation, forward) => {
      return (
        firstLink.execute(operation, op => {
          return nextLink.execute(op, forward) || Observable.of();
        }) || Observable.of()
      );
    });
  }
};

export class ApolloLink {
  private devToolsHook: DevToolsHook;
  constructor(request?: RequestHandler) {
    if (request) {
      this.request = request;
      // if (request() === null) {
      //   throw new Error(`
      //     Your request handler must return an Observable.
      //     Visit the Apollo Link docs to learn more about request handlers:
      //       https://www.apollographql.com/docs/link/overview.html#request
      //   `);
      // }
    }
  }

  public static empty = empty;
  public static from = from;
  public static split = split;

  public split(
    test: (op: Operation) => boolean,
    left: ApolloLink | RequestHandler,
    right: ApolloLink | RequestHandler = new ApolloLink(passthrough),
  ): ApolloLink {
    return this.concat(split(test, left, right));
  }

  public concat(next: ApolloLink | RequestHandler): ApolloLink {
    return concat(this, next);
  }

  public request(
    operation: Operation,
    forward?: NextLink,
  ): Observable<FetchResult> {
    throw new Error('request is not implemented');
  }

  private notifyDevTools(operation: Operation, result: FetchResult): void {
    if (this.devToolsHook) {
      this.devToolsHook({
        network: {
          operation,
          result,
        },
      });
    }
  }

  public connectToDevTools(hook: DevToolsHook): void {
    if (!this.devToolsHook) {
      this.devToolsHook = hook;
    }
  }

  public execute(
    operation: Operation,
    forward?: NextLink,
  ): Observable<FetchResult> {
    return this.request(operation, forward).map(result => {
      setTimeout(() => {
        this.notifyDevTools(operation, result);
      }, 0);

      return result;
    });
  }
}

export function execute(
  link: ApolloLink,
  operation: GraphQLRequest,
): Observable<FetchResult> {
  return (
    link.request(
      createOperation(
        operation.context,
        transformOperation(validateOperation(operation)),
      ),
    ) || Observable.of()
  );
}
