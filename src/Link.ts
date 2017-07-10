// XXX zen is a great observable library and is pretty small
// I think RxJS (and even RxJSLite) may be overkill
// should we write our own so Link has no direct deps (at this point)?
// it doesn't seem necessary and even may be a distraction
import * as Observable from 'zen-observable';

// server result of Operation
import { ExecutionResult } from 'graphql';

// result of the Observable
// extensions are part of a future expansion to the
// ExecutionResult spec proposed by the Apollo team
// context is from the OperationRequest to allow for a ton
// of interesting things including performance monitoring
export interface LinkResult extends ExecutionResult {
  // this could be typed with generics and added to
  // by links in the exection chain
  context?: object;
  // once the spec formalizes, we should type this better
  extensions?: any;
}

// requirements to make a request
// OperationRequest is immutable, but links can modify the context
// using .map which returns a copy of the original OperationRequest.
// XXX should we determine operationName at request time?
// or should it be provided?
// XXX using generics, we should allow for typing the context (and variables?)
// export interface OperationRequest<V, C> {
export interface OperationRequest {
  query: string;
  variables?: { [key: string]: any };
  // operationName?: string
  context?: any;
}

// the actual meat of a Link, the Linker is a function that, when
// given an OperationRequest (and optionally a previous link), it
// will return an Observable which will eventually notify subscribers
// of either a LinkResult or nothing
// The `prev` arugment allows for dynamically building chains of complex
// operations flows. Instead of passing a `next` function, or the full
// Observable, we pass the Link interface so other links can perform
// functions on the OperationRequest and Link itself. For instance,
// a Link could add a time marker prior to request using `.map`, and
// then, given the `.request` function, it could read that timer and
// perform a side effect logging on an internal subscription while passing
// the original Link down to the next chain. I think this could lead
// to a ton of interesting use cases without a heavy API (excite)
export type Linker = (
  request: OperationRequest,
  prev?: Link,
) => Observable<LinkResult | void>;

// XXX write now the "default" state of observables aren't consistent
// with this project. Observable.of(undefined) will fire `next` with
// no value. Observable.of() won't fire next. I'm not sure which to
// go with or if it is even okay to use both (different use case?)
// for the defaultLinker it makes sense to fire `next` to keep
// the chain going, for the end of a filter it makes sense to me
// to not fire a next event at all. Thoughts?

export const defaultLinker = (operation, prev) => {
  // if starting with empty, just return an Observable
  // by returning undefined, this will call `next` on any
  // subscribers
  if (!prev) return Observable.of(undefined);
  // otherwise just pass along the prev link
  return prev.request(operation);
};

export default class Link {
  // storage for Linker
  value: Linker;

  // static so you can create chains without an initial link
  // takes an array of Links (not Linkers) which will be joined
  // into a single execution chain
  static from(links: Link[]) {
    return new Link(operation => {
      return links
        .reduce(
          // concat the links to form the chain of execution
          (x, y) => x.concat(y),
          // starting with an empty link allows for
          // links to always assume a prior observable result
          this instanceof Link ? this : Link.empty(),
        )
        .request(operation);
    });
  }

  // XXX improve empty definition
  // static empty is a base interface that never fires
  // any events. It is used as a starting observalbe
  // for other links to build off of. I *should* also
  // be improved to represent a true empty state
  // instead of `undefied`, it should be an Observable<LinkResult>
  // with an empty result status
  // Right now the undefined is a quick approximation of this
  // and should serve until more complex chains are thought out
  static empty() {
    return new Link(defaultLinker);
  }

  // just a storage constructor here, XXX it may be worth allowing
  // an extending class a way to overwrite this function
  // after instantiation. See the Retry Class as an example
  // class extension that uses what could be a protected
  // `value`.
  constructor(f: Linker = defaultLinker) {
    this.value = f;
  }

  // map allows for changing hte shape of an OperationRequest
  // during link execution. map should be a pure function
  // (not create any side effects). This also prevents mutation
  // of the OperationRequest by copying it
  // XXX write test to ensure immutability
  map(f: (x: OperationRequest) => OperationRequest) {
    return new Link(operation => this.request(f({ ...operation })));
  }

  // join two Links together
  concat(f: Link) {
    return new Link(operation => {
      // `this` refers to the Link on which .concat was called
      // it acts as the previous link in the chain
      return f.request(operation, this);
    });
  }

  // filter is a really powerful way to manage control flow
  // given a test function, it allows for links to dead end
  // if a criteria isn't met. Possible use cases include
  // sending mutations and queries to different endpoints,
  // using one execution chain for web sockets (subscriptions)
  // and another for standard operations (queries and mutations)
  filter(test: (x: OperationRequest) => boolean) {
    return new Link(operation => {
      // XXX should this use Link.empty()
      // Link.empty currently fires the `next` function, should the
      // end of a chain do the same?
      return test(operation) ? this.request(operation) : Observable.of();
      // : Link.empty().request(operation);
    });
  }

  // split allows for creating a split point in an execution chain
  // like filter, it can be used to direct operations based
  // on request information. Instead of dead ending an execution,
  // split allows for new chains to be formed.
  // XXX should there be a `join` method that returns to chains
  // back together?
  // XXX should filter use this under the hood?
  split(
    test: (x: OperationRequest) => boolean,
    left: Link,
    // right path is optional
    right: Link = Link.empty(),
  ) {
    return new Link(operation => {
      const path = test(operation) ? this.concat(left) : this.concat(right);
      return path.request(operation);
    });
  }

  // request is where an operation actually starts an execution chain
  // given an OperationRequest, it returns an Observable<LinkResult | void>
  // prior to this point, all Link chains are in a to be executed state
  // request can be called over and over for a given chain as it does not
  // modify anything on the chain
  // XXX improved type definitions using generics can help to shape
  // the above functions with more information about OperationRequest,
  // this will be particularly useful for the context key of OperationRequest
  request(
    operation: OperationRequest,
    prev?: Link,
  ): Observable<LinkResult | void> {
    return this.value(
      {
        // ensure immutability
        // XXX test this assumption
        ...operation,
        // add a default context onto the operation since it is
        // not a standard request key
        context: operation.context ? operation.context : {},
      },
      prev,
      // since context survives to the Observable result, we map over the
      // Observable and apply the context from this closure
      // XXX should this be immutable? Is it helpful / required?
    ).map((result: void | LinkResult) => {
      if (!result) return;
      return {
        ...result,
        // since request is called throughout the chain,
        // if the result already has a context key, we know the initial
        // context was applied at the top of the chain, so instead
        // we pass down the resutling context. Immuability may be
        // important here so multiple subscriptions don't collide
        // with each others context?
        context: result.context ? result.context : operation.context || {},
      };
    });
  }
}
