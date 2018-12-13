**Note:** This is a cumulative changelog that outlines all of the Apollo Link project child package changes that were bundled into a release on a specific day.

## YYYY-MM-DD

### apollo-link-batch

- Move the setting of the raw response in the `context` to 
  `apollo-link-batch-http`.  <br/>
  [@03eltond](https://github.com/03eltond) in [#814](https://github.com/apollographql/apollo-link/pull/814)

### apollo-link-batch-http

- Make the raw response available in the `context`.  <br/>
  [@03eltond](https://github.com/03eltond) in [#814](https://github.com/apollographql/apollo-link/pull/814)

### apollo-link-error

- Changed `networkError` type to union type
  `Error | ServerError | ServerParseError`.  <br/>
  [@ikhoon](https://github.com/ikhoon) in [#530](https://github.com/apollographql/apollo-link/pull/530)

### apollo-link-http-common

- Set an error `name` on errors being thrown.  <br/>
  [@ikhoon](https://github.com/ikhoon) in [#530](https://github.com/apollographql/apollo-link/pull/530)

### Docs

- Replace deprecated `Retry` link references with `RetryLink`.  <br/>
  [@fredericgermain](https://github.com/fredericgermain) in [#555](https://github.com/apollographql/apollo-link/pull/555)
