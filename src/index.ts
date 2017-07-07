import * as Observable from 'zen-observable';

import { ExecutionResult } from 'graphql';

export interface LinkResult extends ExecutionResult {
  context?: object;
  extensions?: any;
}

export interface OperationRequest {
  query: string;
  context?: any;
}

export type Linker = (
  request: OperationRequest,
  prev?: Link,
) => Observable<LinkResult | void>;

export default class Link {
  value: Linker;

  static from(links: Link[]) {
    return new Link(operation => {
      return links
        .reduce(
          (x, y) => x.concat(y),
          this instanceof Link ? this : Link.empty(),
        )
        .request(operation);
    });
  }

  static empty() {
    return new Link((operation, prev) => {
      // if starting with empty, just return an Observable
      if (!prev) return Observable.of();
      // otherwise just pass along the prev link
      return prev.request(operation);
    });
  }

  constructor(f) {
    if (!(this instanceof Link)) return new Link(f);
    this.value = f;
  }

  request(
    operation: OperationRequest,
    prev?: Link,
  ): Observable<LinkResult | void> {
    return this.value(
      {
        ...operation,
        context: operation.context ? operation.context : {},
      },
      prev,
    ).map((result: void | LinkResult) => {
      if (!result) return;
      return {
        ...result,
        context: result.context ? result.context : operation.context || {},
      };
    });
  }

  map(f: (x: OperationRequest) => OperationRequest) {
    return new Link(operation => this.request(f(operation)));
  }

  concat(f: Link) {
    return new Link(operation => {
      return f.request(operation, this);
    });
  }

  filter(test: (x: OperationRequest) => boolean) {
    return new Link(operation => {
      return test(operation) ? this.request(operation) : Observable.of();
    });
  }

  // create two links based on a bollean call
  split(
    test: (x: OperationRequest) => boolean,
    left: Link,
    right: Link = Link.empty(),
  ) {
    return new Link(operation => {
      const path = test(operation) ? this.concat(left) : this.concat(right);
      return path.request(operation);
    });
  }
}
