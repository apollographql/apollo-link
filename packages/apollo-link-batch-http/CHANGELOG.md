# Change log

----

**NOTE:** This changelog is no longer maintained. Changes are now tracked in
the top level [`CHANGELOG.md`](https://github.com/apollographql/apollo-link/blob/master/CHANGELOG.md).

----

### 1.2.4

- No changes

### 1.2.3
- Added `graphql` 14 to peer and dev deps; Updated `@types/graphql` to 14  <br/>
  [@hwillson](http://github.com/hwillson) in [#789](https://github.com/apollographql/apollo-link/pull/789)

### 1.2.2
- Update apollo-link [#559](https://github.com/apollographql/apollo-link/pull/559)
- Check for signal already present on `fetchOptions` [#584](https://github.com/apollographql/apollo-link/pull/584)

### 1.2.1
- Fix typing of Operation parameters [PR#525](https://github.com/apollographql/apollo-link/pull/525)

### 1.2.0
- support passing data and errors back as data to next link

### 1.1.1
- update apollo link with zen-observable-ts [PR#515](https://github.com/apollographql/apollo-link/pull/515)

### 1.1.0
- share logic with apollo-link-http through apollo-link-http-core [PR#364](https://github.com/apollographql/apollo-link/pull/364)
- remove apollo-fetch [PR#364](https://github.com/apollographql/apollo-link/pull/364)
- GET is no longer supported for batching (it never worked anyway) [PR#490](https://github.com/apollographql/apollo-link/pull/490)

### 1.0.5
- ApolloLink upgrade

### 1.0.4

- Update to graphql@0.12

### 1.0.3
- export options as named interface [TypeScript]

### 1.0.2
- changed peer-dependency of apollo-link to actual dependency

### 1.0.1
- moved to better rollup build

### 1.0.0
- moved from default export to named to be consistent with rest of link ecosystem
