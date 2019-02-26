**Note:** This is a cumulative changelog that outlines all of the Apollo Link project child package changes that were bundled into a release on a specific day.

## vNext

### General

- Remove the docs CI step. <br/>
  [@JoviDeCroock](https://github.com/JoviDeCroock) in [#938](https://github.com/apollographql/apollo-link/pull/938)

### docs

- Documentation updates.  <br/>
  [@tomazy](https://github.com/tomazy) in [#933](https://github.com/apollographql/apollo-link/pull/933)  <br />
  [@hobochild](https://github.com/hobochild) in [#935](https://github.com/apollographql/apollo-link/pull/935)  <br />
  [@bkoltai](https://github.com/bkoltai) in [#925](https://github.com/apollographql/apollo-link/pull/925)  <br />
  [@NickTomlin](https://github.com/NickTomlin) in [#923](https://github.com/apollographql/apollo-link/pull/923)  <br />
  [@thekogmo](https://github.com/thekogmo) in [#913](https://github.com/apollographql/apollo-link/pull/913)  <br />
  [@thekogmo](https://github.com/thekogmo) in [#912](https://github.com/apollographql/apollo-link/pull/912)  <br />
  [@ciwchris](https://github.com/ciwchris) in [#652](https://github.com/apollographql/apollo-link/pull/652)  <br />
  [@jasonmerino](https://github.com/jasonmerino) in [#759](https://github.com/apollographql/apollo-link/pull/759)  <br />
  [@JoviDeCroock](https://github.com/JoviDeCroock) in [#942](https://github.com/apollographql/apollo-link/pull/942)  <br />
  [@goofiw](https://github.com/goofiw) in [#899](https://github.com/apollographql/apollo-link/pull/899)

### apollo-link

- Documentation updates.  <br/>
  [@capaj](https://github.com/capaj) in [#937](https://github.com/apollographql/apollo-link/pull/937)  <br />

### apollo-link-error

- Add undefined check. <br/>
  [@JoviDeCroock](https://github.com/JoviDeCroock) in [#943](https://github.com/apollographql/apollo-link/pull/943)  <br />

### apollo-link-batch-http

- Include client-awareness headers. <br/>
  [@jovidecroock](https://github.com/jovidecroock) in [#950](https://github.com/apollographql/apollo-link/pull/950)  <br />

### apollo-link-http

- Correct code comment. <br/>
  [@mouafa](https://github.com/mouafa) in [#921](https://github.com/apollographql/apollo-link/pull/921)  <br />

### apollo-link-error

- Correct code comment. <br/>
  [@JoviDeCroock](https://github.com/JoviDeCroock) in [#944](https://github.com/apollographql/apollo-link/pull/944)  <br />

## 2019-02-01

### General

- Numerous CI updates/enhancements.  <br/>
  [@JoviDeCroock](https://github.com/JoviDeCroock) in [#919](https://github.com/apollographql/apollo-link/pull/919)
- Updates to the Apollo Link package bundling process, to generate valid
  ESM/UMD bundles.  <br/>
  [@JoviDeCroock](https://github.com/JoviDeCroock) in [#918](https://github.com/apollographql/apollo-link/pull/918)

### apollo-link 1.2.8

- Remove dependency on `apollo-utilities`.  <br/>
  [@hwillson](https://github.com/hwillson) in [#926](https://github.com/apollographql/apollo-link/pull/926)

## 2018-12-14

### apollo-link-error 1.1.5

- [#530](https://github.com/apollographql/apollo-link/pull/530) added
  `apollo-link-http-common` as a dev dependency, when it should have been
  added as a normal dependency (since it's referenced by the production
  version of `apollo-link-error`). `apollo-link-http-common` has been switched
  around to be a production dependency.  <br/>
  [@hwillson](https://github.com/hwillson) in [#891](https://github.com/apollographql/apollo-link/pull/891)

### General

- Adjusted `.npmignore` settings to make sure all non essential files are
  excluded when published, for all child packages.  <br />
  [@hwillson](https://github.com/hwillson) in [#890](https://github.com/apollographql/apollo-link/pull/890)

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
