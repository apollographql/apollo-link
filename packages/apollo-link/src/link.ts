import Observable from 'zen-observable-ts';
import { invariant, InvariantError } from 'ts-invariant';

import {
  GraphQLRequest,
  NextLink,
  Operation,
  RequestHandler,
  FetchResult,
} from './types';

import {
  validateOperation,
  isTerminating,
  LinkError,
  transformOperation,
  createOperation,
} from './linkUtils';

function passthrough(op, forward) {
  return forward ? forward(op) : Observable.of();
}

function toLink(handler: RequestHandler | ApolloLink) {
  return typeof handler === 'function' ? new ApolloLink(handler) : handler;
}

export function empty(): ApolloLink {
  return new ApolloLink(() => Observable.of());
}

export function from(links: ApolloLink[]): ApolloLink {
  if (links.length === 0) return empty();
  return links.map(toLink).reduce((x, y) => x.concat(y));
}

export function split(
  test: (op: Operation) => boolean,
  left: ApolloLink | RequestHandler,
  right?: ApolloLink | RequestHandler,
): ApolloLink {
  const leftLink = toLink(left);
  const rightLink = toLink(right || new ApolloLink(passthrough));

  if (isTerminating(leftLink) && isTerminating(rightLink)) {
    return new ApolloLink(operation => {
      return test(operation)
        ? leftLink.request(operation) || Observable.of()
        : rightLink.request(operation) || Observable.of();
    });
  } else {
    return new ApolloLink((operation, forward) => {
      return test(operation)
        ? leftLink.request(operation, forward) || Observable.of()
        : rightLink.request(operation, forward) || Observable.of();
    });
  }
}

// join two Links together
export const concat = (
  first: ApolloLink | RequestHandler,
  second: ApolloLink | RequestHandler,
) => {
  const firstLink = toLink(first);
  if (isTerminating(firstLink)) {
    invariant.warn(
      new LinkError(
        `You are calling concat on a terminating link, which will have no effect`,
        firstLink,
      ),
    );
    return firstLink;
  }
  const nextLink = toLink(second);

  if (isTerminating(nextLink)) {
    return new ApolloLink(
      operation =>
        firstLink.request(
          operation,
          op => nextLink.request(op) || Observable.of(),
        ) || Observable.of(),
    );
  } else {
    return new ApolloLink((operation, forward) => {
      return (
        firstLink.request(operation, op => {
          return nextLink.request(op, forward) || Observable.of();
        }) || Observable.of()
      );
    });
  }
};

export class ApolloLink {
  public static empty = empty;
  public static from = from;
  public static split = split;
  public static execute = execute;

  constructor(request?: RequestHandler) {
    if (request) this.request = request;
  }

  public split(
    test: (op: Operation) => boolean,
    left: ApolloLink | RequestHandler,
    right?: ApolloLink | RequestHandler,
  ): ApolloLink {
    return this.concat(split(test, left, right || new ApolloLink(passthrough)));
  }

  public concat(next: ApolloLink | RequestHandler): ApolloLink {
    return concat(this, next);
  }

  public request(
    operation: Operation,
    forward?: NextLink,
  ): Observable<FetchResult> | null {
    throw new InvariantError('request is not implemented');
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
