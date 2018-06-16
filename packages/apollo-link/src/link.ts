import { Observable, of } from 'rxjs';

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

const passthrough = (op, forward) => (forward ? forward(op) : of());

const toLink = (handler: RequestHandler | ApolloLink) =>
  typeof handler === 'function' ? new ApolloLink(handler) : handler;

export const empty = (): ApolloLink => new ApolloLink((op, forward) => of());

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
        ? leftLink.request(operation) || of()
        : rightLink.request(operation) || of();
    });
  } else {
    return new ApolloLink((operation, forward) => {
      return test(operation)
        ? leftLink.request(operation, forward) || of()
        : rightLink.request(operation, forward) || of();
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
        firstLink.request(operation, op => nextLink.request(op) || of()) ||
        of(),
    );
  } else {
    return new ApolloLink((operation, forward) => {
      return (
        firstLink.request(operation, op => {
          return nextLink.request(op, forward) || of();
        }) || of()
      );
    });
  }
};

export class ApolloLink {
  public static empty = empty;
  public static from = from;
  public static split = split;

  constructor(request?: RequestHandler) {
    if (request) this.request = request;
  }

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
  ): Observable<FetchResult> | null {
    throw new Error('request is not implemented');
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
    ) || of()
  );
}
