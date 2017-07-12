import {
  ExternalOperation,
  NextLink,
  Operation,
  FetchResult,
  LinkFunction,
} from './types';

import {
  validateOperation,
} from './linkUtils';

import {
  parse,
} from 'graphql/language/parser';

import FunctionLink from './functionLink';

import * as Observable from 'zen-observable';

export interface Chain {
  request(operation: Operation, forward: NextLink);
  execute(operation: ExternalOperation): FetchResult;
}

export abstract class ApolloLink implements Chain {

  private next: ApolloLink;

  public static from(links: ApolloLink[]) {
    return links
      .reduce(
      (x, y) => x.concat(y),
      this instanceof ApolloLink ? this : ApolloLink.empty(),
    );
  }

  //Construct pass through
  public static empty() {
    return new FunctionLink((op, forward) => Observable.of());
  }

  // join two Links together
  public concat(link: ApolloLink | LinkFunction) {

    if (typeof link === 'function' ) {
      return new ConcatLink(this, new FunctionLink(link));
    } else {
      return new ConcatLink(this, link);
    }

    // if (this.next) {
    //   this.next.concat(link);
    //   return this;
    // }

    // if (typeof link === 'function' ) {
    //   this.next = new FunctionLink(link);
    // } else {
    //   this.next = link;
    // }

    // return this;
  }

  // XXX should there be a `join` method that returns to chains
  // back together?
  // Answer: just concat the same Link to the end of each chain

  // split allows for creating a split point in an execution chain
  // like filter, it can be used to direct operations based
  // on request information. Instead of dead ending an execution,
  // split allows for new chains to be formed.
  public split(
    test: (op: Operation) => boolean,
    left: ApolloLink | LinkFunction,
    // right path is optional
    right: ApolloLink | LinkFunction = ApolloLink.empty(),
  ): Chain {

    if (typeof left === 'function') {
      left = new FunctionLink(left);
    }
    if (typeof right === 'function') {
      right = new FunctionLink(right);
    }
    return this.concat(new SplitLink(test, left, right));

    // if (this.next) {
    //   this.next.split(test, left, right);
    // } else {
    //   this.next = new FunctionLink((operation) => {
    //     const next = test(operation) ? <ApolloLink>left : <ApolloLink>right;

    //     const forward = (op) => {
    //       const _forward = forward.bind(this.next);
    //       this.next.request(op, _forward);
    //     };
    //     return next.request(operation, forward.bind(next));
    //   });
    // }
    // return this as Chain;
  }

  public abstract request(operation: Operation, forward: NextLink);
}

export function execute(link: ApolloLink, operation: ExternalOperation) {
  validateOperation(operation);
  const _operation = transformOperation(operation);
  // const chainStart = this.buildLinkChain();
  // return chainStart(_operation);

  const forward = (op) => {
    const _forward = forward.bind(this.next);
    return this.next.request(op, _forward);
  };

  return this.request(_operation, forward);
}

const toPromise = (link) => {
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

export function asPromiseWrapper(link) {
  return {
    request: toPromise(link),
  };
}


function transformOperation(operation) {
  if (operation.query && typeof operation.query === 'string') {
    return {
      ...operation,
      query: parse(operation.query),
    };
  }

  return operation;
}
