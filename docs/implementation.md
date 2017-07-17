## Implementing Links

Before implementing your own Link, be sure to read the [usage](usage.md) document.

Links implement a `request` method that takes an operation and returns the results in an Observable.
The apollo-link's `Observable` follows the ECMAScript [proposal](https://github.com/tc39/proposal-observable#api) with some extensions provided by [zen-observable](https://github.com/zenparsing/zen-observable#api).

### Creating a Simple Http Link

All links extend the base class, `ApolloLink`, which contains the methods for composition as well as the signature of request.
The most basic link is a stand-alone Http Link, which implements the `request` method.

```js
class HttpLink extends ApolloLink {

  constructor(uri){
    super();
    this.uri = uri;
  }

  public request(operation) {
    return new Observable(observer => {
      fetch(uri).then(data => {
        observer.next(data);
        observer.complete();
      }).catch(observer.error);
    });
  }
}
```

<p align="center">
  <br>
  <img src="images/apollo-link.png" alt="Apollo Link"/>
</p>

### Creating a Basic Logging Link

This link will log all incoming operations and outgoing results of the `HttpLink`.

```js
Link.from([
  new LoggingLink(),
  new HttpLink(uri);
])
```

<p align="center">
  <br>
  <img src="images/logging-stack.png" alt="Polling Link"/>
</p>

To create the `LoggingLink`, we need a way of connecting the next Link.
The Link's `request` method takes an additional parameter, `forward` that passes an operation to the next Link and returns the resulting Observable.
`LoggingLink` calls `forward` after printing the operation, then prints the results with the resulting observable.

```js
class LoggingLink extends ApolloLink {

  public request(operation: Operation, forward: NextLink): Observable<FetchResult> {
    console.log(`Operation: ${operation}`);

    const observableResults = forward(operation);

    return observableResults.map((result) => {
      console.log(`New result: ${result} for ${operation.operationName}`);
      return result;
    });
  }
}
```

By using `forward`, `LoggingLink` does not depend on the implementation of the next Link, so can be used with any `ApolloLink`, including `HttpLink`.

**Caution**: when a Link's request function includes `forward`, all the methods of composition expect that the Link will forward the operation.

## Methods of Composition

### Terminating Links

Composing Links distinguishes between Links as terminating or non-terminating.
A Link is terminating if it does not include `forward` in its signature.
Each way of connecting Links checks if the current link is non-terminating, then adds the next link.
Otherwise, the composing function will warn the user.
This distinction and check is designed to ensure that users who import a Link will not be surprised if an operation is not forwarded.

```js
request() //terminating
request(operation) //terminating
request(operation, forward) //non-terminating
```

### Single Path - from and concat

`from` is a static method of `ApolloLink` that connects links from an array.

```js
ApolloLink.from([
  first,
  second,
  third,
]);
```

Since all Links extend the abstract class `ApolloLink`, every link contains a `concat` method.

```js
first.concat(second).concat(third);
```

`from` and `concat` can be chained in any order:

```js
ApolloLink.from([first])
  .concat(second)
  .concat(ApolloLink.from([third, fourth]))
  .concat(fifth);
```

`from` and `concat` will warn the user when attempting to add a Link after a terminating Link.

### Split Points

Links may have may have split points.
`ApolloLink` contains `split` as a static and instance function.
A boolean calculated using the operation determines the direction of the split point.

<p align="center">
  <br>
  <img src="images/split-link.png" alt="Split Link"/>
</p>

The default `right` argument is a passthrough link that will call `forward(operation)` and return an empty Observable otherwise.
A `split` can become a filter by setting `right` to `ApolloLink.empty()`.

```js
ApolloLink.split(
  test: (Operation) => boolean,
  left,
  right? = ApolloLink.passthrough(),
);
```

`split` will warn the user when attempting to add a Link after two terminating Links.

### Links as Functions

When using `from`, `concat`, or `split`, a Link can be made into a function if a stateless Link is possible.
For example,

```js
ApolloLink.from([
  (operation, forward) => forward(operation) //passthrough
  new LoggingLink,
  (operation) => Observable.of({data: 1})
])

## API

The ApolloLink contains a single abstract method, `request`, other composing functions.

```js
abstract class ApolloLink {
  static split: (test: (Operation) => boolean, left: ApolloLink, right: ApolloLink) => ApolloLink
  static from: (links: ApolloLink[]) => ApolloLink
  static empty: () => ApolloLink

  split: (test: (Operation) => boolean, left: ApolloLink, right: ApolloLink) => ApolloLink
  concat: (next: ApolloLink) => ApolloLink

  abstract request: (operation: Operation, forward?: NextLink) => Observable<FetchResult>
}

NextLink = (operation: Operation) => Observable<FetchResult>
```

An `Operation` contains the GraphQL AST and other standard parameters for a GraphQL query:

```js
Operation {
  query?: DocumentNode,
  operationName?: string,
  variables?: object,
  context?: object,
}
```

`FetchResult` is passed to the `next` callback of the `Observable`

```js
FetchResult {
  data?: object,
  errors?: object[],
  extensions?: any,
  context?:object,
}
```

