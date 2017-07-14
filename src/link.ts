import {
  GraphQLRequest,
  NextLink,
  Operation,
  RequestHandler,
  FetchResult,
  Chain,
} from './types';

import {
  validateOperation,
} from './linkUtils';

import {
  parse,
} from 'graphql/language/parser';

import * as Observable from 'zen-observable';


export abstract class ApolloLink implements Chain {

  public static from(links: (ApolloLink | RequestHandler)[]) {
    if (links.length === 0) {
      return ApolloLink.empty();
    }

    return links
      .map(ApolloLink.toLink)
      .reduce((x, y) => x.concat(y));
  }

  public static empty(): ApolloLink {
    return new FunctionLink((op, forward) => Observable.of());
  }

  public static passthrough(): ApolloLink {
    return new FunctionLink((op, forward) => forward ? forward(op) : Observable.of());
  }

  // split allows for creating a split point in an execution chain
  // like filter, it can be used to direct operations based
  // on request information. Instead of dead ending an execution,
  // split allows for new chains to be formed.
  public static split(
    test: (op: Operation) => boolean,
    left: ApolloLink | RequestHandler,
    right: ApolloLink | RequestHandler = ApolloLink.passthrough(),
  ): ApolloLink {

    left = ApolloLink.toLink(left);
    right = ApolloLink.toLink(right);

    if (ApolloLink.isTerminating(left) && ApolloLink.isTerminating(right)) {
      return new TerminatedSplit(test, left, right);
    }

    return new SplitLink(test, left, right);
  }

  public static toLink(link: ApolloLink | RequestHandler): ApolloLink {
    if (typeof link === 'function') {
      return link.length === 1 ? new TerminatedLink(link) : new FunctionLink(link);
    } else {
      return link as ApolloLink;
    }
  }

  public static isTerminating(link: ApolloLink): boolean {
    return link.request.length === 1;
  }

  public split(
    test: (op: Operation) => boolean,
    left: ApolloLink | RequestHandler,
    right: ApolloLink | RequestHandler = ApolloLink.passthrough(),
  ): Chain {
    return this.concat(<ApolloLink>ApolloLink.split(test, left, right)) as Chain;
  }

  // join two Links together
  public concat(link: ApolloLink | RequestHandler): ApolloLink {
    if (this.request.length === 1) {
      const warning = Object.assign(
        new Error(`You are concating to a terminating link, which will have no effect`),
        { link : this },
      );
      console.warn(warning);
      return this;
    }
    link = ApolloLink.toLink(link);

    return link.request.length === 1 ? new TerminatedConcat(this, link) : new ConcatLink(this, link);
  }

  public abstract request(operation: Operation, forward?: NextLink): Observable<FetchResult> | null;
}

export function execute(link: ApolloLink, operation: GraphQLRequest): Observable<FetchResult> {
  validateOperation(operation);

  if (operation.context === undefined) {
    operation.context = {};
  }
  if (operation.variables === undefined) {
    operation.variables = {};
  }
  if (operation.query === undefined) {
    operation.query = `
      {
        __schema {
          types {
            name
          }
        }
      }
    `;
  }
  const _operation = transformOperation(operation);

  return link.request(_operation) || Observable.of();
}

const toPromise = (link: ApolloLink) => {
  return (operation: Operation, forward?: NextLink) => {
    const observable = link.request(operation, forward);

    return new Promise((resolve, reject) => {
      observable.subscribe({
        next: resolve,
        error: reject,
      });
    });
  };
};

export function asPromiseWrapper(link: ApolloLink | RequestHandler) {
  if (typeof link === 'function') {
    link = new FunctionLink(link);
  }
  return {
    request: toPromise(link),
  };
}

function transformOperation(operation) {
  if (typeof operation.query === 'string') {
    return {
      ...operation,
      query: parse(operation.query),
    };
  }

  return operation;
}

export class TerminatedLink extends ApolloLink {
  constructor(private f: RequestHandler) {
    super();
  }

  public request(operation: Operation): Observable<FetchResult> {
    return this.f(operation) || Observable.of();
  }
}

export class TerminatedConcat extends ApolloLink {
  private concatLink: ApolloLink;
  constructor(first: ApolloLink, second: ApolloLink) {
    super();
    this.concatLink = new ConcatLink(first, second);
  }

  public request(operation: Operation): Observable<FetchResult> {
    return this.concatLink.request(operation);
  }
}

export class TerminatedSplit extends ApolloLink {
  private splitLink: ApolloLink;

  constructor(
    test: (op: Operation) => boolean,
    left: ApolloLink,
    right: ApolloLink = ApolloLink.empty(),
  ) {
    super();
    this.splitLink = new SplitLink(test, left, right);
  }

  public request(operation: Operation): Observable<FetchResult> {
    return this.splitLink.request(operation);
  }
}

class FunctionLink extends ApolloLink {

  constructor(public f: RequestHandler) {
    super();
  }

  public request(operation: Operation, forward: NextLink): Observable<FetchResult> {
    return this.f(operation, forward) || Observable.of();
  }
}

class ConcatLink extends ApolloLink {

  constructor(private first: ApolloLink, private second: ApolloLink) {
    super();
  }

  public request(operation: Operation, forward: NextLink): Observable<FetchResult> {
    return this.first.request(operation, (op) => this.second.request(op, forward))
      || Observable.of();
  }
}

class SplitLink extends ApolloLink {

  constructor(
    private test: (op: Operation) => boolean,
    private left: ApolloLink,
    private right: ApolloLink = ApolloLink.empty(),
  ) {
    super();
  }

  public request(operation: Operation, forward: NextLink): Observable<FetchResult> {
    return this.test(operation) ?
      this.left.request(operation, forward) :
      this.right.request(operation, forward)
      || Observable.of();
  }
}
