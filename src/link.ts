import {
  ExternalOperation,
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
      .map(link => typeof link === 'function' ? new FunctionLink(link) : link)
      .reduce((x, y) => x.concat(y));
  }

  //Construct pass through
  public static empty() {
    return new FunctionLink((op, forward) => Observable.of());
  }

  // join two Links together
  public concat(link: ApolloLink | RequestHandler): ApolloLink {
    if (typeof link === 'function' ) {
      link = new FunctionLink(link);
    }
    return new ConcatLink(this, link);
  }

  // split allows for creating a split point in an execution chain
  // like filter, it can be used to direct operations based
  // on request information. Instead of dead ending an execution,
  // split allows for new chains to be formed.
  public split(
    test: (op: Operation) => boolean,
    left: ApolloLink | RequestHandler,
    right: ApolloLink | RequestHandler = ApolloLink.empty(),
  ): Chain {

    if (typeof left === 'function') {
      left = new FunctionLink(left);
    }
    if (typeof right === 'function') {
      right = new FunctionLink(right);
    }
    return this.concat(new SplitLink(test, left, right)) as Chain;
  }

  public abstract request(operation: Operation, forward?: NextLink): Observable<FetchResult> | null;
}

export function execute(link: ApolloLink, operation: ExternalOperation): Observable<FetchResult> {
  validateOperation(operation);

  if (operation.context === undefined) {
    operation.context = {};
  }
  if (operation.variables === undefined) {
    operation.variables = {};
  }
  const _operation = transformOperation(operation);

  return link.request(_operation) || Observable.of();
}

export function split(
    test: (op: Operation) => boolean,
    left: ApolloLink | RequestHandler,
    right: ApolloLink | RequestHandler = ApolloLink.empty(),
  ): Chain {

    if (typeof left === 'function') {
      left = new FunctionLink(left);
    }
    if (typeof right === 'function') {
      right = new FunctionLink(right);
    }
    return new SplitLink(test, left, right) as Chain;
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

export class FunctionLink extends ApolloLink {

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

  public request(operation: Operation, forward?: NextLink): Observable<FetchResult> {
    return this.test(operation) ?
      this.left.request(operation, forward) :
      this.right.request(operation)
      || Observable.of();
  }

}
