# Change log

----

**NOTE:** This changelog is no longer maintained. Changes are now tracked in
the top level [`CHANGELOG.md`](https://github.com/apollographql/apollo-link/blob/master/CHANGELOG.md).

----

### 2.2.6

- No changes

### 2.2.5
- Added `graphql` 14 to peer and dev deps; Updated `@types/graphql` to 14  <br/>
  [@hwillson](http://github.com/hwillson) in [#789](https://github.com/apollographql/apollo-link/pull/789)

### 2.2.4
- Minor documentation fixes

### 2.2.3
- Update apollo-link [#559](https://github.com/apollographql/apollo-link/pull/559)

### 2.2.2
- Fix a bug where `observer` is null during onComplete, onNext, onError [#528](https://github.com/apollographql/apollo-link/pull/528)

### 2.2.0
- handle Promises from `retryIf` and `attempts` [#436](https://github.com/apollographql/apollo-link/pull/436)
- udate apollo link with zen-observable-ts [PR#515](https://github.com/apollographql/apollo-link/pull/515)

### 2.1.0
- add `retryIf` [PR#324](https://github.com/apollographql/apollo-link/pull/324)

### 2.0.2
- ApolloLink upgrade

### 2.0.1
- ApolloLink upgrade

### 2.0.0
- Entirely rewritten to address a number of flaws including a new API to prevent DOSing your own server when it may be down. Thanks @nevir for the amazing work!

### 1.0.2
- changed peer-dependency of apollo-link to actual dependency

### 1.0.1
- moved to better rollup build

### 1.0.0
- moved from default export to named to be consistent with rest of link ecosystem
