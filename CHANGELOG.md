**Note:** This is a cumulative changelog that outlines all of the Apollo Link project child package changes that were bundled into a release on a specific day.

## 2018-12-13

### apollo-link 1.2.5

- Expose generics from graphql `ExecutionResult` on `FetchResult`.  <br/>
  [@rosskevin](https://github.com/rosskevin) in [#804](https://github.com/apollographql/apollo-link/pull/804)

### apollo-link-batch 1.1.6

- Move the setting of the raw response in the `context` to
  `apollo-link-batch-http`.  <br/>
  [@03eltond](https://github.com/03eltond) in [#814](https://github.com/apollographql/apollo-link/pull/814)

### apollo-link-batch-http 1.2.5

- Make the raw response available in the `context`.  <br/>
  [@03eltond](https://github.com/03eltond) in [#814](https://github.com/apollographql/apollo-link/pull/814)

### apollo-link-error 1.1.3

- Changed `networkError` type to union type
  `Error | ServerError | ServerParseError`.  <br/>
  [@ikhoon](https://github.com/ikhoon) in [#530](https://github.com/apollographql/apollo-link/pull/530)

### apollo-link-http-common 0.2.7

- Set an error `name` on errors being thrown.  <br/>
  [@ikhoon](https://github.com/ikhoon) in [#530](https://github.com/apollographql/apollo-link/pull/530)

### Docs

- Replace deprecated `Retry` link references with `RetryLink`.  <br/>
  [@fredericgermain](https://github.com/fredericgermain) in [#555](https://github.com/apollographql/apollo-link/pull/555)
